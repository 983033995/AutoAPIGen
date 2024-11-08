/*
 * @FilePath: /AutoAPIGen/src/core/create/test.ts
 * @Description: 
 */

import * as vscode from 'vscode';
import { getWorkspaceStateUtil } from '../workspace/stateManager';
import prettier from 'prettier';
import { FeedbackHelper } from '../helpers/feedbackHelper'
import { firstToLocaleUpperCase } from '../helpers/helper'
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
    cleanedPart = cleanedPart.split(/[-_]/g).map((str, index) => {
      if (index > 0) {
        str = str.charAt(0).toUpperCase() + str.slice(1);
      }
      return str
    }).join('');

    // 转换为大驼峰
    return cleanedPart.charAt(0).toUpperCase() + cleanedPart.slice(1);
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
    let petterSetting = {
      semi: false,
      singleQuote: true,
      parser: "typescript"
    }
    try {
      petterSetting = { ...petterSetting, ...JSON.parse(setting.configInfo?.prettierSetting || '{}') }
    } catch (error: any) {
      console.log('----->error', error)
      FeedbackHelper.logErrorToOutput(`请检查petter配置: ${error}`);
    }
    console.log('----->setting.configInfo?.prettierSetting', setting.configInfo?.prettierSetting, typeof setting.configInfo?.prettierSetting, petterSetting)

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
      type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never
    `
    // 拼接所有接口方法
    const allFunctionContext = apiFunctionHead + apiFunctionStr

    // 拼接所有接口类型
    const allInterfaceContext = apiDetailGather.reduce((prev, cur) => {
      return prev + cur.apiInterfaceContext;
    }, '')

    let formattedFunCode = allFunctionContext
    // 格式化代码
    try {
      formattedFunCode = await prettier.format(allFunctionContext, petterSetting);
    } catch (error: any) {
      FeedbackHelper.logErrorToOutput(`代码格式化失败，请检查petter配置: ${error}`);
    }
    console.log('------>', formattedFunCode)
    let formattedInterfaceCode = allInterfaceContext
    try {
      formattedInterfaceCode = await prettier.format(allInterfaceContext, petterSetting);
    } catch (error) {
      FeedbackHelper.logErrorToOutput(`代码格式化失败，请检查petter配置: ${error}`);
    }
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
          FeedbackHelper.logErrorToOutput(`Failed to create file ${apiUri.path}: ${error || '未知错误'}`);
          throw new Error(`Failed to create file at: ${error || 'Unknown error'}`);
        }
      } else {
        // 检查文件中是否存在这个函数及该函数相关的接口引用，如果不存在，则写入相应内容，如存在则将其替换为新的内容
        const updatedApiContent = await updateFileContent(apiUri, formattedFunCode, "function");
        await vscode.workspace.fs.writeFile(apiUri, Buffer.from(updatedApiContent));
        const updatedInterfaceContent = await updateFileContent(InterfaceUri, formattedInterfaceCode, "interface");
        await vscode.workspace.fs.writeFile(InterfaceUri, Buffer.from(updatedInterfaceContent));
      }
    } else {
      // 如果接口方法的文件不存在
      // 生成新文件
      await vscode.workspace.fs.writeFile(apiUri, Buffer.from(formattedFunCode));
      await vscode.workspace.fs.writeFile(InterfaceUri, Buffer.from(formattedInterfaceCode));
      // await fsExtra.ensureFile(apiUri.fsPath);
      // await fsExtra.writeFile(apiUri.fsPath, JSON.stringify(apiUri), { encoding: 'utf-8' });
    }
    console.log('------>filePath', apiStat, interfaceStat, type, apiUri)
  } catch (error) {
    FeedbackHelper.logErrorToOutput(`Failed to create file ${apiUri.path}: ${error || '未知错误'}`);
    throw new Error(`Failed to create file at: ${error || 'Unknown error'}`);
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

export async function generateFile(filePathList: PathApiDetail[], type: treeItemType, progress: vscode.Progress<{ message?: string, increment?: number }>) {
  const apiDetailList: ApiDetailListData[] = getWorkspaceStateUtil().get('AutoApiGen.ApiDetailList')?.data || []
  const setting: ConfigurationInformation = getWorkspaceStateUtil().get('AutoApiGen.setting')?.data || {}

  const createSuccessFiles = []

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
          interfaceBodyQueryName: (apiDetailItem?.requestBody?.parameters || []).length || apiDetailItem?.requestBody?.jsonSchema ? `${apiFunctionName}Body` : '',
        }
      })
      console.log('------>apiDetailGather', apiDetailGather)
      await createFile(commonPath, apiFunctionPath, funInterfacePath, type, apiDetailGather, axiosQuote)
      console.log('------>funApiPath', apiFunctionPath, funInterfacePath)
      createSuccessFiles.push(apiFunctionPath.path)
      createSuccessFiles.push(funInterfacePath.path)
      const process = (i / filePathList.length) * 100
      progress.report({ increment: process, message: `已完成 ${Math.round(process)}%` });
    } catch (error) {
      console.error('----->error', error)
      FeedbackHelper.showError(`文件生成失败: ${error || 'Unknown error'}`)
      continue
    }
  }

  createSuccessFiles.length && FeedbackHelper.showFileCreationResults(createSuccessFiles)
}

const nameFormatter = (name: string) => {
  return ['.', '[', ']', '-'].some(item => name.includes(item)) ? `\"${name}\"` : name
}

function extractReturnData(responses: ApiDetailListData['responses'] | []) {
  const setting: ConfigurationInformation = getWorkspaceStateUtil().get('AutoApiGen.setting')?.data || {}
  const returnDataKey: string[] = (setting.configInfo?.axiosReturnKey || '').split(',').filter((item: string) => item)
  const defaultResponses = responses?.find(res => +res.code === 200) || undefined
  const apiDataSchemas: ApiDataSchemasItem[] = getWorkspaceStateUtil().get('AutoApiGen.ApiDataSchemas')?.data || [];
  let finalJsonSchema: Record<string, any> = defaultResponses?.jsonSchema || {}
  if (defaultResponses && defaultResponses.jsonSchema) {
    const jsonSchema = defaultResponses.jsonSchema as unknown as Record<string, any>
    function resolveSchemaRef(jsonSchema: Record<string, any>, apiDataSchemas: ApiDataSchemasItem[], depth = 0, maxDepth = 3) {
      // 检查最大递归深度
      if (depth >= maxDepth) {
        console.warn(`达到最大递归深度: ${maxDepth}`);
        return jsonSchema; // 返回当前 schema 而不再深入
      }
    
      if (jsonSchema?.$ref) {
        const refId = jsonSchema.$ref.split('/').pop();
        const schema = apiDataSchemas.find(item => item.id === +refId)?.jsonSchema || {};
    
        // 如果引用的 schema 也有 $ref，递归查找
        if (schema?.$ref) {
          return resolveSchemaRef(schema, apiDataSchemas, depth + 1, maxDepth);
        }
    
        return schema; // 找到的 schema 没有 $ref，返回该 schema
      }
    
      return jsonSchema; // 没有 $ref，直接返回原始 schema
    }
    finalJsonSchema = resolveSchemaRef(jsonSchema, apiDataSchemas)
  }
  if (returnDataKey.length) {
    if (returnDataKey.every(item => (finalJsonSchema['x-apifox-orders'] || []).includes(item))) {
      finalJsonSchema['x-apifox-orders'] = returnDataKey
      finalJsonSchema.properties = returnDataKey.reduce((acc, cur) => {
        acc[cur] = finalJsonSchema.properties[cur];
        return acc;
      }, {} as Record<string, any>)
    }
    if (returnDataKey.length === 1) {
        const returnSchema = finalJsonSchema.properties[returnDataKey[0]]
        if (returnSchema?.$ref) {
          const refId = returnSchema.$ref.split('/').pop();
          finalJsonSchema = apiDataSchemas.find(item => item.id === +refId)?.jsonSchema || {}
        } else {
          finalJsonSchema = returnSchema
        }
      }
  }
  return {
    ...defaultResponses,
    jsonSchema: finalJsonSchema,
  }
}

// 构建方法模版
function buildMethodTemplate(apiFunctionName: string, useApiFunctionName: string, apiModel: apiModelType, apiDetailItem: Partial<ApiDetailListData>, axiosQuote: string): { fun: string, interFace: string } {
  const pathParams = apiDetailItem?.parameters?.path || [] // 拼接在url路径上的动态参数
  const queryParams = apiDetailItem?.parameters?.query || [] // 正常的query参数
  const apiDetailParams: ApiDetailParametersQuery[] = [...pathParams, ...queryParams]
  const haveReqBody = (apiDetailItem?.requestBody?.parameters || []).length || apiDetailItem?.requestBody?.jsonSchema
  const axiosAlias = extractVariableName(axiosQuote)
  const apiPath = convertToTemplateString(apiDetailItem.path || '', pathParams)
  const apiMethod = apiDetailItem.method || 'get'
  const responses = apiDetailItem?.responses?.find(res => +res.code === 200) || {}
  console.log('---->apiDetailItem', apiDetailItem, apiDetailParams)
  console.log('----->axiosAlias', axiosAlias, axiosQuote)

  const exportInterfaceQuery = queryParams.length ? `
      /**
       * @description ${apiDetailItem.tags?.join('/')}/${apiDetailItem.name}--接口请求Query参数
       * @url ${apiMethod.toLocaleUpperCase()} ${apiDetailItem.path}
      */
      export interface ${apiFunctionName}Query {
        ${queryParams.reduce((acc, cur) => {
    return acc + `${cur.description ? `/** ${cur.description}${cur.example ? `  example: ${cur.example}` : ''} */` : ''}
            ${nameFormatter(cur.name)}${cur.required ? '' : '?'}: ${buildParameters(cur)}
          `
  }, '')} [key: string]: any
      }
      ` : ''

  const exportInterfaceBody = haveReqBody ? `
      /**
       * @description ${apiDetailItem.tags?.join('/')}/${apiDetailItem.name}--接口请求Body参数
       * @url ${apiMethod.toLocaleUpperCase()} ${apiDetailItem.path}
      */
      ${buildParametersSchema(apiDetailItem?.requestBody || {}, `${apiFunctionName}Body`)}
      ` : ''

  const exportInterfacePathQuery = pathParams.length > 1 ? `
      /**
       * @description ${apiDetailItem.tags?.join('/')}/${apiDetailItem.name}--接口路径参数
       * @url ${apiMethod.toLocaleUpperCase()} ${apiDetailItem.path}
      */
      export interface ${apiFunctionName}PathQuery {
        ${pathParams.reduce((acc, cur) => {
    return acc + `${cur.description ? `/** ${cur.description}${cur.example ? `  example: ${cur.example}` : ''} */` : ''}
            ${nameFormatter(cur.name)}${cur.required ? '' : '?'}: ${buildParameters(cur)}
          `
  }, '')} [key: string]: any
      }
      ` : ''

  const exportInterfaceRes = `
      /**
       * @description ${apiDetailItem.tags?.join('/')}/${apiDetailItem.name}--接口返回值
       * @url ${apiMethod.toLocaleUpperCase()} ${apiDetailItem.path}
      */
      ${buildParametersSchema(extractReturnData(apiDetailItem?.responses || []), `${apiFunctionName}Res`)}
     `
  const exportInterface = exportInterfaceQuery + exportInterfacePathQuery + exportInterfaceBody + exportInterfaceRes
  console.log('----->apiDetailParams.length', apiDetailParams.length, exportInterface)
  console.log('------->extractReturnData', extractReturnData(apiDetailItem?.responses || []))
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
        args.push(`pathParams: Expand<${apiFunctionName}PathQuery>`)
      } else {
        args.push(`${pathParams[0].name}: ${buildParameters(pathParams[0])}`)
      }
    }
    if (queryParams.length) {
      args.push(`params: Expand<${apiFunctionName}Query>`)
    }
    if (!apiTypeCollection.includes(apiDetailItem.method || 'get') && haveReqBody) {
      args.push(`data: Expand<${apiFunctionName}Body>`)
    }
    args.push('axiosConfig?: AxiosRequestConfig')
    const argsStr = args.join(', ')

    return `export const ${apiFunctionName} = async (${argsStr}): Promise<Expand<${apiFunctionName}Res>> => {`
  }


  // 构造API请求路径
  const apiFunctionBody = () => {
    const url = apiDetailParams.length ? `\`${apiPath || ''}${queryParams.length ? '?${qs.stringify(params)}' : ''}\`` : `'${apiDetailItem.path || ''}'`
    const bodyParams = apiTypeCollection.includes(apiDetailItem.method || 'get') ? '' : haveReqBody ? 'data, ' : `{}, `
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

// 递归函数，用于生成接口参数
function transformSchema(jsonSchema: Record<string, any>, interfaceName: string): string {
  let res = '';
  let childrenRes = '';
  const apiDataSchemas: ApiDataSchemasItem[] = getWorkspaceStateUtil().get('AutoApiGen.ApiDataSchemas')?.data || [];
  const schemaTypes = ['object', 'array'];

  const processedRefs: Record<number | string, any> = {};
  const processedInterfaces = new Set<string>();

  const isSchema = (propertiesObj: Record<string, any>) => {
    return schemaTypes.includes(propertiesObj?.type || 'any') || propertiesObj?.$ref;
  };

  const output = (obj: Record<string, any>, faceName: string): string => {
    if (obj.$ref) {
      const refId = obj.$ref.split('/').pop();
      if (!refId || refId in processedRefs) {
        return '';
      }
      processedRefs[refId] = faceName;
      // if (!refId || processedRefs.has(refId)) return '';
      // processedRefs.add(refId);

      const schema = apiDataSchemas.find(item => item.id === +refId)?.jsonSchema || {};
      return output(schema, faceName);
    }

    const type = obj?.type || 'object';
    if (type === 'object') {
      let resStr = '';
      const { 'x-apifox-orders': keys = [], required = [], properties = {} } = obj;

      for (const key of keys) {
        const property = properties[key];
        if (property['x-tmp-pending-properties']) continue;

        const title = property.title || '';
        const isRequired = required.includes(key);
        const typeStr = buildPropertyType(property, key, faceName);

        resStr += `
          /** ${title} */
          ${nameFormatter(key)}${isRequired ? '' : '?'}: ${property.type === 'array' && (property.$ref || property.items.$ref) ? typeStr + '[]' : typeStr};`;
      }
      return resStr;
    } else if (type === 'array') {
      const { items } = obj;
      return schemaTypes.includes(items.type) || items?.$ref ? output(items, faceName) : buildParameters(items);
    } else {
      return buildParameters(obj);
    }
  };

  const buildArrayReturn = () => {
    buildPropertyType(jsonSchema, 'item', interfaceName)
    return `${interfaceName}Item[]`
  }
  res = jsonSchema.type === 'object' || jsonSchema.$ref ? `
    export interface ${interfaceName} {
      ${output(jsonSchema, interfaceName)}
      [key: string]: any
    }
  ` : `
    export type ${interfaceName} = ${buildArrayReturn()}
  `;

  function buildPropertyType(property: Record<string, any>, key: string, faceName: string) {
    if (isSchema(property)) {
      if (property.type === 'array') {
        console.log('------->array---1', property)
        if (isSchema(property.items)) {
          if (property.$ref || property.items.$ref) {
            const refId = (property.$ref || property.items.$ref).split('/').pop() || '';
            if (processedRefs[refId]) {
              return `${processedRefs[refId]}[]`
            } else {
              processedRefs[refId] = `${faceName}${firstToLocaleUpperCase(key)}`
              const schema = apiDataSchemas.find(item => item.id === +refId)?.jsonSchema || {};
              return `${buildChildrenOutput(schema, `${faceName}${firstToLocaleUpperCase(key)}`)}`
            }
          } else {
            return `${buildChildrenOutput(property, `${faceName}${firstToLocaleUpperCase(key)}`)}`
          }
        } else {
          return `${property.items?.type || 'any'}[]`
        }
      } else {
        if (property?.$ref) {
          console.log('------->array---2', property)
          const refId = property.$ref.split('/').pop();
          console.log('------>已存在ref', refId, processedRefs);
          if (!refId || refId in processedRefs) {
            return '';
          }
          processedRefs[refId] = faceName;
          // if (!refId || processedRefs.has(refId)) return '';
          // processedRefs.add(refId);
          const schema = apiDataSchemas.find(item => item.id === +refId)?.jsonSchema || {};
          return `${buildChildrenOutput(schema, `${faceName}${firstToLocaleUpperCase(key)}`)}`;
        }
        console.log('------->array---3', property)
        return `${buildChildrenOutput(property, `${faceName}${firstToLocaleUpperCase(key)}`)}`;
      }
    } else {
      return buildParameters(property);
    }
  }

  function buildChildrenOutput(childrenObj: Record<string, any>, childrenFaceName: string): string {
    const type = childrenObj?.type || 'any';
    const childrenInterface = type === 'array' ? `${childrenFaceName}Item[]` : childrenFaceName;
    const childrenInterfaceName = type === 'array' ? `${childrenFaceName}Item` : childrenFaceName;

    const getRefObj = (ref: string): Record<string, any> => {
      const refId = ref.split('/').pop() || '';
      console.log('------>已存在refId----', refId, processedRefs, childrenInterfaceName, processedInterfaces);
      if (!refId || refId in processedRefs) {
        return {};
      }
      processedRefs[refId] = childrenInterfaceName;
      // if (!refId || processedRefs.has(refId)) return {};
      // processedRefs.add(refId);
      const schema = apiDataSchemas.find(item => item.id === +refId)?.jsonSchema || {};
      return schema;
    }

    const noRef = childrenObj?.$ref || childrenObj?.items?.$ref ? getRefObj(childrenObj.$ref || childrenObj?.items?.$ref) : childrenObj;

    let childrenResStr = type === 'string' ? `
    /** ${noRef.title || ''}${noRef.description || ''} */
    export type ${childrenInterfaceName} = ${buildParameters(noRef)}
  ` : `
    /** ${noRef.title || ''}${noRef.description || ''} */
    export interface ${childrenInterfaceName} {
      ${output(noRef, childrenFaceName)}
      [key: string]: any
    }
  `;
    childrenRes += childrenResStr;

    return childrenInterface;
  }

  return res + childrenRes;
}

function buildParametersSchema(configObj: Record<string, any>, interfaceName: string): string {
  if (!configObj) {
    return `
      export interface ${interfaceName} {
        [key: string]: any
      }
    `;
  } else if (configObj.jsonSchema) {
    return transformSchema(configObj.jsonSchema, interfaceName);
  } else {
    const bodyParameters: any[] = configObj.parameters || [];
    return `
      export interface ${interfaceName} {
        ${bodyParameters.reduce((acc, cur) => {
      return acc + `${cur.description ? `/** ${cur.description}${cur.example ? `  example: ${cur.example}` : ''} */` : ''}
            ${nameFormatter(cur.name)}${cur.required ? '' : '?'}: ${buildParameters(cur)}
          `;
    }, '')} [key: string]: any
      }
    `;
  }
}

// 构建参数模版
function buildParameters(parameters: ApiDetailParametersQuery): string {
  console.log('-------->buildParameters', parameters)
  const schema = parameters?.schema || undefined
  const typeMap = {
    'date-time': () => 'Date',
    'date': () => 'Date',
    'string': () => {
      if (parameters?.enum) {
        return parameters.enum.map(item => `'${item}'`).join(' | ')
      }
      return 'string'
    },
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
      return 'string[]'
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