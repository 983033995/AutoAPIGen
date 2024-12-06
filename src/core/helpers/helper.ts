/*
 * @FilePath: /AutoAPIGen/src/core/helpers/helper.ts
 * @Description: 辅助函数
 */
/// <reference path="../../global.d.ts" />
import * as vscode from 'vscode'
import { pinyin } from "pinyin-pro"
const fs = require('fs-extra')
const path = require('path');

/**
 * 检查文件夹或文件是否存在
 *
 * @param fileName 文件名或路径
 * @param depth 搜索深度，默认为1
 * @returns 返回一个Promise，表示文件夹或文件是否存在
 */
export const checkFolderOrFileExists = async (fileName: string, depth: number = 1): Promise<boolean> => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        // 遍历所有工作区文件夹
        for (const folder of workspaceFolders) {
            const exists = await checkFolderOrFileExistsInFolder(folder.uri, fileName, depth);
            if (exists) {
                return true; // 如果文件存在，立即返回true
            }
        }
    }
    return false; // 如果没有找到文件，返回false
};

/**
 * 检查文件夹中是否存在指定文件或文件夹的子文件夹中存在该文件
 *
 * @param folderUri 文件夹的Uri
 * @param fileName 文件名
 * @param depth 搜索的最大深度，默认为0表示不限制深度
 * @returns 如果找到文件则返回true，否则返回false
 */
const checkFolderOrFileExistsInFolder = async (folderUri: vscode.Uri, fileName: string, depth: number): Promise<boolean> => {
    if (depth < 0) {
        return false; // 如果已经超过了最大深度，就返回false
    }

    const uri = vscode.Uri.joinPath(folderUri, fileName); // 使用Uri.joinPath来安全地拼接路径
    try {
        // 使用async/await来简化Promise处理
        await vscode.workspace.fs.stat(uri);
        return true; // 如果文件存在，立即返回true
    } catch (error) {
        // 忽略错误，继续检查下一个文件夹
    }

    // 获取这个文件夹下的所有子文件夹
    const children = await vscode.workspace.fs.readDirectory(folderUri);
    for (const [childName, fileType] of children) {
        if (fileType === vscode.FileType.Directory) {
            // 如果这是一个子文件夹，就在这个子文件夹中查找
            const childUri = vscode.Uri.joinPath(folderUri, childName);
            const exists = await checkFolderOrFileExistsInFolder(childUri, fileName, depth - 1);
            if (exists) {
                return true; // 如果在子文件夹中找到了文件，就返回true
            }
        }
    }

    return false; // 如果在所有子文件夹中都没有找到文件，就返回false
};

/**
 * 从指定的 URI 异步获取文本内容。
 *
 * @param uri 要读取文本内容的 URI 对象。
 * @returns 返回一个 Promise，解析后得到指定 URI 对应的文本内容。
 */
export const getText = async (uri: vscode.Uri): Promise<string> => {
    try {
        const content = await vscode.workspace.fs.readFile(uri);
        return Buffer.from(content).toString();
    } catch (error: any) {
        throw new Error(`Failed to read file at ${uri.fsPath}: ${error?.message || 'Unknown error'}`);
    }
}

/**
 * 获取指定Uri下的目录结构，支持配置向下查找的层级深度、排除特定文件夹和只查找文件夹。自动排除隐藏文件夹。
 * @param uri 目录的Uri
 * @param depth 向下查找的层级深度，-1表示不限制深度
 * @param exclude 排除的文件夹名称列表
 * @param foldersOnly 是否只需要查找文件夹
 * @returns 目录结构
 */
async function getDirectoryStructure(uri: vscode.Uri, depth: number = -1, exclude: string[] = [], foldersOnly: boolean = false, parentKey: string = ''): Promise<DirectoryItem[]> {
    if (depth === 0) {
        return []; // 如果深度为0，则不再向下查找
    }

    const items: DirectoryItem[] = [];
    try {
        const entries = await vscode.workspace.fs.readDirectory(uri);

        for (const [name, type] of entries) {
            // 自动排除隐藏文件夹（名称以点开头的文件夹）
            if (name.startsWith('.') || exclude.includes(name)) {
                continue; // 如果当前项是隐藏文件夹或在排除列表中，跳过
            }

            const key = `${parentKey}/${name}`; // 生成唯一的key

            if (type === vscode.FileType.Directory) {
                // 如果是文件夹，递归获取子目录结构
                const childUri = vscode.Uri.joinPath(uri, name);
                const children = await getDirectoryStructure(childUri, depth - 1, exclude, foldersOnly, key);
                const item: DirectoryItem = {
                    name,
                    type: 'directory',
                    key
                };
                if (children.length > 0) {
                    item.children = children; // 只有当有子项时，才添加children字段
                }
                items.push(item);
            } else if (type === vscode.FileType.File && !foldersOnly) {
                // 如果是文件，并且没有设置只查找文件夹，则添加到结果中
                items.push({
                    name,
                    type: 'file',
                    key
                });
            }
        }
    } catch (error) {
        console.error('Error reading directory:', error);
    }

    return items;
}

/**
 * 获取当前工作区的目录结构
 *
 * @param depth 遍历目录的深度，默认为5
 * @param exclude 需要排除的目录名数组，默认为['node_modules', 'dist']
 * @param foldersOnly 是否仅返回文件夹，默认为true
 * @returns 返回工作区的目录结构
 */
export const getCurrentWorkspaceStructure = async (depth: number = 5, exclude: string[] = ['node_modules', 'dist'], foldersOnly: boolean = true) => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        console.log('No workspace is open.');
        return;
    }

    // 假设我们只处理第一个工作区
    const workspaceUri = workspaceFolders[0].uri;
    const structure = await getDirectoryStructure(workspaceUri, depth, exclude, foldersOnly);
    return structure;
}

export const updateFileContent = async (filePath: string, data: object) => {
    console.log('----->updateFileContent', filePath, data);
    try {
        // 获取工作区的根路径
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace is open.');
            return;
        }
        const workspacePath = workspaceFolders[0].uri.fsPath;

        // 构造完整的文件路径
        const fullFilePath = path.join(workspacePath, filePath);

        // 检查文件夹是否存在，如果不存在则创建
        const dirName = path.dirname(fullFilePath);
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { recursive: true });
        }

        let fileData = {};

        // 检查文件是否存在，如果存在则读取内容
        if (fs.existsSync(fullFilePath)) {
            const fileContent = fs.readFileSync(fullFilePath, 'utf8');
            if (fileContent.trim() === '') {
                fileData = {}
            } else {
                try {
                    fileData = JSON.parse(fileContent); // 尝试解析JSON
                } catch (e) {
                    if (e instanceof SyntaxError && e.message.includes('Unexpected end of JSON input')) {
                        fileData = {}; // 如果解析失败且错误是“Unexpected end of JSON input”，则初始化一个空对象
                        console.warn(`File ${fullFilePath} contains invalid JSON. It will be treated as an empty object.`);
                    } else {
                        throw e; // 如果是其他类型的错误，则重新抛出异常
                    }
                }
            }
        }

        // 合并数据
        const updatedFileData = { ...fileData, ...data };

        // 写入更新后的数据到文件
        fs.writeFileSync(fullFilePath, JSON.stringify(updatedFileData, null, 4));

        vscode.window.showInformationMessage(`${filePath} 更新成功.`);
    } catch (error) {
        console.log('------>updateFileContent error', error)
    }
}

// 根据ID数组获取名称数组的函数
export const getNamesByIds = (tree: TreeNode, ids: number[]): string[] => {
    const names: string[] = []; // 存储找到的名称
    const idSet = new Set(ids); // 将ID数组转换为Set，便于快速查找

    // 递归函数，用于遍历树状结构
    function traverse(node: TreeNode): void {
        if (idSet.has(node.id)) {
            names.push(cnToPinyin(node.name)); // 如果当前节点的ID在ID数组中，添加名称到结果数组
        }
        if (node.children) {
            node.children.forEach(child => traverse(child)); // 递归遍历子节点
        }
    }

    traverse(tree); // 从根节点开始遍历
    return names; // 返回名称数组
}

/**
 * vscode.window.withProgress 的调用函数
 * @param options - 进度条配置选项
 * @param task - 执行的任务函数
 */
export async function withProgressWrapper(title: string, task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<void>) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: false,
    }, task);
}

/**
 * 在给定的树形结构中查找包含目标键值的子树路径
 *
 * @param tree ApiTreeListResData 类型的数组，表示树形结构
 * @param targetKey 目标键值
 * @returns 返回 ApiTreeListResData 类型的对象，表示找到的子树路径，若未找到则返回 null
 */
export function findSubtreePath(tree: ApiTreeListResData[], targetKey: string): ApiTreeListResData | null {
    function dfs(node: ApiTreeListResData): ApiTreeListResData | null {
        if (node.key === targetKey) {
            return { ...node };
        }

        for (const child of node.children) {
            const result = dfs(child);
            if (result) {
                return { ...node, children: [result] };
            }
        }

        return null;
    }

    for (const root of tree) {
        const result = dfs(root);
        if (result) {
            return result;
        }
    }

    return null;
}

/** 首字母大写 */
export const firstToLocaleUpperCase = (str: string | null | undefined) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

/** 中文转拼音 */
export const cnToPinyin = (cn: string) => {
    let pyArr = pinyin(cn, { toneType: 'none', type: 'array' });
    let isFirstOne = true;
    let pyArr2 = pyArr.map((item, index) => {
        if (isFirstOne) {
            isFirstOne = false;
            return item;
        }
        if (item === '/') {
            isFirstOne = true;
        }
        return firstToLocaleUpperCase(item);
    });
    const path = pyArr2.join('')
    .replace(/\s/g, '')
    .replace(/，/g, ',')
    .replace(/。/g, '.')
    .replace(/？/g, '?')
    .replace(/！/g, '!')
    .replace(/：/g, ':')
    .replace(/；/g, ';')
    .replace(/“/g, '"')
    .replace(/”/g, '"')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/……/g, '...')
    .replace(/《/g, '<')
    .replace(/》/g, '>')
    console.log('-------->path', path, pyArr2)
    return path;
};


/**
 * 获取API路径和详细信息
 *
 * @param tree API树形列表响应数据，可能为null
 * @param key 目标API的key
 * @param rootName 根节点名称
 * @returns 包含API路径和详细信息的数组
 */
export function getPathsAndApiDetails(tree: ApiTreeListResData | null, key: string, rootName: string): PathApiDetail[] {
    if (!tree) {
        return [];
    }

    const results: PathApiDetail[] = [];

    function dfs(node: ApiTreeListResData, currentPath: string[], keyArr: string[], targetKey: string): boolean {
        const nodeName = cnToPinyin(node.name);
        if (node.type === "apiDetailFolder") {
            currentPath.push(nodeName);
            keyArr.push(node.key);
        }

        if (node.key === targetKey) {
            if (node.type === "apiDetailFolder") {
                collectLastApiDetailsFolder(node, currentPath.slice(), keyArr.slice());
            } else if (node.type === "apiDetail" && node.api) {
                results.push({
                    pathArr: currentPath,
                    api: [node.api],
                    keyArr: keyArr,
                    path: currentPath.join('/')
                });
            }
            return true;
        }

        for (const child of node.children) {
            if (dfs(child, currentPath, keyArr, targetKey)) {
                return true;
            }
        }

        if (node.type === "apiDetailFolder") {
            currentPath.pop();
            keyArr.pop();
        }

        return false;
    }

    /**
     * 收集最后一个API详情文件夹中的所有API详情
     *
     * @param folderNode API树形列表响应数据中的文件夹节点
     * @param basePath 当前文件夹的路径数组
     * @param baseKeyArr 当前文件夹的key数组
     */
    function collectLastApiDetailsFolder(folderNode: ApiTreeListResData, basePath: string[], baseKeyArr: string[]) {
        const apis: apiDetailItem[] = [];

        function collectApis(node: ApiTreeListResData) {
            if (node.type === "apiDetail" && node.api) {
                apis.push(node.api);
            } else if (node.type === "apiDetailFolder") {
                node.children.forEach(collectApis);
            }
        }

        // 收集所有直接子节点中的 apiDetail
        folderNode.children.forEach(child => {
            if (child.type === "apiDetail" && child.api) {
                apis.push(child.api);
            } else if (child.type === "apiDetailFolder") {
                collectLastApiDetailsFolder(child, [...basePath, cnToPinyin(child.name)], [...baseKeyArr, child.key]);
            }
        });

        if (apis.length > 0) {
            results.push({
                pathArr: basePath,
                api: apis,
                keyArr: baseKeyArr,
                path: basePath.join('/')
            });
        }
    }

    dfs(tree, [rootName], [], key);
    return results;
}

/**
 * 将文件路径中的指定字符串替换为路径别名
 *
 * @param fileUrl 文件路径
 * @param target 包含两个字符串的数组，target[0] 为需要被替换的字符串，target[1] 为替换后的路径别名
 * @returns 替换后的文件路径
 */
export function replacePathAlias(fileUrl: string, target: string[]): string {
    // 查找 target[0] 在 fileUrl 中的位置
    let index = fileUrl.indexOf(target[0]);

    if (index!== -1) {
        // 将 target[0] 及其之前的路径替换为路径别名 target[1]
        fileUrl = target[1] + fileUrl.substring(index + target[0].length);
    }

    return fileUrl.replace(/\.[tj]s$/, '');
}

/**
 * 显示指定文件中的指定符号位置
 *
 * @param filePath 文件路径
 * @param symbolName 符号名称
 */
export async function revealSymbol(filePath: string, symbolName: string) {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
        vscode.window.showErrorMessage('方法还未生成，请先生成方法。');
        return;
    }

    // 打开文件
    const document = await vscode.workspace.openTextDocument(filePath);
    const text = document.getText();

    // 查找符号位置
    const regex = new RegExp(`\\b${symbolName}\\b`);
    const match = regex.exec(text);
    if (!match) {
        vscode.window.showErrorMessage('方法还未生成，请先生成方法。');
        return;
    }

    // 计算符号位置的行和列
    const positionOffset = match.index;
    const position = document.positionAt(positionOffset);

    // 显示文件并定位到符号位置
    const editor = await vscode.window.showTextDocument(document);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
}


/**
 * 自动在文件中插入导入语句
 *
 * @param variableName 要导入的变量名
 * @param filePath 导入文件的路径
 * @returns 异步函数，无返回值
 */
// export async function addImportSymbol(variableName: string, filePath: string) {
//     const editor = vscode.window.activeTextEditor;
//     if (!editor) {
//         vscode.window.showErrorMessage("请打开一个文件再执行该命令");
//         return;
//     }

//     const document = editor.document;
//     const fileType = document.languageId;
//     const text = document.getText();
//     const importPath = filePath.replace(/\\/g, '/'); // 使用统一的路径分隔符

//     // 构造基本导入语句
//     let importStatement = `import { ${variableName} } from '${importPath}';`;
    
//     // 匹配已有导入语句的正则（用于查找现有的导入路径）
//     const importRegex = new RegExp(`import\\s+\\{?\\s*([^\\}]+)\\s*\\}?\\s+from\\s+['"]${importPath}['"];?`, 'g');

//     const insertIntoScriptTag = async (scriptMatch: RegExpExecArray) => {
//         const scriptContent = scriptMatch[1];
//         const scriptStart = scriptMatch.index + scriptMatch[0].indexOf(scriptContent);

//         // 在 scriptContent 内部查找导入
//         const scriptImportRegex = new RegExp(`import\\s+\\{?\\s*([^\\}]+)\\s*\\}?\\s+from\\s+['"]${importPath}['"];?`, 'g');
//         const existingImportMatch = scriptImportRegex.exec(scriptContent);

//         if (existingImportMatch) {
//             const existingImports = existingImportMatch[1].split(',').map(v => v.trim());
//             if (!existingImports.includes(variableName)) {
//                 const newImport = `import { ${[...existingImports, variableName].join(', ')} } from '${importPath}';`;
//                 const importStart = scriptStart + existingImportMatch.index;
//                 const importEnd = importStart + existingImportMatch[0].length;

//                 await editor.edit(editBuilder => {
//                     editBuilder.replace(new vscode.Range(document.positionAt(importStart), document.positionAt(importEnd)), newImport);
//                 });
//             } else {
//                 vscode.window.showInformationMessage(`变量 ${variableName} 已存在于导入 ${importPath}`);
//             }
//         } else {
//             const insertPosition = document.positionAt(scriptStart);
//             await editor.edit(editBuilder => {
//                 editBuilder.insert(insertPosition, `\n${importStatement}`);
//             });
//         }
//     };

//     if (['vue', 'svelte'].includes(fileType)) {
//         const scriptTagRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
//         const scriptMatch = scriptTagRegex.exec(text);

//         if (scriptMatch) {
//             await insertIntoScriptTag(scriptMatch);
//         } else {
//             vscode.window.showErrorMessage("未找到 <script> 标签，无法插入导入语句");
//         }
//     } else if (['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(fileType)) {
//         const match = importRegex.exec(text);
//         if (match) {
//             const existingImports = match[1].split(',').map(v => v.trim());
//             if (!existingImports.includes(variableName)) {
//                 const newImport = `import { ${[...existingImports, variableName].join(', ')} } from '${importPath}';`;
//                 const startPos = document.positionAt(match.index);
//                 const endPos = document.positionAt(match.index + match[0].length);

//                 await editor.edit(editBuilder => {
//                     editBuilder.replace(new vscode.Range(startPos, endPos), newImport);
//                 });
//             } else {
//                 vscode.window.showInformationMessage(`变量 ${variableName} 已存在于导入 ${importPath}`);
//             }
//         } else {
//             await editor.edit(editBuilder => {
//                 editBuilder.insert(new vscode.Position(0, 0), importStatement + '\n');
//             });
//         }
//     } else {
//         vscode.window.showErrorMessage(`当前文件类型 ${fileType} 不支持自动导入`);
//     }
// }
/**
 * 自动在文件中插入导入语句
 *
 * @param variableName 要导入的变量名
 * @param filePath 导入文件的路径
 * @returns 异步函数，无返回值
 */
export async function addImportSymbol(variableName: string, filePath: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage("请打开一个文件再执行该命令");
        return;
    }

    const document = editor.document;
    const fileType = document.languageId;
    const text = document.getText();
    const importPath = filePath.replace(/\\/g, '/'); // 统一路径分隔符
    const importStatement = `import { ${variableName} } from '${importPath}';\n`;

    if (['vue', 'svelte'].includes(fileType)) {
        const scriptTagStart = text.indexOf('<script');
        const scriptTagEnd = text.indexOf('</script>');

        if (scriptTagStart === -1 || scriptTagEnd === -1) {
            vscode.window.showErrorMessage("未找到 <script> 标签，无法插入导入语句");
            return;
        }

        const scriptContentStart = text.indexOf('>', scriptTagStart) + 1; // <script> 内容的起始位置
        const scriptContent = text.slice(scriptContentStart, scriptTagEnd);

        const importLines = scriptContent
            .split('\n')
            .filter(line => line.trim().startsWith('import ')); // 找到所有导入语句

        const existingImport = importLines.find(line => line.includes(importPath));
        if (existingImport) {
            if (existingImport.includes(variableName)) {
                vscode.window.showInformationMessage(`变量 ${variableName} 已存在于导入 ${importPath}`);
                return;
            } else {
                const updatedImport = existingImport.replace(
                    '{',
                    `{ ${variableName},`
                );
                const updatedScriptContent = scriptContent.replace(existingImport, updatedImport);

                const newText = text.slice(0, scriptContentStart) + updatedScriptContent + text.slice(scriptTagEnd);
                await editor.edit(editBuilder => {
                    const fullRange = new vscode.Range(
                        new vscode.Position(0, 0),
                        document.lineAt(document.lineCount - 1).range.end
                    );
                    editBuilder.replace(fullRange, newText);
                });
            }
        } else {
            const firstImportIndex = scriptContent.split('\n').findIndex(line => line.trim().startsWith('import '));
            const insertPosition = firstImportIndex !== -1
                ? document.positionAt(scriptContentStart).translate(firstImportIndex, 0)
                : document.positionAt(scriptContentStart);

            const newText =
                text.slice(0, scriptContentStart) +
                `\n${importStatement}` +
                scriptContent +
                text.slice(scriptTagEnd);

            await editor.edit(editBuilder => {
                const fullRange = new vscode.Range(
                    new vscode.Position(0, 0),
                    document.lineAt(document.lineCount - 1).range.end
                );
                editBuilder.replace(fullRange, newText);
            });
        }
    } else if (['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(fileType)) {
        const lines = text.split('\n');
        const commentBlockEndIndex = lines.findIndex(line => !line.trim().startsWith('//') && !line.trim().startsWith('/*') && !line.trim().startsWith('*'));
        const insertIndex = commentBlockEndIndex === -1 ? 0 : commentBlockEndIndex;

        const existingImportLineIndex = lines.findIndex(line => line.includes(importPath));
        if (existingImportLineIndex !== -1) {
            const existingImportLine = lines[existingImportLineIndex];
            if (existingImportLine.includes(variableName)) {
                vscode.window.showInformationMessage(`变量 ${variableName} 已存在于导入 ${importPath}`);
                return;
            } else {
                lines[existingImportLineIndex] = existingImportLine.replace(
                    '{',
                    `{ ${variableName},`
                );
            }
        } else {
            lines.splice(insertIndex, 0, importStatement);
        }

        const updatedText = lines.join('\n');
        await editor.edit(editBuilder => {
            const fullRange = new vscode.Range(
                new vscode.Position(0, 0),
                document.lineAt(document.lineCount - 1).range.end
            );
            editBuilder.replace(fullRange, updatedText);
        });
    } else {
        vscode.window.showErrorMessage(`当前文件类型 ${fileType} 不支持自动导入`);
    }
}