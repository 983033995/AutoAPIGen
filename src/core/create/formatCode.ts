import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as prettier from 'prettier';
import { ESLint } from 'eslint';
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
async function formatWithEslint(text: string): Promise<string> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
        throw new Error("未找到工作区根目录");
    }

    function eslintInstance(rules: { [key: string]: any }, cwd: string) {
        return new ESLint({
            cwd,
            fix: true,
            cache: false,
            overrideConfig: {
                plugins: ["@typescript-eslint", "import"],
                env: {
                    es6: true,
                    node: true,
                },
                parserOptions: {
                    ecmaVersion: 2020,
                    sourceType: "module",
                },
                rules
            },
        })
    }
    try {
        let results = await eslintInstance(getEslintRulesConfig(workspaceRoot).rules, workspaceRoot).lintText(text);
        let output = results[0]?.output;
        if (output) {
            return output;
        } else {
            // 尝试使用默认规则进行修复
            results = await eslintInstance(defaultEslintRules.rules, workspaceRoot).lintText(text);
            output = results[0]?.output || text;
            return output
        }
    } catch (error: any) {
        throw new Error(`格式化失败--: ${error.message}`);
    }
}

// 格式化 TypeScript 内容的主函数
export async function formatTypescriptText(text: string, defaultPetterSetting: Record<string, any>): Promise<string> {
    try {
        // 使用 Prettier 进行初步格式化
        let formattedText = await formatWithPrettier(text, defaultPetterSetting);

        // 使用 ESLint 进行进一步修复
        formattedText = await formatWithEslint(formattedText);

        return formattedText;
    } catch (error: any) {
        throw new Error(`格式化失败: ${error.message}`);
    }
}
