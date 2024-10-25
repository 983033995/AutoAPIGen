/*
 * @FilePath: /AutoAPIGen/src/core/helpers/helper.ts
 * @Description: 辅助函数
 */
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

