import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as prettier from 'prettier';
// import { ESLint } from 'eslint';
import JSON5 from 'json5';

// 定义 TypeScript 相关规则的关键字，用于过滤规则
const typescriptRuleKeywords = [
    "typescript",
    "ts",
    "@typescript-eslint", // 常见的 TypeScript ESLint 插件前缀
];
// 获取工作区根目录
function getWorkspaceRoot(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length > 0 ? folders[0].uri.fsPath : null;
}

// ESLint 规则配置
const defaultEslintRules: { rules: { [key: string]: any } } = {
    rules: {
        "unused-imports/no-unused-imports": "off",
        "@typescript-eslint/consistent-type-imports": "off",
        "@typescript-eslint/no-unused-vars": "error",
        "import/no-mutable-exports": ["error"],
        "@typescript-eslint/indent": 0,
        "@typescript-eslint/no-var-requires": 0,
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/prefer-ts-expect-error": "off",
    }
}
// 查找 ESLint 配置文件并返回与 TypeScript 相关的规则配置
function getEslintRulesConfig(rootDir: string) {
    const eslintConfigPath = findConfigFile(['eslint.config.js', '.eslintrc', '.eslintrc.json'], rootDir);
    if (eslintConfigPath) {
        const configContent = fs.readFileSync(eslintConfigPath, 'utf-8');
        const config = JSON5.parse(configContent);

        const actualConfig = Array.isArray(config) ? config[0] : config;

        if (typeof actualConfig === 'object' && actualConfig !== null && 'rules' in actualConfig) {
            const tsRules = Object.keys(actualConfig.rules || {})
                .filter(rule => typescriptRuleKeywords.some(keyword => rule.includes(keyword)))
                .reduce((acc: { [key: string]: any }, rule) => {
                    acc[rule] = actualConfig.rules[rule];
                    return acc;
                }, {});
            return { rules: tsRules };
        }
    }
    // 如果没有找到配置文件，使用默认的 TypeScript 基本配置
    return defaultEslintRules;
}
// 查找配置文件
function findConfigFile(filenames: string[], dir: string): string | null {
    for (const filename of filenames) {
        const filePath = path.join(dir, filename);
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }
    const parentDir = path.dirname(dir);
    if (parentDir !== dir) {
        return findConfigFile(filenames, parentDir);
    }
    return null;
}
// 使用 Prettier 格式化代码
async function formatWithPrettier(text: string, defaultPetterSetting: Record<string, any>): Promise<string> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
        throw new Error("未找到工作区根目录");
    }

    const configPath = path.join(workspaceRoot, '.prettierrc');
    const options = fs.existsSync(configPath) ? await prettier.resolveConfig(configPath) : defaultPetterSetting;
    return prettier.format(text, { ...options, parser: "typescript" });
}

// 使用 ESLint 进行代码修复，并自动应用指定的规则
// async function formatWithEslint(text: string): Promise<string> {
//     const workspaceRoot = getWorkspaceRoot();
//     if (!workspaceRoot) {
//         throw new Error("未找到工作区根目录");
//     }

//     function eslintInstance(rules: { [key: string]: any }, cwd: string) {
//         return new ESLint({
//             cwd,
//             fix: true,
//             cache: false,
//             overrideConfig: {
//                 plugins: ["@typescript-eslint", "import"],
//                 env: {
//                     es6: true,
//                     node: true,
//                 },
//                 parserOptions: {
//                     ecmaVersion: 2020,
//                     sourceType: "module",
//                 },
//                 rules
//             },
//         })
//     }
//     let output = text;
//     try {
//         let results = await eslintInstance(getEslintRulesConfig(workspaceRoot).rules, workspaceRoot).lintText(text);
//         output = results[0]?.output || text;
//     } finally {
//         return output;
//     }
// }

// 格式化 TypeScript 内容的主函数
export async function formatTypescriptText(text: string, defaultPetterSetting: Record<string, any>): Promise<string> {
    try {
        // 使用 Prettier 进行初步格式化
        let formattedText = await formatWithPrettier(text, defaultPetterSetting);

        // 使用 ESLint 进行进一步修复
        // formattedText = await formatWithEslint(formattedText);

        return formattedText;
    } catch (error: any) {
        throw new Error(`格式化失败: ${error.message}`);
    }
}



export async function formatCode(code: string, language: string = 'typescript'): Promise<string> {
    try {
        // 使用隐藏文档避免弹窗
        const tempDoc = await vscode.workspace.openTextDocument({
            language,
            content: code,
        });
        // 显示文档以确保其成为活动窗口
        const editor = await vscode.window.showTextDocument(tempDoc, { preview: true });
        // 调用格式化命令，直接获取格式化结果
        const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
            'vscode.executeFormatDocumentProvider',
            tempDoc.uri
        );

        if (!edits || edits.length === 0) {
            throw new Error('没有格式化结果返回');
        }

        // 应用格式化结果到原始代码
        const formattedCode = applyEdits(code, edits);

        await closeSpecifiedEditorWithoutSaving(tempDoc.uri)
        return formattedCode;
    } catch (error) {
        console.error('格式化代码失败:', error);
        throw new Error('格式化失败，请检查编辑器或默认格式化工具设置。');
    }
}

// 辅助函数：应用格式化结果到字符串
function applyEdits(original: string, edits: vscode.TextEdit[]): string {
    let result = original;
    edits
        .sort((a, b) => b.range.start.compareTo(a.range.start)) // 从后往前应用更改
        .forEach(edit => {
            const start = getOffset(original, edit.range.start);
            const end = getOffset(original, edit.range.end);
            result = result.slice(0, start) + edit.newText + result.slice(end);
        });
    return result;
}

// 辅助函数：将位置转换为字符串偏移量
function getOffset(text: string, position: vscode.Position): number {
    const lines = text.split('\n');
    let offset = 0;
    for (let i = 0; i < position.line; i++) {
        offset += lines[i].length + 1; // 加上换行符
    }
    offset += position.character;
    return offset;
}
/**
 * 强制关闭指定的文件窗口（不保存）
 * @param uri 文件的 URI
 */
export async function closeSpecifiedEditorWithoutSaving(uri: vscode.Uri) {
    // 遍历所有打开的标签页
    const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs);

    // 找到目标标签
    const targetTab = tabs.find(tab => {
        if (tab.input instanceof vscode.TabInputText) {
            return tab.input.uri.toString() === uri.toString();
        }
        return false;
    });
    console.log("-------->fun--closeSpecifiedEditorWithoutSaving", targetTab, uri.toString());
    if (!targetTab) {
        vscode.window.showWarningMessage(`未找到指定的文件窗口：${uri.fsPath}`);
        return;
    }

    // 激活目标文件窗口
    const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri.toString());
    if (document) {
        // 将目标文件设为活动窗口
        await vscode.window.showTextDocument(document, { preview: true });

        // 强制关闭当前活动窗口，不保存更改
        await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
    }
}