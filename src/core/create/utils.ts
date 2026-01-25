/// <reference path="../../global.d.ts" />
import * as vscode from "vscode";
import { getWorkspaceStateUtil } from "../workspace/stateManager";
const prettier = require("prettier");
const prettierPluginSortImports = require('@trivago/prettier-plugin-sort-imports');
const prettierPluginOrganizeImports = require('prettier-plugin-organize-imports');
import { FeedbackHelper } from "../helpers/feedbackHelper";
import { firstToLocaleUpperCase, cnToPinyin } from "../helpers/helper";
const fsExtra = require("fs-extra");
import path from "path";

const apiTypeCollection = ["get", "delete", "head", "options"];

/**
 * 将字符串中的 {var} 替换为模板字符串 ${var}，如果已经是 ${var} 则不进行替换。
 * 如果传递的 pathParams 长度大于 1，则将 {var} 替换为 ${pathParams.varName}
 *
 * @param path 待转换的字符串
 * @param pathParams 路径参数数组
 * @returns 转换后的模板字符串
 */
export function convertToTemplateString(
    path: string,
    pathParams: Record<string, any>[]
) {
    // 如果 pathParams 的长度大于 1，使用 'pathParams.varName' 作为变量名称前缀
    const usePathParamsPrefix = pathParams.length > 1;

    return path.replace(/{(\w+)}/g, (_, varName) => {
        // 构建最终的模板字符串，考虑是否加上 'pathParams.' 前缀
        const templateVar = usePathParamsPrefix ? `pathParams.${varName}` : varName;

        // 如果字符串中已经包含 ${templateVar}，则不进行替换
        return path.includes(`\${${templateVar}}`)
            ? `{${varName}}`
            : `\${${templateVar}}`;
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
        /var\s+([a-zA-Z_$][\w$]*)\s*=\s*require\s*\(\s*['"][^'"]+['"]\s*\)/, // var axios = require("axios")
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
    const schema = parameters?.schema || undefined;
    const typeMap: Record<string, () => string> = {
        "date-time": () => "Date",
        date: () => "Date",
        string: () => {
            if (parameters?.enum) {
                return parameters.enum.map((item) => `'${item}'`).join(" | ");
            }
            return "string";
        },
        integer: () => "number",
        int64: () => "number",
        int32: () => "number",
        number: () => "number",
        boolean: () => "boolean",
        array: () => {
            if (!schema && !parameters?.items) {
                return 'any[]';
            }
            if (schema && schema.items) {
                const resType = schema.items.format || schema.items.type || "string";
                return `${getType(resType)}[]`;
            }
            return `${getType(parameters.items.type)}[]`;
        },
        file: () => "File | Blob | ArrayBuffer | Uint8Array",
    };

    function getType(typeKey: string): string {
        return typeMap[typeKey] ? typeMap[typeKey]() : "any";
    }

    return schema?.type
        ? getType(schema.type)
        : parameters.type
            ? getType(parameters.type as string)
            : "string";
}

export const nameFormatter = (name: string) => {
    // 检查是否包含非英文字母字符
    const hasNonAlphaChars = /[^a-zA-Z]/.test(name);
    return hasNonAlphaChars
        ? `\"${name}\"`
        : name;
};

/**
 * 将路径转换为大驼峰形式的字符串
 *
 * @param path 路径字符串
 * @returns 转换后的大驼峰形式的字符串
 */
export function convertPathToPascalCase(path: string): string {
    path = path.replace(/^https?:\/\/[^\/]+/, "");

    // 分割路径并提取最后三个部分
    const parts = path.split("/").filter(Boolean);
    const lastThreeParts = parts.slice(-3);

    // 处理每个部分
    const formattedParts = lastThreeParts.map((part) => {
        // 去除包裹变量的符号 "{}" 或 "${}"
        let cleanedPart = part.replace(/[{${}]/g, "");

        // 去除连接符 "-" 和 "_"
        cleanedPart = cleanedPart
            .split(/[-_]/g)
            .map((str, index) => {
                if (index > 0) {
                    str = str.charAt(0).toUpperCase() + str.slice(1);
                }
                return str;
            })
            .join("");

        // 转换为大驼峰
        return cleanedPart.charAt(0).toUpperCase() + cleanedPart.slice(1);
    });

    // 合并成一个字符串
    return formattedParts.join("");
}

// 辅助函数：构建接口请求查询参数
export function buildInterfaceQuery(
    apiFunctionName: string,
    apiDetailItem: Partial<ApiDetailListData>,
    queryParams: ApiDetailParametersQuery[]
): string {
    if (!queryParams.length) return "";
    const description = `${apiDetailItem.tags?.join("/")}/${apiDetailItem.name}--接口请求Query参数`
    try {
        return `${'\n'}/**${'\n'} * @description ${description.replace(/\n/g, '；')}${'\n'} * @url ${apiDetailItem.method?.toLocaleUpperCase()} ${apiDetailItem.path}${'\n'} */${'\n'}export interface ${apiFunctionName}Query {${'\n'}    ${queryParams.map((cur) => formatParameter(cur)).join("\n")}${'\n'}    ${buildTypeExtension()}${'\n'}}${'\n'}`;
    } catch (error: any) {
        FeedbackHelper.logErrorToOutput(`${apiDetailItem.name}--${apiDetailItem?.path || ''}构建接口请求Query参数失败：${error.message}`);
        return `${'\n'}/**${'\n'} * @description ${description.replace(/\n/g, '；')}${'\n'} * @url ${apiDetailItem.method?.toLocaleUpperCase()} ${apiDetailItem.path}${'\n'} */${'\n'}export type ${apiFunctionName}Query = any${'\n'}`;
    }
}

// 辅助函数：构建接口请求Body参数
export function buildInterfaceBody(
    apiFunctionName: string,
    apiDetailItem: Partial<ApiDetailListData>,
    haveReqBody: boolean
): string {
    if (!haveReqBody) return "";
    const description = `${apiDetailItem.tags?.join("/")}/${apiDetailItem.name}--接口请求Body参数`
    try {
        return `${'\n'}/**${'\n'} * @description ${description.replace(/\n/g, '；')}${'\n'} * @url ${apiDetailItem.method?.toLocaleUpperCase()} ${apiDetailItem.path}${'\n'} */${'\n'}${buildParametersSchema(apiDetailItem.requestBody || {}, `${apiFunctionName}Body`)}${'\n'}`;
    } catch (error) {
        return `${'\n'}/**${'\n'} * @description ${description.replace(/\n/g, '；')}${'\n'} * @url ${apiDetailItem.method?.toLocaleUpperCase()} ${apiDetailItem.path}${'\n'} */${'\n'}export type ${`${apiFunctionName}Body`} = any${'\n'}`;
    }
}

export function buildParametersSchema(
    configObj: Record<string, any>,
    interfaceName: string
): string {
    if (!configObj) {
        // 空对象使用 type = object 避免 ESLint 空 interface 警告
        return `export type ${interfaceName} = object${'\n'}`;
    } else if (configObj.jsonSchema) {
        return transformSchema(configObj.jsonSchema, interfaceName);
    } else {
        const bodyParameters: any[] = configObj.parameters || [];
        // 如果没有参数，使用 type = object 避免 ESLint 空 interface 警告
        if (bodyParameters.length === 0) {
            return `export type ${interfaceName} = object${'\n'}`;
        }
        const bodyParametersReturnString = bodyParameters.reduce((acc, cur) => {
            return (
                acc +
                `${cur.description || cur.example ? `/** ${cur.description.replace(/\n/g, " ")}${cur.example ? `  example: ${cur.example}` : ""} */` : ""}${'\n'}    ${nameFormatter(cur.name)}${cur.required ? "" : "?"}: ${buildParameters(cur)}${'\n'}`
            );
        }, "")
        return `export interface ${interfaceName} {${'\n'}    ${bodyParametersReturnString}    ${buildTypeExtension()}${'\n'}}${'\n'}`;
    }
}
export function transformSchema(
    jsonSchema: Record<string, any>,
    interfaceName: string
): string {
    let res = "";
    let childrenRes = "";
    const apiDataSchemas: ApiDataSchemasItem[] =
        getWorkspaceStateUtil().get("AutoApiGen.ApiDataSchemas")?.data || [];
    const schemaTypes = ["object", "array"];

    const processedRefs: Record<number | string, any> = {};
    const processedInterfaces = new Set<string>();

    const isSchema = (propertiesObj: Record<string, any>) => {
        return (
            schemaTypes.includes(propertiesObj?.type || "any") || propertiesObj?.$ref
        );
    };

    const output = (obj: Record<string, any>, faceName: string): string => {
        if (obj.$ref) {
            const refId = obj.$ref.split("/").pop();
            if (!refId || refId in processedRefs) {
                return "";
            }
            processedRefs[refId] = faceName;
            // if (!refId || processedRefs.has(refId)) return '';
            // processedRefs.add(refId);

            const schema =
                apiDataSchemas.find((item) => item.id === +refId)?.jsonSchema || {};
            return output(schema, faceName);
        }

        const type = obj?.type || "object";
        if (type === "object") {
            let resStr = "";
            let {
                "x-apifox-orders": orders = [],
                "x-apifox-refs": apifoxRefs = {},
                required = [],
                properties = {},
            } = obj;

            // 处理 x-apifox-refs 中的引用，合并到 properties
            if (apifoxRefs && Object.keys(apifoxRefs).length > 0) {
                for (const [refKey, refConfig] of Object.entries(apifoxRefs)) {
                    if (refConfig && typeof refConfig === 'object' && (refConfig as any).$ref) {
                        const refId = (refConfig as any).$ref.split("/").pop();
                        let referencedSchema = apiDataSchemas.find((item) => item.id === +refId)?.jsonSchema || {};
                        
                        // 应用 x-apifox-overrides 覆盖配置
                        if ((refConfig as any)["x-apifox-overrides"] && (referencedSchema as any).properties) {
                            const overrides = (refConfig as any)["x-apifox-overrides"];
                            referencedSchema = {
                                ...referencedSchema,
                                properties: {
                                    ...(referencedSchema as any).properties,
                                    ...overrides
                                }
                            };
                        }
                        
                        // 合并引用 schema 的 properties
                        if ((referencedSchema as any).properties) {
                            properties = { ...properties, ...(referencedSchema as any).properties };
                        }
                        // 合并 required
                        if ((referencedSchema as any).required) {
                            required = [...required, ...(referencedSchema as any).required];
                        }
                        // 合并 orders
                        if ((referencedSchema as any)["x-apifox-orders"]) {
                            orders = [...orders, ...(referencedSchema as any)["x-apifox-orders"]];
                        }
                    }
                }
            }

            const keys = [...new Set([...orders, ...Object.keys(properties)])].filter(k => !k.startsWith('01')).sort()
            for (const key of keys) {
                const property = properties[key];
                if (!property || property["x-tmp-pending-properties"]) continue;

                const title = property.title || "";
                const description = property.description || "";
                const comment = title || description; // 优先使用 title，没有则使用 description
                const isRequired = required.includes(key);
                const typeStr = buildPropertyType(property, containsChinese(key) ? cnToPinyin(key) : key, faceName);

                resStr += `${comment ? `\n    /** ${comment} */` : ''}${'\n'}     ${nameFormatter(key)}${isRequired ? "" : "?"}: ${property.type === "array" && (property.$ref || property.items.$ref) ? typeStr + "[]" : typeStr};`;
            }
            return resStr;
        } else if (type === "array") {
            const { items } = obj;
            return schemaTypes.includes(items.type) || items?.$ref
                ? output(items, faceName)
                : buildParameters(items);
        } else {
            return buildParameters(obj as unknown as ApiDetailParametersQuery);
        }
    };

    // 根据不同的schema类型生成对应的TypeScript类型定义
    if (jsonSchema.type === "null") {
        // 处理null类型
        res = `export type ${interfaceName} = null`;
    } else if (jsonSchema.type === "object" || jsonSchema.$ref) {
        // 处理对象类型或引用类型，生成interface
        const outputContent = output(jsonSchema, interfaceName);
        // 如果 output 返回空内容，说明是空对象，使用 type = object 避免 ESLint 空 interface 警告
        if (!outputContent.trim()) {
            res = `export type ${interfaceName} = object${'\n'}`;
        } else {
            res = `export interface ${interfaceName} {
        ${outputContent}
        ${buildTypeExtension()}
      }
    `;
        }
    } else {
        // 处理其他类型，生成type alias
        const baseType = buildPropertyType(jsonSchema, "item", interfaceName);
        res = `export type ${interfaceName} = ${jsonSchema.type === "array" ? baseType + "[]" : baseType}
    `;
    }

    function buildPropertyType(
        property: Record<string, any>,
        key: string,
        faceName: string
    ): string {
        if (isSchema(property)) {
            if (property.type === "array") {
                if (isSchema(property.items)) {
                    if (property.$ref || property.items.$ref) {
                        const refId = (property.$ref || property.items.$ref).split("/").pop() || "";
                        if (processedRefs[refId]) {
                            return `${processedRefs[refId]}`;
                        } else {
                            processedRefs[refId] = `${faceName}${firstToLocaleUpperCase(key)}`;
                            const schema = apiDataSchemas.find((item) => item.id === +refId)?.jsonSchema || {};
                            return `${buildChildrenOutput(schema, `${faceName}${firstToLocaleUpperCase(key)}`)}`;
                        }
                    } else {
                        return `${buildChildrenOutput(property, `${faceName}${firstToLocaleUpperCase(key)}`)}`;
                    }
                } else {
                    if (Array.isArray(property.items.type) && property.items.type.some((item: string) => item === 'object' || item === 'array')) {
                        if ('$ref' in (property.items as Record<string, any>).properties) {
                            return buildPropertyType((property.items as Record<string, any>).properties, containsChinese(key) ? cnToPinyin(key) : key, faceName);
                        } else {
                            const otherType = property.items.type.filter((item: string) => item !== 'object' && item !== 'array').join(' | ');
                            property.items.type = property.items.type.includes('object') ? 'object' : 'array';
                            return `${buildChildrenOutput(property.items, `${faceName}${firstToLocaleUpperCase(key)}`)} | ${otherType}`;
                        }
                    }
                    return `${buildParameters(property as ApiDetailParametersQuery)}`;
                }
            } else {
                if (property?.$ref) {
                    const refId = property.$ref.split("/").pop();
                    if (!refId) {
                        return "any";
                    }
                    if (refId in processedRefs) {
                        return processedRefs[refId];
                    }
                    processedRefs[refId] = `${faceName}${firstToLocaleUpperCase(key)}`;
                    const schema = apiDataSchemas.find((item) => item.id === +refId)?.jsonSchema || {};
                    return `${buildChildrenOutput(schema, `${faceName}${firstToLocaleUpperCase(key)}`)}`;
                }
                return `${buildChildrenOutput(property, `${faceName}${firstToLocaleUpperCase(key)}`)}`;
            }
        } else {
            return buildParameters(property as unknown as ApiDetailParametersQuery);
        }
    }

    function buildChildrenOutput(
        childrenObj: Record<string, any>,
        childrenFaceName: string
    ): string {
        const type = childrenObj?.type || "any";
        const childrenInterface =
            type === "array" ? `${childrenFaceName}Item[]` : childrenFaceName;
        const childrenInterfaceName =
            type === "array" ? `${childrenFaceName}Item` : childrenFaceName;

        const getRefObj = (ref: string): Record<string, any> => {
            const refId = ref.split("/").pop() || "";

            if (!refId || refId in processedRefs) {
                return {};
            }
            processedRefs[refId] = childrenInterfaceName;
            // if (!refId || processedRefs.has(refId)) return {};
            // processedRefs.add(refId);
            const schema =
                apiDataSchemas.find((item) => item.id === +refId)?.jsonSchema || {};
            return schema;
        };

        const noRef =
            childrenObj?.$ref || childrenObj?.items?.$ref
                ? getRefObj(childrenObj.$ref || childrenObj?.items?.$ref)
                : childrenObj;
        
        // 检查是否为空对象（没有 properties 或 properties 为空）
        const isEmptyObject = !noRef.properties || Object.keys(noRef.properties).length === 0;
        if (isEmptyObject && type !== "string") {
            // 空对象直接返回 { [key: string]: any }，不生成单独的 interface
            return "{ [key: string]: any }";
        }

        let description = noRef.title || noRef.description ? `\n/** ${noRef.title || ""}${noRef.description || ""} */` : `\n /** ${childrenFaceName} */`
        let childrenResStr =
            type === "string"
                ? `${description}${'\n'}export type ${childrenInterfaceName} = ${buildParameters(noRef as unknown as ApiDetailParametersQuery)}${'\n'}`
                : `${description}${'\n'}export interface ${childrenInterfaceName} {${'\n'}    ${output(noRef, childrenFaceName)}${'\n'}    ${buildTypeExtension()}${'\n'}}${'\n'}`;
        childrenRes += childrenResStr;

        return childrenInterface;
    }

    return res + childrenRes;
}

function containsChinese(str: string) {
    const regex = /[\u4E00-\u9FFF]/;
    return regex.test(str);
}

// 辅助函数：构建接口路径参数
export function buildInterfacePathQuery(
    apiFunctionName: string,
    apiDetailItem: Partial<ApiDetailListData>,
    pathParams: ApiDetailParametersQuery[]
): string {
    if (pathParams.length <= 1) return "";
    const description = `${apiDetailItem.tags?.join("/")}/${apiDetailItem.name}--接口路径参数`
    try {
        return `${'\n'}/**${'\n'} * @description ${description.replace(/\n/g, '；')}${'\n'} * @url ${apiDetailItem.method?.toLocaleUpperCase()} ${apiDetailItem.path}${'\n'}*/${'\n'}export interface ${apiFunctionName}PathQuery {${'\n'}    ${pathParams.map((cur) => formatParameter(cur)).join("\n")}${'\n'}    ${buildTypeExtension()}${'\n'}}${'\n'}`;
    } catch (error) {
        return `${'\n'}/**${'\n'} * @description ${description.replace(/\n/g, '；')}${'\n'} * @url ${apiDetailItem.method?.toLocaleUpperCase()} ${apiDetailItem.path}${'\n'}*/${'\n'}export type ${apiFunctionName}PathQuery = any${'\n'}`;
    }
}

// 辅助函数：构建接口响应参数
export function buildInterfaceResponse(
    apiFunctionName: string,
    apiDetailItem: Partial<ApiDetailListData>,
    responses: any
): string {
    const description = `${apiDetailItem.tags?.join("/")}/${apiDetailItem.name}--接口返回值`
    return `${'\n'}/**${'\n'} * @description ${description.replace(/\n/g, '；')}${'\n'} * @url ${apiDetailItem.method?.toLocaleUpperCase()} ${apiDetailItem.path}${'\n'} */${'\n'}${buildParametersSchema(extractReturnData(apiDetailItem.responses || []), `${apiFunctionName}Res`)}${'\n'}`;
}
export function extractReturnData(
    responses: ApiDetailListData["responses"] | []
) {
    const setting: ConfigurationInformation =
        getWorkspaceStateUtil().get("AutoApiGen.setting")?.data || {};
    const returnDataKey: string[] = (setting.configInfo?.axiosReturnKey || "")
        .split(",")
        .filter((item: string) => item);
    const defaultResponses =
        responses?.find((res) => +res.code === 200) || undefined;
    const apiDataSchemas: ApiDataSchemasItem[] =
        getWorkspaceStateUtil().get("AutoApiGen.ApiDataSchemas")?.data || [];
    
    // 定义 resolveSchemaRef 函数
    function resolveSchemaRef(
        jsonSchema: Record<string, any>,
        apiDataSchemas: ApiDataSchemasItem[],
        depth = 0,
        maxDepth = 3
    ): Record<string, any> {
        // 检查最大递归深度
        if (depth >= maxDepth) {
            console.warn(`达到最大递归深度: ${maxDepth}`);
            return jsonSchema; // 返回当前 schema 而不再深入
        }

        // 处理直接的 $ref 引用（保持原有逻辑）
        if (jsonSchema?.$ref) {
            const refId = jsonSchema.$ref.split("/").pop();
            const schema =
                apiDataSchemas.find((item) => item.id === +refId)?.jsonSchema || {};

            // 如果引用的 schema 也有 $ref，递归查找
            if ((schema as { $ref?: string })?.$ref) {
                return resolveSchemaRef(schema, apiDataSchemas, depth + 1, maxDepth);
            }

            return schema; // 找到的 schema 没有 $ref，返回该 schema
        }

        // 处理 x-apifox-refs 结构
        if (jsonSchema?.["x-apifox-refs"]) {
            const apifoxRefs = jsonSchema["x-apifox-refs"] as Record<string, any>;
            const apifoxOrders = jsonSchema["x-apifox-orders"] || [];
            const resolvedSchema = { ...jsonSchema };
            
            // 初始化 properties 如果不存在
            if (!resolvedSchema.properties) {
                resolvedSchema.properties = {};
            }

            // 遍历 x-apifox-refs 中的每个引用
            for (const [refKey, refConfig] of Object.entries(apifoxRefs)) {
                if (refConfig && typeof refConfig === 'object' && (refConfig as any).$ref) {
                    // 解析引用
                    const refId = (refConfig as any).$ref.split("/").pop();
                    let referencedSchema = apiDataSchemas.find((item) => item.id === +refId)?.jsonSchema || {};
                    
                    // 递归解析引用的 schema
                    if ((referencedSchema as any).$ref || (referencedSchema as any)["x-apifox-refs"]) {
                        referencedSchema = resolveSchemaRef(referencedSchema, apiDataSchemas, depth + 1, maxDepth);
                    }

                    // 应用 x-apifox-overrides 覆盖配置
                    if ((refConfig as any)["x-apifox-overrides"] && (referencedSchema as any).properties) {
                        const overrides = (refConfig as any)["x-apifox-overrides"];
                        referencedSchema = {
                            ...referencedSchema,
                            properties: {
                                ...(referencedSchema as any).properties,
                                ...Object.keys(overrides).reduce((acc, key) => {
                                    if ((referencedSchema as any).properties[key]) {
                                        acc[key] = {
                                            ...(referencedSchema as any).properties[key],
                                            ...overrides[key]
                                        };
                                    } else {
                                        acc[key] = overrides[key];
                                    }
                                    return acc;
                                }, {} as Record<string, any>)
                            }
                        };
                    }

                    // 将解析后的 schema 的 properties 合并到当前 schema
                    if ((referencedSchema as any).properties) {
                        Object.assign(resolvedSchema.properties, (referencedSchema as any).properties);
                    }
                }
            }

            // 根据 x-apifox-orders 重新排序 properties
            if (apifoxOrders.length > 0) {
                const orderedProperties: Record<string, any> = {};
                
                // 首先按照 orders 的顺序添加属性
                apifoxOrders.forEach((key: string) => {
                    if (resolvedSchema.properties[key]) {
                        orderedProperties[key] = resolvedSchema.properties[key];
                    }
                });
                
                // 然后添加不在 orders 中的其他属性
                Object.keys(resolvedSchema.properties).forEach(key => {
                    if (!apifoxOrders.includes(key)) {
                        orderedProperties[key] = resolvedSchema.properties[key];
                    }
                });
                
                resolvedSchema.properties = orderedProperties;
            }

            // 清理 x-apifox-refs 和 x-apifox-orders，因为已经解析完成
            delete resolvedSchema["x-apifox-refs"];
            delete resolvedSchema["x-apifox-orders"];

            return resolvedSchema;
        }

        // 递归处理 properties 中的引用
        if (jsonSchema.properties) {
            const resolvedSchema = { ...jsonSchema };
            resolvedSchema.properties = {};
            
            for (const [key, value] of Object.entries(jsonSchema.properties)) {
                if (value && typeof value === 'object' && ((value as any).$ref || (value as any)["x-apifox-refs"])) {
                    resolvedSchema.properties[key] = resolveSchemaRef(value as Record<string, any>, apiDataSchemas, depth + 1, maxDepth);
                } else {
                    resolvedSchema.properties[key] = value;
                }
            }
            
            return resolvedSchema;
        }

        return jsonSchema; // 没有引用，直接返回原始 schema
    }
    
    let finalJsonSchema: Record<string, any> = defaultResponses?.jsonSchema || {};
    if (defaultResponses && defaultResponses.jsonSchema) {
        const jsonSchema = defaultResponses.jsonSchema as unknown as Record<
            string,
            any
        >;
        
        finalJsonSchema = resolveSchemaRef(jsonSchema, apiDataSchemas);
    }
    if (returnDataKey.length) {
        let dataKeys = [...new Set([...(finalJsonSchema["x-apifox-orders"] || []), ...Object.keys(finalJsonSchema.properties || {})])].sort()
        if (
            returnDataKey.every((item) =>
                (dataKeys).includes(item)
            )
        ) {
            dataKeys = returnDataKey;
            finalJsonSchema.properties = returnDataKey.reduce(
                (acc, cur) => {
                    acc[cur] = finalJsonSchema.properties[cur];
                    return acc;
                },
                {} as Record<string, any>
            );
        }
        if (returnDataKey.length === 1 && finalJsonSchema.properties && finalJsonSchema.properties[returnDataKey[0]]) {
            const returnSchema = finalJsonSchema.properties[returnDataKey[0]] || {};
            // 使用 resolveSchemaRef 函数来正确处理所有类型的引用，包括 $ref 和 x-apifox-refs
            if (returnSchema?.$ref || returnSchema?.["x-apifox-refs"]) {
                finalJsonSchema = resolveSchemaRef(returnSchema, apiDataSchemas);
            } else {
                finalJsonSchema = returnSchema;
            }
        }
    }
    return {
        ...defaultResponses,
        jsonSchema: finalJsonSchema,
    };
}

// 辅助函数：构建函数描述
export function buildDescription(
    apiFunctionName: string,
    apiDetailItem: Partial<ApiDetailListData>
): string {
    const description = `${apiDetailItem.tags?.join("/")}/${apiDetailItem.name}`
    return `/**${'\n'} * @description ${description.replace(/\n/g, '；')}${'\n'} * @url ${apiDetailItem.method?.toLocaleUpperCase()} ${apiDetailItem.path}${'\n'} * @host https://app.apifox.com/link/project/${apiDetailItem.projectId}/apis/api-${apiDetailItem.id}${'\n'} */`;
}

// 辅助函数：构建函数签名
export function buildApiFunctionSignature(
    apiFunctionName: string,
    pathParams: ApiDetailParametersQuery[],
    queryParams: ApiDetailParametersQuery[],
    haveReqBody: boolean,
    apiMethod: string,
    isWx: boolean = false,
): string {
    const args = [];
    if (pathParams.length) {
        if (pathParams.length > 1) {
            args.push(`pathParams: Expand<${apiFunctionName}PathQuery>`);
        } else {
            args.push(
                `${pathParams[0].name}: ${buildParameters(pathParams[0])}`
            );
        }
    }
    if (queryParams.length) {
        args.push(`params: Expand<${apiFunctionName}Query>`);
    }
    if (!apiTypeCollection.includes(apiMethod || "get") && haveReqBody) {
        args.push(`data: Expand<${apiFunctionName}Body>`);
    }
    if (isWx) {
        args.push("config?: Expand<OtherRequestConfig>");
    } else {
        args.push("axiosConfig?: AxiosRequestConfig");
    }
    return isWx ? `export const ${apiFunctionName} = async (${args.join(", ")}) => {` : `export const ${apiFunctionName} = async (${args.join(", ")}): Promise<Expand<${apiFunctionName}Res>> => {`;
}

// 辅助函数：构建函数主体
export function buildApiFunctionBody(
    apiMethod: string,
    axiosAlias: string,
    apiPath: string,
    apiDetailParams: ApiDetailParametersQuery[],
    haveReqBody: boolean,
    queryParams: ApiDetailParametersQuery[],
    apiDetailItem: Partial<ApiDetailListData>
): string {
    const url = apiDetailParams.length
        ? `\`${apiPath}${queryParams.length ? "?${qs.stringify(params)}" : ""}\``
        : `'${apiDetailItem.path}'`;
    const bodyParams = apiTypeCollection.includes(apiMethod)
        ? ""
        : haveReqBody
            ? "data, "
            : `{}, `;
    const useProjectId = getWorkspaceStateUtil().get("AutoApiGen.setting")?.data.configInfo?.useProjectId || false;
    const axiosConfig = useProjectId ? `{...axiosConfig, projectId: ${apiDetailItem.projectId || 0}}` : `axiosConfig`;
    return `return ${axiosAlias}.${apiMethod}(${url}, ${bodyParams}${axiosConfig});`;
}

// 辅助函数：构建函数主体
export function buildWxApiFunctionBody(
    apiMethod: string,
    apiPath: string,
    apiFunctionName: string,
    haveReqBody: boolean,
    queryParams: ApiDetailParametersQuery[]
): string {
    let url = `\`${apiPath}\``
    let params = '{}'
    if (['get', 'delete'].includes(apiMethod.toLocaleLowerCase())) {
        params = queryParams.length ? 'params' : '{}'
    } else {
        if (queryParams) {
            url = `\`${apiPath}${queryParams.length ? "?${qs.stringify(params)}" : ""}\``
        }
        params = haveReqBody ? 'data' : '{}'
    }

    return `return http.${apiMethod.toLocaleLowerCase()}<${apiFunctionName}Res>(${url}, ${params}, config);\n}`;
}

export function customFunctionReturn(
    options: Record<string, any>,
    description: string,
    defaultFunction: string,
    apiFunctionName: string
) {
    const settingConfig: ProjectConfigInfo =
        getWorkspaceStateUtil().get("AutoApiGen.setting")?.data.configInfo || {};
    let customFun = defaultFunction;
    let extraFun = "";
    if (settingConfig.model === "custom" && settingConfig.customReturn) {
        try {
            const userCustomFun = eval(settingConfig.customReturn);
            if (userCustomFun) {
                customFun = userCustomFun
            }
        } catch (error: any) {
            FeedbackHelper.logErrorToOutput(
                `自定义返回函数执行失败, 请检查配置: ${error.message}`
            );
            throw new Error("自定义返回函数执行失败");
        }
    }
    if (settingConfig.model === "custom" && settingConfig.customExtraFunction) {
        try {
            const customExtra = eval(settingConfig.customExtraFunction);
            if (customExtra) {
                extraFun = customExtra;
            } else {
                FeedbackHelper.logErrorToOutput(
                    `${options.apiPath}(${options.apiMethod}):自定义拓展函数无返回值, 请检查配置`
                );
            }
        } catch (error: any) {
            FeedbackHelper.logErrorToOutput(
                `自定义拓展函数执行失败, 请检查配置: ${error.message}`
            );
            throw new Error("自定义拓展函数执行失败");
        }
    }

    let customDescription = description.split('\n')
    customDescription.splice(1, 0, ` * 自定义函数：use${apiFunctionName}`)
    const customFunStr = `\n\n${description}\n${customFun}${extraFun ? `\n  \n${customDescription.map(item => item.trim()).join('\n')}\n${extraFun}\n` : ''}`;
    return customFunStr;
}

export function getErrorInfo(error: any) {
    return `${error.name}: ${error.message}\n${error.stack}`;
}

// 辅助函数：格式化参数
export function formatParameter(param: ApiDetailParametersQuery): string {
    return `${param.description ? `/** ${param.description}${param.example ? ` example: ${param.example}` : ""} */` : ""}\n ${nameFormatter(param.name)}${param.required ? "" : "?"}: ${buildParameters(param)}`;
}
// 辅助函数：获取 Prettier 配置
export function getPrettierSetting(setting: ConfigurationInformation) {
    let defaultSetting = {
        semi: false,
        singleQuote: true,
        parser: "typescript",
    };
    try {
        return {
            ...defaultSetting,
            ...JSON.parse(setting.configInfo?.prettierSetting || "{}"),
        };
    } catch (error: any) {
        FeedbackHelper.logErrorToOutput(`请检查 Prettier 配置: ${error}`);
        return defaultSetting;
    }
}

// 辅助函数：获取所有接口名称
export function getAllInterfaceNames(
    apiDetailGather: ApiDetailGather[],
    allApiFunctionStr: string
) {
    return Array.from(
        new Set(
            apiDetailGather.flatMap((cur) =>
                [
                    cur.interfaceQueryName,
                    cur.interfacePathQueryName,
                    cur.interfaceBodyQueryName,
                    cur.interfaceResName,
                ].filter((item) => !!item && allApiFunctionStr.includes(item))
            )
        )
    )
        .sort()
        .join(",");
}

// 辅助函数：构建 API 文件头部
export function buildApiFunctionHead(
    allInterfaceName: string,
    axiosQuote: string,
    isNeedQs: boolean,
    rootPath: string,
    apiPath: string
) {
    const heardAnnotation = `/* eslint-disable @typescript-eslint/no-unused-vars */\n// @ts-nocheck: 忽略类型错误 系统工具生成`
    const settingConfig: ProjectConfigInfo =
        getWorkspaceStateUtil().get("AutoApiGen.setting")?.data.configInfo || {};
    if (settingConfig.model === "custom" && settingConfig.head) {
        const customHead = `${settingConfig.head}\nimport type { ${allInterfaceName} } from './interface';`;
        return `${heardAnnotation}\n${sortImports(customHead)}`;
    }
    if (settingConfig.model === "wx") {
        const requestDirPath = path.join(rootPath, 'request');
        const wxApiFileExists = path.join(requestDirPath, 'index.ts');
        const importPath = getRelativeImportPath(apiPath, wxApiFileExists)
        return `import { http } from "${importPath}";${'\n'}${isNeedQs ? "import qs from 'qs';" : ""}\nimport type { ${allInterfaceName} } from './interface';\ntype Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;`
    }
    return `${'\n'}${heardAnnotation}${'\n'}${isNeedQs ? "import qs from 'qs';" : ""}${'\n'}import type { AxiosRequestConfig } from 'axios';${'\n'}import type { ${allInterfaceName} } from './interface';${'\n'}${axiosQuote}${'\n'}type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;${'\n'}`;
}

let cachedPrettier: any | null = prettier;
let cachedPlugins = {
    prettierPluginSortImports,
    prettierPluginOrganizeImports
};

// 辅助函数：格式化代码
export async function formatCode(
    code: string,
    prettierSetting: Record<string, any>,
    codeType: string
) {
    try {
        if (!cachedPrettier) {
            FeedbackHelper.logErrorToOutput('Prettier not available, returning unformatted code', 'Warning');
            return code;
        }

        const extraPrettierSetting = {
            plugins: Object.values(cachedPlugins).filter(Boolean),
            importOrder: ["^@/(.*)$", "^[./]"],
            importOrderSeparation: true,
            importOrderSortSpecifiers: true,
        };

        const options = {
            ...prettierSetting,
            ...extraPrettierSetting,
            parser: "typescript",
        };

        const finallyCode = await cachedPrettier.format(code, options);
        return finallyCode
    } catch (error: any) {
        FeedbackHelper.logErrorToOutput(`Format code error: ${error.message}`, 'Error');
        // 如果格式化失败，尝试不使用插件重新格式化
        try {
            const fallbackOptions = {
                ...prettierSetting,
                parser: "typescript",
            };
            return cachedPrettier.format(code, fallbackOptions);
        } catch (fallbackError) {
            // 如果还是失败，返回原始代码
            return code;
        }
    }
}

// 辅助函数：更新已存在文件（备份、写入和恢复逻辑）
export async function updateExistingFiles(
    uri: vscode.Uri,
    item: ApiDetailGather,
    petterSetting: any,
    isInterface = false
) {
    try {
        // 读取文件内容
        let fileContent = fsExtra.readFileSync(uri.fsPath, "utf-8");
        // 要查找和删除的函数名
        const functionName = item.apiFunctionName;
        const responseTypes = [
            item.interfaceResName,
            item.interfaceQueryName,
            item.interfacePathQueryName,
            item.interfaceBodyQueryName,
        ].filter(Boolean);

        // 新的函数内容
        const code = isInterface
            ? item.apiInterfaceContext
            : item.apiFunctionContext;

        // 检查是否需要导入 qs
        const needQs = code.includes('${qs.stringify');
        const hasQsImport = fileContent.includes('import qs from');
        if (needQs && !hasQsImport) {
            // 在文件开头添加 qs 导入
            const qsImport = 'import qs from "qs";\n';
            // 找到第一个导入语句的位置
            const firstImportIndex = fileContent.search(/^import/m);
            if (firstImportIndex >= 0) {
                // 在第一个导入语句前插入
                fileContent = fileContent.slice(0, firstImportIndex) + qsImport + fileContent.slice(firstImportIndex);
            } else {
                // 如果没有找到导入语句，就在文件开头插入
                fileContent = qsImport + fileContent;
            }
        }

        switch (isInterface) {
            case true:
                responseTypes.forEach((typeName) => {
                    fileContent = removeTypeDefinitions(fileContent, typeName);
                });
                break;
            default:
                // 删除与 `functionName` 相关的导入项
                const importInterfacePattern = new RegExp(
                    `import\\s+type\\s+\\{([^}]*)\\}\\s+from\\s+['"]\\.\\/interface['"];?`,
                    "g"
                );

                fileContent = removeTypeDefinitions(fileContent, functionName);
                // 3. 更新导入语句中的类型引用
                fileContent = fileContent.replace(
                    importInterfacePattern,
                    (_: any, typeContent: string) => {
                        // 将导入的类型转换为数组并移除指定的 `functionName` 类型
                        const existingTypes = typeContent
                            .split(",")
                            .map((type: string) => type.trim())
                            .filter((type: string) => type && type !== functionName);
                        // 合并新的类型
                        const updatedTypes = Array.from(
                            new Set([...existingTypes, ...responseTypes])
                        ).sort();

                        // 返回更新后的导入语句
                        return `import type { ${updatedTypes.join(", ")} } from './interface';`;
                    }
                );

                // 4. 检查如果导入语句不存在则添加
                if (!importInterfacePattern.test(fileContent)) {
                    const newImportStatement = `import type { ${responseTypes.join(", ")} } from './interface';\n`;
                    fileContent = newImportStatement + fileContent;
                }
                break;
        }
        fileContent = fileContent + `\n${code}`;
        const newFunctionCode = await formatCode(
            fileContent,
            petterSetting,
            isInterface ? "函数" : "接口定义"
        );

        try {
            fsExtra.writeFileSync(uri.fsPath, newFunctionCode, "utf-8");
        } catch (error) {
            throw error;
        }
    } catch (error) {
        throw new Error(error as string);
    }
}
/**
 * 从文件内容中移除指定类型的定义。
 *
 * @param fileContent 文件内容字符串
 * @param typeName 要移除的类型名称
 * @returns 移除类型定义后的新文件内容字符串
 */
function removeTypeDefinitions(fileContent: string, typeName: string) {
    const lines = fileContent.split("\n");
    const upperTypeName = firstToLocaleUpperCase(typeName);

    // 构建正则表达式，匹配任意前缀 + typeName 或 upperTypeName
    const functionPattern = new RegExp(
        `^export (const|function)\\s+(?:use|useOption|\\w+)?(${typeName}|${upperTypeName})\\b`
    );

    // 初始化状态机变量
    let isInTargetBlock = false; // 当前行是否在要删除的块中
    let outputLines: string[] = []; // 要保留的行
    let buffer: string[] = []; // 暂存注释和类型定义部分

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // 检查当前行是否是注释行或者空行
        const isCommentLine =
            line.startsWith("/**") ||
            line.startsWith("*") ||
            line.startsWith("//") ||
            !line.length;

        // 检查是否进入目标类型定义块
        if (
            !isInTargetBlock &&
            (line.startsWith(`export type ${typeName}`) ||
                line.startsWith(`export interface ${typeName}`) ||
                functionPattern.test(line))
        ) {
            buffer = []; // 清空缓冲区（删除前置注释）
            // 对于 export type xxx = yyy 这种单行类型定义，直接跳过这一行即可
            if (line.startsWith(`export type ${typeName}`)) {
                // 单行类型定义，不需要进入块状态
                continue;
            }
            isInTargetBlock = true; // 标记进入目标块
            continue; // 跳过当前行（不加入输出）
        }

        // 如果在目标块中，检查是否达到块的结尾
        if (isInTargetBlock) {
            const isEndOfBlock = line.endsWith("}") || line.endsWith("};");
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

    const newFileContent = outputLines.join("\n");
    return newFileContent;
}

// 将代码中的import语句放到最前面，并且排序
export function sortImports(code: string) {
    const codeArr = code.split('\n');
    const importArr = codeArr.filter(line => line.startsWith('import'));
    const otherArr = codeArr.filter(line => !line.startsWith('import'));
    const sortedImportArr = importArr.sort();
    // const importPattern = /import\s+[\w{},\s]*\s?from\s*['"](.*?)['"];/g;
    // const importStatements = code.match(importPattern) || [];
    // // const sortedImportStatements = importStatements.sort();
    // const otherCode = code.replace(importPattern, '');
    return sortedImportArr.join('\n') + '\n' + otherArr.join('\n');
}

/**
 * 备份并替换文件内容
 *
 * @param uri 要备份和替换的文件URI
 * @param content 要写入的新内容
 * @returns 异步操作完成
 * @throws 如果文件更新失败，则抛出错误
 */
export async function backupAndReplace(uri: vscode.Uri, content: string) {
    const backupUri = uri.with({ path: uri.fsPath + ".bak" });
    await vscode.workspace.fs.rename(uri, backupUri);
    try {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content));
        await vscode.workspace.fs.delete(backupUri);
    } catch (error) {
        const backupExists = await fsExtra.pathExists(backupUri.fsPath);
        if (backupExists) {
            await vscode.workspace.fs.rename(backupUri, uri);
        }
        FeedbackHelper.logErrorToOutput(
            `文件更新失败 ${uri.fsPath}: ${error || "未知错误"}`
        );
        throw new Error(`文件更新失败: ${error || "未知错误"}`);
    }
}

/**
 * 创建文件并写入内容
 * @param filePath 文件路径
 * @param content 文件内容
 */
async function createFileWithFsExtra(filePath: string, content: string): Promise<void> {
    const normalizedPath = path.resolve(filePath); // 确保路径格式统一，防止路径中包含空格或特殊字符造成问题
    await fsExtra.ensureDir(path.dirname(normalizedPath)); // 确保父目录存在
    await fsExtra.writeFile(normalizedPath, content, 'utf8'); // 写入文件
}

/**
 * 创建新文件（替换 vscode.workspace.fs）
 * @param apiPath API 文件路径
 * @param interfacePath 接口文件路径
 * @param funCode API 函数代码
 * @param interfaceCode 接口定义代码
 */
export async function createNewFiles(
    apiPath: vscode.Uri,
    interfacePath: vscode.Uri,
    funCode: string,
    interfaceCode: string
): Promise<void> {
    await createFileWithFsExtra(apiPath.fsPath, funCode);
    await createFileWithFsExtra(interfacePath.fsPath, interfaceCode);
}

// 检查并更新文件内容
export async function updateFileContent(
    uri: vscode.Uri,
    newContent: string,
    contentType: "function" | "interface"
): Promise<string> {
    const fileContentBuffer = await vscode.workspace.fs.readFile(uri);
    const fileContent = fileContentBuffer.toString();

    const contentExists =
        contentType === "function"
            ? hasFunctionDefinition(fileContent, newContent)
            : hasInterfaceDefinition(fileContent, newContent);

    if (contentExists) {
        return replaceExistingContent(fileContent, newContent, contentType);
    } else {
        return fileContent + "\n" + newContent;
    }
}

// 检查函数定义是否存在
export function hasFunctionDefinition(
    fileContent: string,
    functionContent: string
): boolean {
    const functionName = extractFunctionName(functionContent);
    const regex = new RegExp(`export const ${functionName}\\s*=`, "g");
    return regex.test(fileContent);
}

// 检查接口定义是否存在
export function hasInterfaceDefinition(
    fileContent: string,
    interfaceContent: string
): boolean {
    const interfaceName = extractInterfaceName(interfaceContent);
    const regex = new RegExp(`export interface ${interfaceName}\\s*{`, "g");
    return regex.test(fileContent);
}

// 替换现有内容
export function replaceExistingContent(
    fileContent: string,
    newContent: string,
    contentType: "function" | "interface"
): string {
    const name =
        contentType === "function"
            ? extractFunctionName(newContent)
            : extractInterfaceName(newContent);
    const regex = new RegExp(
        `export ${contentType} ${name}[^]*?(?=export|$)`,
        "g"
    );
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

/**
 * 生成文件 A 中导入文件 B 的相对路径
 * @param filePathA 文件 A 的绝对路径
 * @param filePathB 文件 B 的绝对路径
 * @returns 返回适用于 import 的相对路径
 */
export function getRelativeImportPath(filePathA: string, filePathB: string): string {
    // 确保路径格式统一，防止路径中包含空格或特殊字符造成问题
    const normalizedFilePathA = filePathA.split(path.sep).join('/').split('/').filter(Boolean).join('/');
    const normalizedFilePathB = filePathB.split(path.sep).join('/').split('/').filter(Boolean).join('/');

    // 计算相对路径
    let relativePath = path.relative(path.dirname(normalizedFilePathA), normalizedFilePathB);
    relativePath = relativePath.split(path.sep).filter(Boolean).join('/');
    // 确保路径适合 import 语句
    if (!relativePath.startsWith('.') && !relativePath.startsWith('/')) {
        relativePath = './' + relativePath;
    }

    // 移除文件扩展名（仅限 .ts 或 .js 文件，其他扩展名按需调整）
    return relativePath.replace(/\.[tj]s$/, '');
}

/**
 * 生成类型拓展
 * @return 根据配置是否开启类型拓展，返回："[key: string]: any" || ""
 */
export function buildTypeExtension(): string {
    const useTypeExtension = getWorkspaceStateUtil().get("AutoApiGen.setting")?.data.configInfo?.useTypeExtension || false;
    return useTypeExtension ? "[key: string]: any" : "";
}
