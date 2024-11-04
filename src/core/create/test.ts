import * as vscode from 'vscode';
import fsExtra from 'fs-extra';
import prettier from 'prettier';
import { getWorkspaceStateUtil } from '../workspace/stateManager';
import { FeedbackHelper } from '../helpers/feedbackHelper';
import { firstToLocaleUpperCase } from '../helpers/helper';

const apiTypeCollection = ['get', 'delete', 'head', 'options'];

// 创建或更新 API 和接口文件的主函数
export async function createFile(
  commonPath: string,
  apiUri: vscode.Uri,
  interfaceUri: vscode.Uri,
  type: treeItemType,
  apiDetailGather: ApiDetailGather[],
  axiosQuote: string
): Promise<void> {
  const { formattedFunCode, formattedInterfaceCode } = await generateFormattedCode(apiDetailGather, axiosQuote);

  const apiFileExists = await fsExtra.pathExists(apiUri.fsPath);
  const interfaceFileExists = await fsExtra.pathExists(interfaceUri.fsPath);

  try {
    if (apiFileExists) {
      const updatedApiContent = await updateFileContent(apiUri, formattedFunCode, "function");
      await vscode.workspace.fs.writeFile(apiUri, Buffer.from(updatedApiContent));

      if (interfaceFileExists) {
        const updatedInterfaceContent = await updateFileContent(interfaceUri, formattedInterfaceCode, "interface");
        await vscode.workspace.fs.writeFile(interfaceUri, Buffer.from(updatedInterfaceContent));
      } else {
        await vscode.workspace.fs.writeFile(interfaceUri, Buffer.from(formattedInterfaceCode));
      }
    } else {
      await vscode.workspace.fs.writeFile(apiUri, Buffer.from(formattedFunCode));
      await vscode.workspace.fs.writeFile(interfaceUri, Buffer.from(formattedInterfaceCode));
    }
  } catch (error) {
    FeedbackHelper.logErrorToOutput(`文件创建或更新错误: ${error}`);
    throw new Error(`创建或更新文件失败: ${error}`);
  }
}

// 检查并更新文件内容
async function updateFileContent(uri: vscode.Uri, newContent: string, contentType: "function" | "interface"): Promise<string> {
  const fileContentBuffer = await vscode.workspace.fs.readFile(uri);
  const fileContent = fileContentBuffer.toString();

  const contentExists = contentType === "function"
    ? hasFunctionDefinition(fileContent, newContent)
    : hasInterfaceDefinition(fileContent, newContent);

  if (contentExists) {
    return replaceExistingContent(fileContent, newContent, contentType);
  } else {
    return fileContent + "\n" + newContent;
  }
}

// 检查函数定义是否存在
function hasFunctionDefinition(fileContent: string, functionContent: string): boolean {
  const functionName = extractFunctionName(functionContent);
  const regex = new RegExp(`export const ${functionName}\\s*=`, 'g');
  return regex.test(fileContent);
}

// 检查接口定义是否存在
function hasInterfaceDefinition(fileContent: string, interfaceContent: string): boolean {
  const interfaceName = extractInterfaceName(interfaceContent);
  const regex = new RegExp(`export interface ${interfaceName}\\s*{`, 'g');
  return regex.test(fileContent);
}

// 替换现有内容
function replaceExistingContent(fileContent: string, newContent: string, contentType: "function" | "interface"): string {
  const name = contentType === "function" ? extractFunctionName(newContent) : extractInterfaceName(newContent);
  const regex = new RegExp(`export ${contentType} ${name}[^]*?(?=export|$)`, 'g');
  return fileContent.replace(regex, newContent);
}

// 提取函数名称
function extractFunctionName(functionContent: string): string {
  const match = functionContent.match(/export const (\w+)\s*=/);
  return match ? match[1] : "";
}

// 提取接口名称
function extractInterfaceName(interfaceContent: string): string {
  const match = interfaceContent.match(/export interface (\w+)\s*{/);
  return match ? match[1] : "";
}

// 生成格式化代码
async function generateFormattedCode(apiDetailGather: ApiDetailGather[], axiosQuote: string) {
  const allInterfaceNames = generateInterfaceNames(apiDetailGather);
  const apiFunctionStr = apiDetailGather.reduce((acc, cur) => acc + cur.apiFunctionContext, '');
  const isNeedQs = apiFunctionStr.includes('${qs.stringify(');

  const apiFunctionHead = `
    ${isNeedQs ? 'import qs from \'qs\'' : ''}
    import type { AxiosRequestConfig } from 'axios'
    import type { ${allInterfaceNames} } from './interface'
    ${axiosQuote}
    type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never
  `;

  const allFunctionContext = apiFunctionHead + apiFunctionStr;
  const allInterfaceContext = apiDetailGather.reduce((acc, cur) => acc + cur.apiInterfaceContext, '');

  const formattedFunCode = await formatCode(allFunctionContext);
  const formattedInterfaceCode = await formatCode(allInterfaceContext);

  return { formattedFunCode, formattedInterfaceCode };
}

// 格式化代码
async function formatCode(code: string) {
  const prettierSettings = await loadPrettierSettings();
  try {
    return await prettier.format(code, prettierSettings);
  } catch (error) {
    FeedbackHelper.logErrorToOutput(`代码格式化失败: ${error}`);
    return code;
  }
}

// 加载 Prettier 配置
async function loadPrettierSettings() {
  const setting: ConfigurationInformation = getWorkspaceStateUtil().get('AutoApiGen.setting')?.data || {};
  let defaultSettings = { semi: false, singleQuote: true, parser: "typescript" };

  try {
    const prettierConfig = JSON.parse(setting.configInfo?.prettierSetting || '{}');
    return { ...defaultSettings, ...prettierConfig };
  } catch (error) {
    FeedbackHelper.logErrorToOutput(`加载 Prettier 配置失败: ${error}`);
    return defaultSettings;
  }
}

// 生成接口名称列表
function generateInterfaceNames(apiDetailGather: ApiDetailGather[]): string {
  const allInterfaceNames = Array.from(new Set(
    apiDetailGather.flatMap(cur => [
      cur.interfaceQueryName,
      cur.interfacePathQueryName,
      cur.interfaceBodyQueryName,
      cur.interfaceResName
    ].filter(Boolean))
  ));
  return allInterfaceNames.sort().join(', ');
}

// 将路径转换为 PascalCase
function convertPathToPascalCase(path: string): string {
  path = path.replace(/^https?:\/\/[^\/]+/, '');
  const parts = path.split('/').filter(Boolean).slice(-3);

  return parts.map(part => {
    let cleanedPart = part.replace(/[{${}]/g, '').split(/[-_]/g).map((str, index) => index > 0 ? str.charAt(0).toUpperCase() + str.slice(1) : str).join('');
    return cleanedPart.charAt(0).toUpperCase() + cleanedPart.slice(1);
  }).join('');
}

// 提取变量名
function extractVariableName(importStatement: string): string | null {
  const patterns = [/import\s+([a-zA-Z_$][\w$]*)\s+from\s+['"][^'"]+['"]/];
  for (const pattern of patterns) {
    const match = importStatement.match(pattern);
    if (match) return match[1] || null;
  }
  return null;
}