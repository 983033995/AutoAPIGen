/// <reference path="../../global.d.ts" />
import * as vscode from 'vscode';
import { getWorkspaceStateUtil } from '../workspace/stateManager';
import prettier from 'prettier';
import { FeedbackHelper } from '../helpers/feedbackHelper'
import { firstToLocaleUpperCase } from '../helpers/helper'
const fsExtra = require('fs-extra');
import * as utils from './utils'

const apiTypeCollection = ['get', 'delete', 'head', 'options']


/**
 * 将字符串中的 {var} 替换为模板字符串 ${var}，如果已经是 ${var} 则不进行替换。
 * 如果传递的 pathParams 长度大于 1，则将 {var} 替换为 ${pathParams.varName}
 *
 * @param path 待转换的字符串
 * @param pathParams 路径参数数组
 * @returns 转换后的模板字符串
 */
export function convertToTemplateString(path: string, pathParams: Record<string, any>[]) {
    // 如果 pathParams 的长度大于 1，使用 'pathParams.varName' 作为变量名称前缀
    const usePathParamsPrefix = pathParams.length > 1;

    return path.replace(/{(\w+)}/g, (_, varName) => {
        // 构建最终的模板字符串，考虑是否加上 'pathParams.' 前缀
        const templateVar = usePathParamsPrefix ? `pathParams.${varName}` : varName;

        // 如果字符串中已经包含 ${templateVar}，则不进行替换
        return path.includes(`\${${templateVar}}`) ? `{${varName}}` : `\${${templateVar}}`;
    });
}

/**
 * 从导入语句中提取变量名
 *
 * @param importStatement 导入语句字符串
 * @returns 返回提取到的变量名，若未提取到则返回null
 */
export function extractVariableName(importStatement: string): string | null {
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
 * 根据API参数详情构建参数类型字符串
 *
 * @param parameters API参数详情
 * @returns 返回参数类型字符串
 */
export function buildParameters(parameters: ApiDetailParametersQuery): string {
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

export const nameFormatter = (name: string) => {
    return ['.', '[', ']', '-'].some(item => name.includes(item)) ? `\"${name}\"` : name
}

/**
* 将路径转换为大驼峰形式的字符串
*
* @param path 路径字符串
* @returns 转换后的大驼峰形式的字符串
*/
export function convertPathToPascalCase(path: string): string {
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


// 辅助函数：构建接口请求查询参数
export function buildInterfaceQuery(apiFunctionName: string, apiDetailItem: Partial<ApiDetailListData>, queryParams: ApiDetailParametersQuery[]): string {
    if (!queryParams.length) return '';
    return `
        /**
         * @description ${apiDetailItem.tags?.join('/')}/${apiDetailItem.name}--接口请求Query参数
         * @url ${apiDetailItem.method?.toLocaleUpperCase()} ${apiDetailItem.path}
         */
        export interface ${apiFunctionName}Query {
          ${queryParams.map(cur => formatParameter(cur)).join('\n')}
          [key: string]: any
        }
      `;
}

// 辅助函数：构建接口请求Body参数
export function buildInterfaceBody(apiFunctionName: string, apiDetailItem: Partial<ApiDetailListData>, haveReqBody: boolean): string {
    if (!haveReqBody) return '';
    return `
        /**
         * @description ${apiDetailItem.tags?.join('/')}/${apiDetailItem.name}--接口请求Body参数
         * @url ${apiDetailItem.method?.toLocaleUpperCase()} ${apiDetailItem.path}
         */
        ${buildParametersSchema(apiDetailItem.requestBody || {}, `${apiFunctionName}Body`)}
      `;
}

export function buildParametersSchema(configObj: Record<string, any>, interfaceName: string): string {
    if (!configObj) {
        return `export interface ${interfaceName} {
            [key: string]: any
          }
        `;
    } else if (configObj.jsonSchema) {
        return transformSchema(configObj.jsonSchema, interfaceName);
    } else {
        const bodyParameters: any[] = configObj.parameters || [];
        return `export interface ${interfaceName} {
            ${bodyParameters.reduce((acc, cur) => {
            return acc + `${cur.description ? `/** ${cur.description}${cur.example ? `  example: ${cur.example}` : ''} */` : ''}
                ${utils.nameFormatter(cur.name)}${cur.required ? '' : '?'}: ${utils.buildParameters(cur)}
              `;
        }, '')} [key: string]: any
          }
        `;
    }
}
export function transformSchema(jsonSchema: Record<string, any>, interfaceName: string): string {
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
            ${utils.nameFormatter(key)}${isRequired ? '' : '?'}: ${property.type === 'array' && (property.$ref || property.items.$ref) ? typeStr + '[]' : typeStr};`;
            }
            return resStr;
        } else if (type === 'array') {
            const { items } = obj;
            return schemaTypes.includes(items.type) || items?.$ref ? output(items, faceName) : utils.buildParameters(items);
        } else {
            return utils.buildParameters(obj as unknown as ApiDetailParametersQuery);
        }
    };

    const buildArrayReturn = () => {
        buildPropertyType(jsonSchema, 'item', interfaceName)
        return `${interfaceName}Item[]`
    }
    res = jsonSchema.type === 'object' || jsonSchema.$ref ? `export interface ${interfaceName} {
        ${output(jsonSchema, interfaceName)}
        [key: string]: any
      }
    ` : `export type ${interfaceName} = ${buildArrayReturn()}
    `;

    function buildPropertyType(property: Record<string, any>, key: string, faceName: string) {
        if (isSchema(property)) {
            if (property.type === 'array') {
                console.log('------->array---1', property)
                if (isSchema(property.items)) {
                    if (property.$ref || property.items.$ref) {
                        const refId = (property.$ref || property.items.$ref).split('/').pop() || '';
                        if (processedRefs[refId]) {
                            return `${processedRefs[refId]}`
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
            return utils.buildParameters(property as unknown as ApiDetailParametersQuery);
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
      export type ${childrenInterfaceName} = ${utils.buildParameters(noRef as unknown as ApiDetailParametersQuery)}
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

// 辅助函数：构建接口路径参数
export function buildInterfacePathQuery(apiFunctionName: string, apiDetailItem: Partial<ApiDetailListData>, pathParams: ApiDetailParametersQuery[]): string {
    if (pathParams.length <= 1) return '';
    return `
        /**
         * @description ${apiDetailItem.tags?.join('/')}/${apiDetailItem.name}--接口路径参数
         * @url ${apiDetailItem.method?.toLocaleUpperCase()} ${apiDetailItem.path}
         */
        export interface ${apiFunctionName}PathQuery {
          ${pathParams.map(cur => formatParameter(cur)).join('\n')}
          [key: string]: any
        }
      `;
}

// 辅助函数：构建接口响应参数
export function buildInterfaceResponse(apiFunctionName: string, apiDetailItem: Partial<ApiDetailListData>, responses: any): string {
    return `
        /**
         * @description ${apiDetailItem.tags?.join('/')}/${apiDetailItem.name}--接口返回值
         * @url ${apiDetailItem.method?.toLocaleUpperCase()} ${apiDetailItem.path}
         */
        ${buildParametersSchema(extractReturnData(apiDetailItem.responses || []), `${apiFunctionName}Res`)}
      `;
}
export function extractReturnData(responses: ApiDetailListData['responses'] | []) {
    const setting: ConfigurationInformation = getWorkspaceStateUtil().get('AutoApiGen.setting')?.data || {}
    const returnDataKey: string[] = (setting.configInfo?.axiosReturnKey || '').split(',').filter((item: string) => item)
    const defaultResponses = responses?.find(res => +res.code === 200) || undefined
    const apiDataSchemas: ApiDataSchemasItem[] = getWorkspaceStateUtil().get('AutoApiGen.ApiDataSchemas')?.data || [];
    let finalJsonSchema: Record<string, any> = defaultResponses?.jsonSchema || {}
    if (defaultResponses && defaultResponses.jsonSchema) {
        const jsonSchema = defaultResponses.jsonSchema as unknown as Record<string, any>
        function resolveSchemaRef(jsonSchema: Record<string, any>, apiDataSchemas: ApiDataSchemasItem[], depth = 0, maxDepth = 3): Record<string, any> {
            // 检查最大递归深度
            if (depth >= maxDepth) {
                console.warn(`达到最大递归深度: ${maxDepth}`);
                return jsonSchema; // 返回当前 schema 而不再深入
            }

            if (jsonSchema?.$ref) {
                const refId = jsonSchema.$ref.split('/').pop();
                const schema = apiDataSchemas.find(item => item.id === +refId)?.jsonSchema || {};

                // 如果引用的 schema 也有 $ref，递归查找
                if ((schema as { $ref?: string })?.$ref) {
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

// 辅助函数：构建函数描述
export function buildDescription(apiFunctionName: string, apiDetailItem: Partial<ApiDetailListData>): string {
    return `/**
       * @description ${apiDetailItem.tags?.join('/')}/${apiDetailItem.name}
       * @url ${apiDetailItem.method?.toLocaleUpperCase()} ${apiDetailItem.path}
       * @host https://app.apifox.com/link/project/${apiDetailItem.projectId}/apis/api-${apiDetailItem.id}
       */`;
}

// 辅助函数：构建函数签名
export function buildApiFunctionSignature(apiFunctionName: string, pathParams: ApiDetailParametersQuery[], queryParams: ApiDetailParametersQuery[], haveReqBody: boolean, apiMethod: string): string {
    const args = [];
    if (pathParams.length) {
        if (pathParams.length > 1) {
            args.push(`pathParams: Expand<${apiFunctionName}PathQuery>`);
        } else {
            args.push(`${pathParams[0].name}: ${utils.buildParameters(pathParams[0])}`);
        }
    }
    if (queryParams.length) {
        args.push(`params: Expand<${apiFunctionName}Query>`);
    }
    if (!apiTypeCollection.includes(apiMethod || 'get') && haveReqBody) {
        args.push(`data: Expand<${apiFunctionName}Body>`);
    }
    args.push('axiosConfig?: AxiosRequestConfig');
    return `export const ${apiFunctionName} = async (${args.join(', ')}): Promise<Expand<${apiFunctionName}Res>> => {`;
}

// 辅助函数：构建函数主体
export function buildApiFunctionBody(apiMethod: string, axiosAlias: string, apiPath: string, apiDetailParams: ApiDetailParametersQuery[], haveReqBody: boolean, queryParams: ApiDetailParametersQuery[], apiDetailItem: Partial<ApiDetailListData>): string {
    const url = apiDetailParams.length ? `\`${apiPath}${queryParams.length ? '?${qs.stringify(params)}' : ''}\`` : `'${apiDetailItem.path}'`;
    const bodyParams = apiTypeCollection.includes(apiMethod) ? '' : haveReqBody ? 'data, ' : `{}, `;
    return `return ${axiosAlias}.${apiMethod}(${url}, ${bodyParams}axiosConfig);`;
}

export function customFunctionReturn(options: Record<string, any>, description: string, defaultFunction: string) {
    const settingConfig: ProjectConfigInfo = getWorkspaceStateUtil().get('AutoApiGen.setting')?.data.configInfo || {}
    let customFun = defaultFunction
    let extraFun = ''
    if (settingConfig.model === 'custom' && settingConfig.customReturn) {
        try {
            customFun = eval(settingConfig.customReturn);
        } catch (error: any) {
            FeedbackHelper.logErrorToOutput(`自定义返回函数执行失败, 请检查配置: ${error.message}`);
            throw new Error('自定义返回函数执行失败');
        }
    }
    if (settingConfig.model === 'custom' && settingConfig.customExtraFunction) {
        try {
            extraFun = eval(settingConfig.customExtraFunction);
        } catch (error: any) {
            FeedbackHelper.logErrorToOutput(`自定义拓展函数执行失败, 请检查配置: ${error.message}`);
            throw new Error('自定义拓展函数执行失败');
        }
    }
    const customFunStr = `\n  \n${description}\n${customFun}\n  \n${description}\n${extraFun}\n`
    console.log('----->customFunStr', customFunStr)
    return customFunStr
}

export function getErrorInfo(error: any) {
    return `${error.name}: ${error.message}\n${error.stack}`;
}

// 辅助函数：格式化参数
export function formatParameter(param: ApiDetailParametersQuery): string {
    return `${param.description ? `/** ${param.description}${param.example ? ` example: ${param.example}` : ''} */` : ''}
              ${utils.nameFormatter(param.name)}${param.required ? '' : '?'}: ${utils.buildParameters(param)}`;
}
// 辅助函数：获取 Prettier 配置
export function getPrettierSetting(setting: ConfigurationInformation) {
    let defaultSetting = { semi: false, singleQuote: true, parser: 'typescript' };
    try {
        return { ...defaultSetting, ...JSON.parse(setting.configInfo?.prettierSetting || '{}') };
    } catch (error: any) {
        FeedbackHelper.logErrorToOutput(`请检查 Prettier 配置: ${error}`);
        return defaultSetting;
    }
}

// 辅助函数：获取所有接口名称
export function getAllInterfaceNames(apiDetailGather: ApiDetailGather[]) {
    return Array.from(new Set(
        apiDetailGather.flatMap(cur => [
            cur.interfaceQueryName,
            cur.interfacePathQueryName,
            cur.interfaceBodyQueryName,
            cur.interfaceResName
        ].filter(Boolean))
    )).sort().join(',');
}

// 辅助函数：构建 API 文件头部
export function buildApiFunctionHead(allInterfaceName: string, axiosQuote: string, isNeedQs: boolean) {
    const settingConfig: ProjectConfigInfo = getWorkspaceStateUtil().get('AutoApiGen.setting')?.data.configInfo || {}
    if (settingConfig.model === 'custom' && settingConfig.head) {
        return `${settingConfig.head}\nimport type { ${allInterfaceName} } from './interface';`
    }
    return `
        ${isNeedQs ? 'import qs from \'qs\';' : ''}
        import type { AxiosRequestConfig } from 'axios';
        import type { ${allInterfaceName} } from './interface';
        ${axiosQuote}
        type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
      `;
}

// 辅助函数：格式化代码
export async function formatCode(code: string, petterSetting: any, codeType: string) {
    try {
        return await prettier.format(code, petterSetting);
    } catch (error: any) {
        FeedbackHelper.logErrorToOutput(`代码格式化失败 (${codeType}): ${error}`);
        return code;
    }
}

// 辅助函数：更新已存在文件（备份、写入和恢复逻辑）
export async function updateExistingFiles(
    uri: vscode.Uri,
    item: ApiDetailGather,
    petterSetting: any,
    isInterface = false
) {
    console.log('-------->fun--updateExistingFiles', item, uri.fsPath)

    try {
        // 读取文件内容
        let fileContent = fsExtra.readFileSync(uri.fsPath, 'utf-8');
        // 要查找和删除的函数名
        const functionName = item.apiFunctionName;
        const responseTypes = [item.interfaceResName, item.interfaceQueryName, item.interfacePathQueryName, item.interfaceBodyQueryName].filter(Boolean);

        // 新的函数内容
        const code = isInterface ? item.apiInterfaceContext : item.apiFunctionContext;

        switch (isInterface) {
            case true:
                responseTypes.forEach(typeName => {
                    fileContent = removeTypeDefinitions(fileContent, typeName);
                });
                break
            default:
                // // 构造正则模式
                // const functionPattern = new RegExp(
                //     `(export\\s+const\\s+(use)?${functionName}\\s*=\\s*async\\s*\$begin:math:text$[^)]*\\$end:math:text$\\s*:\\s*Promise<[^>]+>\\s*=>\\s*\\{[\\s\\S]*?\\}\\s*)`,
                //     'g'
                // );

                // const functionCallPattern = new RegExp(
                //     `(\\b(use)?${functionName}\\s*\$begin:math:text$[^)]*\\$end:math:text$;?)`,
                //     'g'
                // );

                // 删除与 `functionName` 相关的导入项
                const importInterfacePattern = new RegExp(
                    `import\\s+type\\s+\\{([^}]*)\\}\\s+from\\s+['"]\\.\\/interface['"];?`,
                    'g'
                );

                // // 1. 删除函数声明
                // fileContent = fileContent.replace(functionPattern, '');
                // console.log(`删除函数声明：${functionName}`);

                // // 2. 删除函数调用
                // fileContent = fileContent.replace(functionCallPattern, '');
                // console.log(`删除函数调用：${functionName} 及其 'use' 前缀`);
                fileContent = removeTypeDefinitions(fileContent, functionName);
                // 3. 更新导入语句中的类型引用
                fileContent = fileContent.replace(importInterfacePattern, (_: any, typeContent: string) => {
                    // 将导入的类型转换为数组并移除指定的 `functionName` 类型
                    const existingTypes = typeContent.split(',').map((type: string) => type.trim()).filter((type: string) => type && type !== functionName);
                    // 合并新的类型
                    const updatedTypes = Array.from(new Set([...existingTypes, ...responseTypes])).sort();

                    // 返回更新后的导入语句
                    return `import type { ${updatedTypes.join(', ')} } from './interface';`;
                });

                // 4. 检查如果导入语句不存在则添加
                if (!importInterfacePattern.test(fileContent)) {
                    const newImportStatement = `import type { ${responseTypes.join(', ')} } from './interface';\n`;
                    fileContent = newImportStatement + fileContent;
                    console.log(`已添加新的导入语句：${responseTypes.join(', ')}`);
                }
                break;
        }
        fileContent = fileContent + `\n${code}`;
        const newFunctionCode = await formatCode(fileContent, petterSetting, isInterface ? '函数' : '接口定义');
        fsExtra.writeFileSync(uri.fsPath, newFunctionCode, 'utf-8');
    } catch (error) {
        throw new Error(error as string);
    }
}
function removeTypeDefinitions(fileContent: string, typeName: string) {
    const lines = fileContent.split('\n');

    // 初始化状态机变量
    let isInTargetBlock = false; // 当前行是否在要删除的块中
    let outputLines: string[] = []; // 要保留的行
    let buffer: string[] = []; // 暂存注释和类型定义部分

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // 检查当前行是否是注释行或者空行
        const isCommentLine = line.startsWith('/**') || line.startsWith('*') || line.startsWith('//') || !line.length;

        // 检查是否进入目标类型定义块
        if (!isInTargetBlock && (line.startsWith(`export type ${typeName}`) || line.startsWith(`export interface ${typeName}`) || line.startsWith(`export const use${typeName}`) || line.startsWith(`export function use${typeName}`) || line.startsWith(`export const ${typeName}`) || line.startsWith(`export function ${typeName}`))) {
            isInTargetBlock = true; // 标记进入目标块
            buffer = []; // 清空缓冲区，开始新的删除块
            continue; // 跳过当前行（不加入输出）
        }

        // 如果在目标块中，检查是否达到块的结尾
        if (isInTargetBlock) {
            const isEndOfBlock = line.endsWith('}') || line.endsWith(';');
            if (isEndOfBlock) {
                isInTargetBlock = false; // 退出目标块
            }
            continue; // 跳过当前行（删除）
        }

        // 如果是注释行，且还未进入类型定义块，将其加入缓冲区（可能是前置注释）
        if (isCommentLine) {
            buffer.push(lines[i]);
        } else {
            // 当前行非注释且不属于目标块，将缓冲区写入输出
            if (buffer.length > 0) {
                outputLines.push(...buffer);
                buffer = []; // 清空缓冲区
            }
            // 当前行加入输出
            outputLines.push(lines[i]);
        }
    }

    // 将结果写回文件
    const newFileContent = outputLines.join('\n');
    return newFileContent;
}
// 辅助函数：备份并替换文件内容
export async function backupAndReplace(uri: vscode.Uri, content: string) {
    const backupUri = uri.with({ path: uri.path + '.bak' });
    await vscode.workspace.fs.rename(uri, backupUri);
    try {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content));
        await vscode.workspace.fs.delete(backupUri);
    } catch (error) {
        const backupExists = await fsExtra.pathExists(backupUri.fsPath);
        if (backupExists) {
            await vscode.workspace.fs.rename(backupUri, uri);
        }
        FeedbackHelper.logErrorToOutput(`文件更新失败 ${uri.path}: ${error || '未知错误'}`);
        throw new Error(`文件更新失败: ${error || '未知错误'}`);
    }
}

// 辅助函数：创建新文件
export async function createNewFiles(apiUri: vscode.Uri, InterfaceUri: vscode.Uri, funCode: string, interfaceCode: string) {
    await vscode.workspace.fs.writeFile(apiUri, Buffer.from(funCode));
    await vscode.workspace.fs.writeFile(InterfaceUri, Buffer.from(interfaceCode));
}

// 检查并更新文件内容
export async function updateFileContent(uri: vscode.Uri, newContent: string, contentType: "function" | "interface"): Promise<string> {
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
export function hasFunctionDefinition(fileContent: string, functionContent: string): boolean {
    const functionName = extractFunctionName(functionContent);
    const regex = new RegExp(`export const ${functionName}\\s*=`, 'g');
    return regex.test(fileContent);
}

// 检查接口定义是否存在
export function hasInterfaceDefinition(fileContent: string, interfaceContent: string): boolean {
    const interfaceName = extractInterfaceName(interfaceContent);
    const regex = new RegExp(`export interface ${interfaceName}\\s*{`, 'g');
    return regex.test(fileContent);
}

// 替换现有内容
export function replaceExistingContent(fileContent: string, newContent: string, contentType: "function" | "interface"): string {
    const name = contentType === "function" ? extractFunctionName(newContent) : extractInterfaceName(newContent);
    const regex = new RegExp(`export ${contentType} ${name}[^]*?(?=export|$)`, 'g');
    return fileContent.replace(regex, newContent);
}

// 提取函数名称
export function extractFunctionName(functionContent: string): string {
    const match = functionContent.match(/export const (\w+)\s*=/);
    return match ? match[1] : "";
}

// 提取接口名称
export function extractInterfaceName(interfaceContent: string): string {
    const match = interfaceContent.match(/export interface (\w+)\s*{/);
    return match ? match[1] : "";
}
