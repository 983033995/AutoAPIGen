/*
 * @FilePath: /AutoAPIGen/src/core/create/index.ts
 * @Description: 
 */
import * as vscode from 'vscode';
import { getWorkspaceStateUtil } from '../workspace/stateManager';
import prettier from 'prettier';
const fsExtra = require('fs-extra');
const apiTypeCollection = ['get', 'delete', 'head', 'options']
/**
 * 将路径转换为大驼峰形式的字符串
 *
 * @param path 路径字符串
 * @returns 转换后的大驼峰形式的字符串
 */
function convertPathToPascalCase(path: string): string {
  path = path.replace(/^https?:\/\/[^\/]+/, '')

  // 分割路径并提取最后三个部分
  const parts = path.split('/').filter(Boolean);
  const lastThreeParts = parts.slice(-3);

  // 处理每个部分
  const formattedParts = lastThreeParts.map(part => {
    // 去除包裹变量的符号 "{}" 或 "${}"
    let cleanedPart = part.replace(/[{${}]/g, '');

    // 去除连接符 "-" 和 "_"
    cleanedPart = cleanedPart.replace(/[-_]/g, '');

    // 转换为大驼峰
    return cleanedPart.charAt(0).toUpperCase() + cleanedPart.slice(1).toUpperCase();
  });

  // 合并成一个字符串
  return formattedParts.join('');
}

/**
 * 创建一个文件，包含api方法和接口定义
 *
 * @param commonPath 公共路径
 * @param apiUri api文件Uri
 * @param InterfaceUri 接口文件Uri
 * @param type 树节点类型
 * @param apiDetailGather api详细信息的数组
 * @param axiosQuote axios引用
 * @returns Promise<void>
 */
export async function createFile(commonPath: string, apiUri: vscode.Uri, InterfaceUri: vscode.Uri, type: treeItemType, apiDetailGather: ApiDetailGather[], axiosQuote: string): Promise<void> {
  try {
    const apiStat = await fsExtra.pathExists(apiUri.fsPath);
    const interfaceStat = await fsExtra.pathExists(InterfaceUri.fsPath);
    const setting: ConfigurationInformation = getWorkspaceStateUtil().get('AutoApiGen.setting')?.data || {}
    console.log('----->setting.configInfo?.prettierSetting', setting.configInfo?.prettierSetting, typeof setting.configInfo?.prettierSetting)
    let petterSetting = {}
    try {
      petterSetting = JSON.parse(setting.configInfo?.prettierSetting || '{}')
    } catch (error) {
      petterSetting = {
        semi: false,
        singleQuote: true,
        parser: "typescript"
      }
    }

    // 所有接口相关使用的interface集合
    const allInterfaceName = Array.from(new Set(
      apiDetailGather.flatMap(cur => [
        cur.interfaceQueryName,
        cur.interfacePathQueryName,
        cur.interfaceBodyQueryName,
        cur.interfaceResName
      ].filter(Boolean))
    )).sort().join(',')
    const apiFunctionStr = apiDetailGather.reduce((prev, cur) => {
      return prev + cur.apiFunctionContext;
    }, '')
    const isNeedQs = apiFunctionStr.includes('${qs.stringify(')
    const apiFunctionHead = `
      ${isNeedQs ? 'import qs from \'qs\'' : ''}
      import type { AxiosRequestConfig } from 'axios'
      import type { ${allInterfaceName} } from './interface'
      ${axiosQuote}
    `
    // 拼接所有接口方法
    const allFunctionContext = apiFunctionHead + apiFunctionStr

    // 拼接所有接口类型
    const allInterfaceContext = apiDetailGather.reduce((prev, cur) => {
      return prev + cur.apiInterfaceContext;
    }, '')

    // 格式化代码
    const formattedFunCode = await prettier.format(allFunctionContext, petterSetting);
    console.log('------>', formattedFunCode)
    const formattedInterfaceCode = await prettier.format(allInterfaceContext, petterSetting);
    console.log('------>formattedInterfaceCode', formattedInterfaceCode, allInterfaceContext)

    // 如果接口方法的文件已存在
    if (apiStat) {
      // 更新模块，先备份原文件，生成新文件成功之后删除原文件，生成失败则恢复源文件
      if (type === 'apiDetailFolder') {
        try {
          await vscode.workspace.fs.rename(apiUri, apiUri.with({ path: apiUri.path + '.bak' }));
          await vscode.workspace.fs.writeFile(apiUri, Buffer.from(formattedFunCode));
          await vscode.workspace.fs.delete(apiUri.with({ path: apiUri.path + '.bak' }));
          if (interfaceStat) {
            await vscode.workspace.fs.rename(InterfaceUri, InterfaceUri.with({ path: InterfaceUri.path + '.bak' }));
            await vscode.workspace.fs.writeFile(InterfaceUri, Buffer.from(formattedInterfaceCode));
            await vscode.workspace.fs.delete(InterfaceUri.with({ path: InterfaceUri.path + '.bak' }));
          }
        } catch (error) {
          const apiBakStat = await fsExtra.pathExists(apiUri.with({ path: apiUri.path + '.bak' }).fsPath);
          const interfaceBakStat = await fsExtra.pathExists(InterfaceUri.with({ path: InterfaceUri.path + '.bak' }).fsPath);
          console.log('----->apiBakStat', apiBakStat, apiUri.with({ path: apiUri.path + '.bak' }).fsPath)
          if (apiBakStat) {
            await vscode.workspace.fs.rename(apiUri.with({ path: apiUri.path + '.bak' }), apiUri);
          }
          if (interfaceBakStat) {
            await vscode.workspace.fs.rename(InterfaceUri.with({ path: InterfaceUri.path + '.bak' }), InterfaceUri);
          }
          vscode.window.showErrorMessage(`Failed to create file ${apiUri.path}: ${error || '未知错误'}`)
          throw new Error(`Failed to create file at: ${error || 'Unknown error'}`);
        }
      } else {
        // 检查文件中是否存在这个函数及该函数相关的接口引用，如果不存在，则写入相应内容，如不存在则将其替换为新的内容

      }
    } else {
      // 如果接口方法的文件不存在
      // 生成新文件
      await vscode.workspace.fs.writeFile(apiUri, Buffer.from(formattedFunCode));
      await vscode.workspace.fs.writeFile(InterfaceUri, Buffer.from(formattedInterfaceCode));
      // await fsExtra.ensureFile(apiUri.fsPath);
      // await fsExtra.writeFile(apiUri.fsPath, JSON.stringify(apiUri), { encoding: 'utf-8' });
    }
    console.log('------>filePath', apiStat, interfaceStat, type)
  } catch (error) {
    throw new Error(`Failed to create file at: ${error || 'Unknown error'}`);
  }
}

export async function generateFile(filePathList: PathApiDetail[], type: treeItemType) {
  const apiDetailList: ApiDetailListData[] = getWorkspaceStateUtil().get('AutoApiGen.ApiDetailList')?.data || []
  const setting: ConfigurationInformation = getWorkspaceStateUtil().get('AutoApiGen.setting')?.data || {}

  const workspaceFoldersPath = setting.workspaceFolders[0].uri.path

  const apiModel: apiModelType = setting.configInfo.model || 'axios'
  const axiosQuote: string = setting.configInfo?.axiosPath || 'import axios from "axios"'
  console.log('---->generateFile--', filePathList, apiDetailList)

  console.log('------>workspaceFoldersPath', workspaceFoldersPath)
  // 1. 确定文件路径
  const { workspaceFolders } = vscode.workspace;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('没有打开的工作区');
    return;
  }
  for (let i = 0, len = filePathList.length; i < len; i++) {
    try {
      const { path, api } = filePathList[i];
      const commonPath = `${workspaceFoldersPath}${setting.configInfo.path}/${path}`
      const apiFunctionPath = vscode.Uri.file(`${commonPath}/${setting.configInfo.appName}.ts`)
      const funInterfacePath = vscode.Uri.file(`${commonPath}/interface.ts`)
      const apiDetailGather = api.map(item => {
        const apiFunctionName = `${item.method}${convertPathToPascalCase(item.path)}`
        const useApiFunctionName = `use${item.method.charAt(0).toUpperCase() + item.method.slice(1)}${convertPathToPascalCase(item.path)}}`
        const apiDetailItem: Partial<ApiDetailListData> = apiDetailList.find(detail => detail.id === item.id) || {}
        const { fun, interFace } = buildMethodTemplate(apiFunctionName, useApiFunctionName, apiModel, apiDetailItem, axiosQuote)
        return {
          ...item,
          apiFunctionName,
          useApiFunctionName,
          apiFunctionPath,
          apiFunctionContext: fun,
          apiInterfaceContext: interFace,
          interfaceQueryName: (apiDetailItem?.parameters?.query || []).length ? `${apiFunctionName}Query` : '',
          interfaceResName: `${apiFunctionName}Res`,
          interfacePathQueryName: (apiDetailItem?.parameters?.path || []).length > 1 ? `${apiFunctionName}PathQuery` : '',
          interfaceBodyQueryName: (apiDetailItem?.requestBody?.parameters || []).length ? `${apiFunctionName}Body` : '',
        }
      })
      console.log('------>apiDetailGather', apiDetailGather)
      await createFile(commonPath, apiFunctionPath, funInterfacePath, type, apiDetailGather, axiosQuote)
      console.log('------>funApiPath', apiFunctionPath, funInterfacePath)
    } catch (error) {
      console.error('----->error', error)
      continue
    }
  }
}

// 构建方法模版
function buildMethodTemplate(apiFunctionName: string, useApiFunctionName: string, apiModel: apiModelType, apiDetailItem: Partial<ApiDetailListData>, axiosQuote: string): { fun: string, interFace: string } {
  const pathParams = apiDetailItem?.parameters?.path || [] // 拼接在url路径上的动态参数
  const queryParams = apiDetailItem?.parameters?.query || [] // 正常的query参数
  const apiDetailParams: ApiDetailParametersQuery[] = [...pathParams, ...queryParams]
  const requestBody = apiDetailItem?.requestBody?.parameters || []
  const axiosAlias = extractVariableName(axiosQuote)
  const apiPath = convertToTemplateString(apiDetailItem.path || '', pathParams)
  const apiMethod = apiDetailItem.method || 'get'
  const apiDataSchemas: ApiDataSchemasItem[] = getWorkspaceStateUtil().get('AutoApiGen.ApiDataSchemas')?.data || []
  console.log('---->apiDetailItem', apiDetailItem, apiDetailParams, apiDataSchemas)
  console.log('----->axiosAlias', axiosAlias, axiosQuote)

  const exportInterfaceQuery = queryParams.length ? `
      /**
       * @description ${apiDetailItem.tags?.join('/')}/${apiDetailItem.name}--接口请求Query参数
       * @url ${apiMethod.toLocaleUpperCase()} ${apiDetailItem.path}
      */
      export interface ${apiFunctionName}Query {
        ${queryParams.reduce((acc, cur) => {
    return acc + `${cur.description ? `/** ${cur.description}${cur.example ? `  example: ${cur.example}` : ''} */` : ''}
            ${cur.name}${cur.required ? '' : '?'}: ${buildParameters(cur, apiDataSchemas)}
          `
  }, '')} [key: string]: any
      }
      ` : ''

      const exportInterfaceBody = requestBody.length ? `
      /**
       * @description ${apiDetailItem.tags?.join('/')}/${apiDetailItem.name}--接口请求Body参数
       * @url ${apiMethod.toLocaleUpperCase()} ${apiDetailItem.path}
      */
      export interface ${apiFunctionName}Body {
        ${requestBody.reduce((acc, cur) => {
          return acc + `${cur.description ? `/** ${cur.description}${cur.example ? `  example: ${cur.example}` : ''} */` : ''}
                  ${cur.name}${cur.required ? '' : '?'}: ${buildParameters(cur, apiDataSchemas)}
                `
        }, '')} [key: string]: any
      }
      ` : ''

  const exportInterfacePathQuery = pathParams.length > 1 ? `
      /**
       * @description ${apiDetailItem.tags?.join('/')}/${apiDetailItem.name}--接口路径参数
       * @url ${apiMethod.toLocaleUpperCase()} ${apiDetailItem.path}
      */
      export interface ${apiFunctionName}PathQuery {
        ${pathParams.reduce((acc, cur) => {
    return acc + `${cur.description ? `/** ${cur.description}${cur.example ? `  example: ${cur.example}` : ''} */` : ''}
            ${cur.name}${cur.required ? '' : '?'}: ${buildParameters(cur, apiDataSchemas)}
          `
  }, '')} [key: string]: any
      }
      ` : ''

  const exportInterfaceRes = `
      /**
       * @description ${apiDetailItem.tags?.join('/')}/${apiDetailItem.name}--接口返回值
       * @url ${apiMethod.toLocaleUpperCase()} ${apiDetailItem.path}
      */
      export interface ${apiFunctionName}Res {}
      `
  const exportInterface = exportInterfaceQuery + exportInterfacePathQuery + exportInterfaceBody + exportInterfaceRes
  console.log('----->apiDetailParams.length', apiDetailParams.length, exportInterface)

  // 构造注释部分
  const description = `/**
   * @description ${apiDetailItem.tags?.join('/')}/${apiDetailItem.name}
   * @url ${apiMethod.toLocaleUpperCase()} ${apiDetailItem.path}
   * @host https://app.apifox.com/link/project/${apiDetailItem.projectId}/apis/api-${apiDetailItem.id}
   */`;

  // 构造请求方法主体
  const apiFunction = () => {
    const args = []
    if (pathParams.length) {
      if (pathParams.length > 1) {
        args.push(`pathParams: ${apiFunctionName}PathQuery `)
      } else {
        args.push(`${pathParams[0].name}: ${pathParams[0]?.type || 'string'}`)
      }
    }
    if (queryParams.length) {
      args.push(`params: ${apiFunctionName}Query`)
    }
    if (!apiTypeCollection.includes(apiDetailItem.method || 'get') && requestBody.length) {
      args.push(`data: ${apiFunctionName}Body`)
    }
    args.push('axiosConfig?: AxiosRequestConfig')
    const argsStr = args.join(', ')

    return `export const ${apiFunctionName} = async (${argsStr}): Promise<${apiFunctionName}Res> => {`
  }


  // 构造API请求路径
  const apiFunctionBody = () => {
    const url = apiDetailParams.length ? `\`${apiPath || ''}${queryParams.length ? '?${qs.stringify(params)}' : ''}\`` : `'${apiDetailItem.path || ''}'`
    const bodyParams = apiTypeCollection.includes(apiDetailItem.method || 'get') ? '' : requestBody.length ? 'data, ' : `{}, `
    return `return ${axiosAlias}.${apiMethod}(${url}, ${bodyParams}axiosConfig);`
  } 
  const handler = {
    axios: () => ({
      fun: `
        ${description}
        ${apiFunction()}
          ${apiFunctionBody()}
        }
      `,
    }),
    vueUse: () => ({
      fun: ``,
    }),
    VueHookPlus: () => ({
      fun: ``,
    }),
    wx: () => ({
      fun: ``,
    }),
    custom: () => ({
      fun: ``,
    })
  }
  console.log('-------->handler[apiModel]()', handler[apiModel]().fun)
  return { ...handler[apiModel](), interFace: exportInterface }
}

// 构建参数模版
function buildParameters(parameters: ApiDetailParametersQuery, apiDataSchemas: ApiDataSchemasItem[]): string {
  const schema = parameters?.schema || undefined
  const typeMap = {
    'date-time': () => 'Date',
    'date': () => 'Date',
    'string': () => 'string',
    'integer': () => 'number',
    'int64': () => 'number',
    'int32': () => 'number',
    'number': () => 'number',
    'boolean': () => 'boolean',
    'array': (): string => {
      if (schema && schema?.items) {
        const resType: keyof typeof typeMap = schema.items?.format || schema.items?.type || 'string'
        return `${typeMap[resType] ? typeMap[resType]() : 'any'}[]`
      }
      return 'any[]'
    },
    'file': () => 'File | Blob | ArrayBuffer | Uint8Array',
  }
  type TypeMapKey = keyof typeof typeMap
  return schema?.type ? typeMap[schema.type as TypeMapKey]() : parameters.type ? typeMap[parameters.type as TypeMapKey]() || 'any' : 'string'
}

/**
 * 从导入语句中提取变量名
 *
 * @param importStatement 导入语句字符串
 * @returns 返回提取到的变量名，若未提取到则返回null
 */
function extractVariableName(importStatement: string): string | null {
  const patterns = [
    /import\s+([a-zA-Z_$][\w$]*)\s+from\s+['"][^'"]+['"]/, // import axios from "axios"
    /import\s+([a-zA-Z_$][\w$]*)\s+as\s+([a-zA-Z_$][\w$]*)\s+from\s+['"][^'"]+['"]/, // import axios as http from "axios"
    /const\s+([a-zA-Z_$][\w$]*)\s*=\s*require\s*\(\s*['"][^'"]+['"]\s*\)/, // const axios = require("axios")
    /let\s+([a-zA-Z_$][\w$]*)\s*=\s*require\s*\(\s*['"][^'"]+['"]\s*\)/, // let axios = require("axios")
    /var\s+([a-zA-Z_$][\w$]*)\s*=\s*require\s*\(\s*['"][^'"]+['"]\s*\)/ // var axios = require("axios")
  ];

  for (const pattern of patterns) {
    const match = importStatement.match(pattern);
    if (match) {
      // 处理 import ... as ... 的特殊情况
      return match[1] || match[2] || null;
    }
  }

  return null;
}

/**
 * 将字符串中的 {var} 替换为模板字符串 ${var}，如果已经是 ${var} 则不进行替换。
 * 如果传递的 pathParams 长度大于 1，则将 {var} 替换为 ${pathParams.varName}
 *
 * @param path 待转换的字符串
 * @param pathParams 路径参数数组
 * @returns 转换后的模板字符串
 */
function convertToTemplateString(path: string, pathParams: Record<string, any>[]) {
  // 如果 pathParams 的长度大于 1，使用 'pathParams.varName' 作为变量名称前缀
  const usePathParamsPrefix = pathParams.length > 1;

  return path.replace(/{(\w+)}/g, (_, varName) => {
    // 构建最终的模板字符串，考虑是否加上 'pathParams.' 前缀
    const templateVar = usePathParamsPrefix ? `pathParams.${varName}` : varName;

    // 如果字符串中已经包含 ${templateVar}，则不进行替换
    return path.includes(`\${${templateVar}}`) ? `{${varName}}` : `\${${templateVar}}`;
  });
}