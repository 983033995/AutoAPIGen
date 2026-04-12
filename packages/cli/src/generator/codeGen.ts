import path from "path";
import fs from "fs";
import prettier from "prettier";
import { firstToLocaleUpperCase, cnToPinyin } from "@zhangheteng/aag-core";
import type {
  ConfigFromModel,
  ApiDetailListData,
  ApiDataSchemasItem,
  ApiDetailParametersQuery,
  apiModelType,
} from "@zhangheteng/aag-core";

const apiTypeCollection = ["get", "delete", "head", "options"];

// ─── State (injected per-run, no vscode dependency) ───────────────────────────

let _config: ConfigFromModel = {} as ConfigFromModel;
let _detailList: ApiDetailListData[] = [];
let _schemas: ApiDataSchemasItem[] = [];

export function initCodeGenContext(
  config: ConfigFromModel,
  detailList: ApiDetailListData[],
  schemas: ApiDataSchemasItem[],
) {
  _config = config;
  _detailList = detailList;
  _schemas = schemas;
}

// ─── Utility functions (ported from src/core/create/utils.ts) ─────────────────

function buildTypeExtension(): string {
  return _config.useTypeExtension ? "[key: string]: any" : "";
}

function nameFormatter(name: string): string {
  return /[^a-zA-Z]/.test(name) ? `"${name}"` : name;
}

export function convertToTemplateString(
  p: string,
  pathParams: ApiDetailParametersQuery[],
): string {
  const usePathParamsPrefix = pathParams.length > 1;
  return p.replace(/{(\w+)}/g, (_, varName) => {
    const templateVar = usePathParamsPrefix ? `pathParams.${varName}` : varName;
    return p.includes(`\${${templateVar}}`)
      ? `{${varName}}`
      : `\${${templateVar}}`;
  });
}

export function extractVariableName(importStatement: string): string | null {
  const patterns = [
    /import\s+([a-zA-Z_$][\w$]*)\s+from\s+['"][^'"]+['"]/,
    /import\s+([a-zA-Z_$][\w$]*)\s+as\s+([a-zA-Z_$][\w$]*)\s+from\s+['"][^'"]+['"]/,
    /const\s+([a-zA-Z_$][\w$]*)\s*=\s*require\s*\(\s*['"][^'"]+['"]\s*\)/,
  ];
  for (const pattern of patterns) {
    const match = importStatement.match(pattern);
    if (match) return match[1] || match[2] || null;
  }
  return null;
}

export function buildParameters(parameters: ApiDetailParametersQuery): string {
  const schema = parameters?.schema || undefined;
  const typeMap: Record<string, () => string> = {
    "date-time": () => "Date",
    date: () => "Date",
    string: () => {
      if (parameters?.enum)
        return parameters.enum.map((item: any) => `'${item}'`).join(" | ");
      return "string";
    },
    integer: () => "number",
    int64: () => "number",
    int32: () => "number",
    number: () => "number",
    boolean: () => "boolean",
    array: () => {
      if (!schema && !parameters?.items) return "any[]";
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

function formatParameter(param: ApiDetailParametersQuery): string {
  return `${param.description ? `/** ${param.description}${param.example ? ` example: ${param.example}` : ""} */` : ""}\n ${nameFormatter(param.name)}${param.required ? "" : "?"}: ${buildParameters(param)}`;
}

export function buildInterfaceQuery(
  apiFunctionName: string,
  apiDetailItem: Partial<ApiDetailListData>,
  queryParams: ApiDetailParametersQuery[],
): string {
  if (!queryParams.length) return "";
  const description = `${apiDetailItem.tags?.join("/")}/${apiDetailItem.name}--接口请求Query参数`;
  try {
    return `\n/**\n * @description ${description.replace(/\n/g, "；")}\n * @url ${apiDetailItem.method?.toLocaleUpperCase()} ${apiDetailItem.path}\n */\nexport interface ${apiFunctionName}Query {\n    ${queryParams.map((cur) => formatParameter(cur)).join("\n")}\n    ${buildTypeExtension()}\n}\n`;
  } catch {
    return `\nexport type ${apiFunctionName}Query = any\n`;
  }
}

export function buildInterfacePathQuery(
  apiFunctionName: string,
  apiDetailItem: Partial<ApiDetailListData>,
  pathParams: ApiDetailParametersQuery[],
): string {
  if (pathParams.length <= 1) return "";
  const description = `${apiDetailItem.tags?.join("/")}/${apiDetailItem.name}--接口路径参数`;
  try {
    return `\nexport interface ${apiFunctionName}PathQuery {\n    ${pathParams.map((cur) => formatParameter(cur)).join("\n")}\n    ${buildTypeExtension()}\n}\n`;
  } catch {
    return `\nexport type ${apiFunctionName}PathQuery = any /* ${description} */\n`;
  }
}

export function buildInterfaceBody(
  apiFunctionName: string,
  apiDetailItem: Partial<ApiDetailListData>,
  haveReqBody: boolean,
): string {
  if (!haveReqBody) return "";
  const description = `${apiDetailItem.tags?.join("/")}/${apiDetailItem.name}--接口请求Body参数`;
  try {
    return `\n/**\n * @description ${description.replace(/\n/g, "；")}\n * @url ${apiDetailItem.method?.toLocaleUpperCase()} ${apiDetailItem.path}\n */\n${buildParametersSchema(apiDetailItem.requestBody || {}, `${apiFunctionName}Body`)}\n`;
  } catch {
    return `\nexport type ${apiFunctionName}Body = any\n`;
  }
}

export function buildParametersSchema(
  configObj: Record<string, any>,
  interfaceName: string,
): string {
  if (!configObj) {
    return `export type ${interfaceName} = object;\n`;
  } else if (configObj.jsonSchema) {
    return transformSchema(configObj.jsonSchema, interfaceName);
  } else {
    const bodyParameters: any[] = configObj.parameters || [];
    if (bodyParameters.length === 0)
      return `export type ${interfaceName} = object;\n`;
    const bodyParametersReturnString = bodyParameters.reduce((acc, cur) => {
      return (
        acc +
        `${cur.description || cur.example ? `/** ${cur.description.replace(/\n/g, " ")}${cur.example ? `  example: ${cur.example}` : ""} */` : ""}\n    ${nameFormatter(cur.name)}${cur.required ? "" : "?"}: ${buildParameters(cur)}\n`
      );
    }, "");
    return `export interface ${interfaceName} {\n    ${bodyParametersReturnString}    ${buildTypeExtension()}\n}\n`;
  }
}

export function transformSchema(
  jsonSchema: Record<string, any>,
  interfaceName: string,
): string {
  let res = "";
  let childrenRes = "";
  const apiDataSchemas = _schemas;
  const schemaTypes = ["object", "array"];
  const processedRefs: Record<number | string, any> = {};
  const processedInterfaces = new Set<string>();

  const isSchema = (propertiesObj: Record<string, any>) =>
    schemaTypes.includes(propertiesObj?.type || "any") || propertiesObj?.$ref;

  const output = (obj: Record<string, any>, faceName: string): string => {
    if (obj.$ref) {
      const refId = obj.$ref.split("/").pop();
      if (!refId || refId in processedRefs) return "";
      processedRefs[refId] = faceName;
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

      if (apifoxRefs && Object.keys(apifoxRefs).length > 0) {
        for (const [, refConfig] of Object.entries(apifoxRefs)) {
          if (
            refConfig &&
            typeof refConfig === "object" &&
            (refConfig as any).$ref
          ) {
            const refId = (refConfig as any).$ref.split("/").pop();
            let referencedSchema =
              apiDataSchemas.find((item) => item.id === +refId)?.jsonSchema ||
              {};
            if ((referencedSchema as any).properties) {
              properties = {
                ...properties,
                ...(referencedSchema as any).properties,
              };
            }
            if ((referencedSchema as any).required) {
              required = [...required, ...(referencedSchema as any).required];
            }
          }
        }
      }

      const keys = [...new Set([...orders, ...Object.keys(properties)])]
        .filter((k) => !k.startsWith("01"))
        .sort();
      for (const key of keys) {
        const property = properties[key];
        if (!property || property["x-tmp-pending-properties"]) continue;
        const title = property.title || "";
        const description = property.description || "";
        const comment = title || description;
        const isRequired = required.includes(key);
        const containsCh = /[\u4E00-\u9FFF]/.test(key);
        const typeStr = buildPropertyType(
          property,
          containsCh ? cnToPinyin(key) : key,
          faceName,
        );
        resStr += `${comment ? `\n    /** ${comment} */` : ""}\n     ${nameFormatter(key)}${isRequired ? "" : "?"}: ${property.type === "array" && (property.$ref || property.items?.$ref) ? typeStr + "[]" : typeStr};`;
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

  if (jsonSchema.type === "null") {
    res = `export type ${interfaceName} = null`;
  } else if (jsonSchema.type === "object" || jsonSchema.$ref) {
    const outputContent = output(jsonSchema, interfaceName);
    if (!outputContent.trim()) {
      res = `export type ${interfaceName} = object\n`;
    } else {
      res = `export interface ${interfaceName} {\n    ${outputContent}\n    ${buildTypeExtension()}\n}\n`;
    }
  } else {
    const baseType = buildPropertyType(jsonSchema, "item", interfaceName);
    const needsArraySuffix =
      jsonSchema.type === "array" && !baseType.endsWith("[]");
    res = `export type ${interfaceName} = ${needsArraySuffix ? baseType + "[]" : baseType};\n`;
  }

  function buildPropertyType(
    property: Record<string, any>,
    key: string,
    faceName: string,
  ): string {
    if (isSchema(property)) {
      if (property.type === "array") {
        if (isSchema(property.items)) {
          if (property.$ref || property.items.$ref) {
            const refId =
              (property.$ref || property.items.$ref).split("/").pop() || "";
            if (processedRefs[refId]) return `${processedRefs[refId]}`;
            processedRefs[refId] = `${faceName}${firstToLocaleUpperCase(key)}`;
            const schema =
              apiDataSchemas.find((item) => item.id === +refId)?.jsonSchema ||
              {};
            return `${buildChildrenOutput(schema, `${faceName}${firstToLocaleUpperCase(key)}`)}`;
          }
          return `${buildChildrenOutput(property, `${faceName}${firstToLocaleUpperCase(key)}`)}`;
        }
        return `${buildParameters(property as ApiDetailParametersQuery)}`;
      } else {
        if (property?.$ref) {
          const refId = property.$ref.split("/").pop();
          if (!refId) return "any";
          if (refId in processedRefs) return processedRefs[refId];
          processedRefs[refId] = `${faceName}${firstToLocaleUpperCase(key)}`;
          const schema =
            apiDataSchemas.find((item) => item.id === +refId)?.jsonSchema || {};
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
    childrenFaceName: string,
  ): string {
    const type = childrenObj?.type || "any";
    const childrenInterface =
      type === "array" ? `${childrenFaceName}Item[]` : childrenFaceName;
    const childrenInterfaceName =
      type === "array" ? `${childrenFaceName}Item` : childrenFaceName;

    const getRefObj = (ref: string): Record<string, any> => {
      const refId = ref.split("/").pop() || "";
      if (!refId || refId in processedRefs) return {};
      processedRefs[refId] = childrenInterfaceName;
      return (
        apiDataSchemas.find((item) => item.id === +refId)?.jsonSchema || {}
      );
    };

    const noRef =
      childrenObj?.$ref || childrenObj?.items?.$ref
        ? getRefObj(childrenObj.$ref || childrenObj?.items?.$ref)
        : childrenObj;

    const schemaForInterface =
      type === "array" ? noRef.items || childrenObj.items : noRef;
    const isEmptyObject =
      !schemaForInterface?.properties ||
      Object.keys(schemaForInterface.properties).length === 0;
    if (isEmptyObject && type !== "string") {
      return type === "array"
        ? "{ [key: string]: any }[]"
        : "{ [key: string]: any }";
    }

    const descSource =
      schemaForInterface?.title ||
      schemaForInterface?.description ||
      noRef.title ||
      noRef.description;
    const description = descSource
      ? `\n/** ${schemaForInterface?.title || noRef.title || ""}${schemaForInterface?.description || noRef.description || ""} */`
      : `\n /** ${childrenFaceName} */`;

    const childrenResStr =
      type === "string"
        ? `${description}\nexport type ${childrenInterfaceName} = ${buildParameters(noRef as unknown as ApiDetailParametersQuery)}\n`
        : `${description}\nexport interface ${childrenInterfaceName} {\n    ${output(schemaForInterface, childrenInterfaceName)}\n    ${buildTypeExtension()}\n}\n`;
    childrenRes += childrenResStr;
    return childrenInterface;
  }

  return res + childrenRes;
}

export function buildInterfaceResponse(
  apiFunctionName: string,
  apiDetailItem: Partial<ApiDetailListData>,
  responses: any,
): string {
  const description = `${apiDetailItem.tags?.join("/")}/${apiDetailItem.name}--接口返回值`;
  return `\n/**\n * @description ${description.replace(/\n/g, "；")}\n * @url ${apiDetailItem.method?.toLocaleUpperCase()} ${apiDetailItem.path}\n */\n${buildParametersSchema(extractReturnData(apiDetailItem.responses || []), `${apiFunctionName}Res`)}\n`;
}

function extractReturnData(
  responses: ApiDetailListData["responses"] | [],
): any {
  const returnDataKey: string[] = (_config.axiosReturnKey || "")
    .split(",")
    .filter((s) => s);
  const defaultResponse = (responses as any[])?.find(
    (res) => +res.code === 200,
  );
  let finalJsonSchema: Record<string, any> = defaultResponse?.jsonSchema || {};

  if (defaultResponse?.jsonSchema) {
    finalJsonSchema = resolveSchemaRef(defaultResponse.jsonSchema, _schemas);
  }
  if (returnDataKey.length) {
    const dataKeys = [
      ...new Set([
        ...(finalJsonSchema["x-apifox-orders"] || []),
        ...Object.keys(finalJsonSchema.properties || {}),
      ]),
    ].sort();
    if (returnDataKey.every((item) => dataKeys.includes(item))) {
      finalJsonSchema.properties = returnDataKey.reduce(
        (acc, cur) => {
          acc[cur] = finalJsonSchema.properties[cur];
          return acc;
        },
        {} as Record<string, any>,
      );
    }
    if (
      returnDataKey.length === 1 &&
      finalJsonSchema.properties &&
      finalJsonSchema.properties[returnDataKey[0]]
    ) {
      const returnSchema = finalJsonSchema.properties[returnDataKey[0]] || {};
      if (returnSchema?.$ref || returnSchema?.["x-apifox-refs"]) {
        finalJsonSchema = resolveSchemaRef(returnSchema, _schemas);
      } else {
        finalJsonSchema = returnSchema;
      }
    }
  }
  return { ...defaultResponse, jsonSchema: finalJsonSchema };
}

function resolveSchemaRef(
  jsonSchema: Record<string, any>,
  apiDataSchemas: ApiDataSchemasItem[],
  depth = 0,
  maxDepth = 3,
): Record<string, any> {
  if (depth >= maxDepth) return jsonSchema;
  if (jsonSchema?.$ref) {
    const refId = jsonSchema.$ref.split("/").pop();
    const schema =
      apiDataSchemas.find((item) => item.id === +refId)?.jsonSchema || {};
    if ((schema as any)?.$ref)
      return resolveSchemaRef(schema, apiDataSchemas, depth + 1, maxDepth);
    return schema;
  }
  if (jsonSchema?.properties) {
    const resolvedSchema = {
      ...jsonSchema,
      properties: {} as Record<string, any>,
    };
    for (const [key, value] of Object.entries(jsonSchema.properties)) {
      if (
        value &&
        typeof value === "object" &&
        ((value as any).$ref || (value as any)["x-apifox-refs"])
      ) {
        resolvedSchema.properties[key] = resolveSchemaRef(
          value as Record<string, any>,
          apiDataSchemas,
          depth + 1,
          maxDepth,
        );
      } else {
        resolvedSchema.properties[key] = value;
      }
    }
    return resolvedSchema;
  }
  return jsonSchema;
}

export function buildDescription(
  apiFunctionName: string,
  apiDetailItem: Partial<ApiDetailListData>,
): string {
  const description = `${apiDetailItem.tags?.join("/")}/${apiDetailItem.name}`;
  return `/**\n * @description ${description.replace(/\n/g, "；")}\n * @url ${apiDetailItem.method?.toLocaleUpperCase()} ${apiDetailItem.path}\n * @host https://app.apifox.com/link/project/${apiDetailItem.projectId}/apis/api-${apiDetailItem.id}\n */`;
}

export function buildApiFunctionSignature(
  apiFunctionName: string,
  pathParams: ApiDetailParametersQuery[],
  queryParams: ApiDetailParametersQuery[],
  haveReqBody: boolean,
  apiMethod: string,
): string {
  const args = [];
  if (pathParams.length) {
    if (pathParams.length > 1) {
      args.push(`pathParams: Expand<${apiFunctionName}PathQuery>`);
    } else {
      args.push(`${pathParams[0].name}: ${buildParameters(pathParams[0])}`);
    }
  }
  if (queryParams.length) args.push(`params: Expand<${apiFunctionName}Query>`);
  if (!apiTypeCollection.includes(apiMethod || "get") && haveReqBody) {
    args.push(`data: Expand<${apiFunctionName}Body>`);
  }
  args.push("axiosConfig?: AxiosRequestConfig");
  return `export const ${apiFunctionName} = async (${args.join(", ")}): Promise<Expand<${apiFunctionName}Res>> => {`;
}

export function buildApiFunctionBody(
  apiMethod: string,
  axiosAlias: string,
  apiPath: string,
  apiDetailParams: ApiDetailParametersQuery[],
  haveReqBody: boolean,
  queryParams: ApiDetailParametersQuery[],
  apiDetailItem: Partial<ApiDetailListData>,
): string {
  const url = apiDetailParams.length
    ? `\`${apiPath}${queryParams.length ? "?${qs.stringify(params)}" : ""}\``
    : `'${apiDetailItem.path}'`;
  const bodyParams = apiTypeCollection.includes(apiMethod)
    ? ""
    : haveReqBody
      ? "data, "
      : "{}, ";
  const useProjectId = _config.useProjectId || false;
  const axiosConfig = useProjectId
    ? `{...axiosConfig, projectId: ${apiDetailItem.projectId || 0}}`
    : "axiosConfig";
  return `return ${axiosAlias}.${apiMethod}(${url}, ${bodyParams}${axiosConfig});`;
}

export function customFunctionReturn(
  options: Record<string, any>,
  description: string,
  defaultFunction: string,
  apiFunctionName: string,
): string {
  let customFun = defaultFunction;
  let extraFun = "";
  if (_config.model === "custom" && _config.customReturn) {
    try {
      const userCustomFun = eval(_config.customReturn);
      if (userCustomFun) customFun = userCustomFun;
    } catch (error: any) {
      throw new Error(`自定义返回函数执行失败: ${error.message}`);
    }
  }
  if (_config.model === "custom" && _config.customExtraFunction) {
    try {
      const customExtra = eval(_config.customExtraFunction);
      if (customExtra) extraFun = customExtra;
    } catch (error: any) {
      throw new Error(`自定义拓展函数执行失败: ${error.message}`);
    }
  }
  let customDescription = description.split("\n");
  customDescription.splice(1, 0, ` * 自定义函数：use${apiFunctionName}`);
  return `\n\n${description}\n${customFun}${extraFun ? `\n  \n${customDescription.map((i) => i.trim()).join("\n")}\n${extraFun}\n` : ""}`;
}

export function convertPathToPascalCase(p: string): string {
  p = p.replace(/^https?:\/\/[^/]+/, "");
  const parts = p.split("/").filter(Boolean);
  const lastThreeParts = parts.slice(-3);
  const formattedParts = lastThreeParts.map((part) => {
    let cleanedPart = part.replace(/[{${}]/g, "");
    cleanedPart = cleanedPart
      .split(/[-_]/g)
      .map((str, index) =>
        index > 0 ? str.charAt(0).toUpperCase() + str.slice(1) : str,
      )
      .join("");
    return cleanedPart.charAt(0).toUpperCase() + cleanedPart.slice(1);
  });
  return formattedParts.join("");
}

export async function formatCode(
  code: string,
  prettierSetting: Record<string, any>,
): Promise<string> {
  try {
    const options = { ...prettierSetting, parser: "typescript" };
    return await prettier.format(code, options);
  } catch {
    try {
      return await prettier.format(code, { parser: "typescript" });
    } catch {
      return code;
    }
  }
}

function getPrettierSetting(): Record<string, any> {
  const defaultSetting = {
    semi: false,
    singleQuote: true,
    parser: "typescript",
  };
  try {
    return {
      ...defaultSetting,
      ...JSON.parse(_config.prettierSetting || "{}"),
    };
  } catch {
    return defaultSetting;
  }
}

// ─── Build method template ────────────────────────────────────────────────────

function buildMethodTemplate(
  apiFunctionName: string,
  apiModel: apiModelType,
  apiDetailItem: Partial<ApiDetailListData>,
  axiosQuote: string,
  projectId: string | number,
): { fun: string; interFace: string } {
  try {
    const pathParams = apiDetailItem?.parameters?.path || [];
    const queryParams = apiDetailItem?.parameters?.query || [];
    const apiDetailParams: ApiDetailParametersQuery[] = [
      ...pathParams,
      ...queryParams,
    ];
    const haveReqBody = Boolean(
      (apiDetailItem?.requestBody?.parameters || []).length ||
        apiDetailItem?.requestBody?.jsonSchema,
    );
    const axiosAlias = extractVariableName(axiosQuote) || "";
    const apiPath = convertToTemplateString(
      apiDetailItem.path || "",
      pathParams,
    );
    const apiMethod = apiDetailItem.method || "get";
    const responses =
      apiDetailItem?.responses?.find((res) => +res.code === 200) || {};

    const exportInterfaceQuery = buildInterfaceQuery(
      apiFunctionName,
      apiDetailItem,
      queryParams,
    );
    const exportInterfaceBody = buildInterfaceBody(
      apiFunctionName,
      apiDetailItem,
      haveReqBody,
    );
    const exportInterfacePathQuery = buildInterfacePathQuery(
      apiFunctionName,
      apiDetailItem,
      pathParams,
    );
    const exportInterfaceRes = buildInterfaceResponse(
      apiFunctionName,
      apiDetailItem,
      responses,
    );
    const exportInterface = `${exportInterfaceQuery}${exportInterfacePathQuery}${exportInterfaceBody}${exportInterfaceRes}`;

    const description = buildDescription(apiFunctionName, apiDetailItem);
    const apiFunctionSignature = buildApiFunctionSignature(
      apiFunctionName,
      pathParams,
      queryParams,
      haveReqBody,
      apiMethod,
    );
    const apiFunctionBody = buildApiFunctionBody(
      apiMethod,
      axiosAlias,
      apiPath,
      apiDetailParams,
      haveReqBody,
      queryParams,
      apiDetailItem,
    );

    if (apiModel === "axios") {
      return {
        fun: `\n  \n${description}\n${apiFunctionSignature}\n  ${apiFunctionBody}\n}`,
        interFace: exportInterface,
      };
    }

    if (apiModel === "custom") {
      const options = {
        pathParams,
        pathParamsType: `${apiFunctionName}PathQuery`,
        queryParams,
        queryParamsType: `${apiFunctionName}Query`,
        apiMethod,
        apiReturnType: `${apiFunctionName}Res`,
        haveReqBody,
        dataParamsType: `${apiFunctionName}Body`,
        apiFunctionName,
        extraFunctionName: `use${firstToLocaleUpperCase(apiFunctionName)}`,
        apiPath,
        buildParameters,
        log: console.warn,
        useProjectId: _config.useProjectId || false,
        projectId,
      };
      const defaultFunction = `${apiFunctionSignature}\n  ${apiFunctionBody}\n}`;
      const customFun = customFunctionReturn(
        options,
        description,
        defaultFunction,
        apiFunctionName,
      );
      return { fun: customFun, interFace: exportInterface };
    }

    // wx model
    const wxSignature = `export const ${apiFunctionName} = async (${
      pathParams.length > 1
        ? `pathParams: Expand<${apiFunctionName}PathQuery>`
        : pathParams.length === 1
          ? `${pathParams[0].name}: ${buildParameters(pathParams[0])}`
          : ""
    }${queryParams.length ? (pathParams.length ? ", " : "") + `params: Expand<${apiFunctionName}Query>` : ""}${!apiTypeCollection.includes(apiMethod) && haveReqBody ? ", data: Expand<" + apiFunctionName + "Body>" : ""}, config?: Expand<OtherRequestConfig>) => {`;
    const url = `\`${apiPath}\``;
    const wxBody = `return http.${apiMethod.toLowerCase()}<${apiFunctionName}Res>(${url}, ${
      ["get", "delete"].includes(apiMethod.toLowerCase())
        ? queryParams.length
          ? "params"
          : "{}"
        : haveReqBody
          ? "data"
          : "{}"
    }, config);\n}`;
    return {
      fun: `\n  \n${description}\n${wxSignature}\n  ${wxBody}`,
      interFace: exportInterface,
    };
  } catch (error: any) {
    console.error(
      `构建方法模板失败 ${apiDetailItem.name} ${apiDetailItem.path}: ${error.message}`,
    );
    return { fun: "", interFace: "" };
  }
}

// ─── Generate file content ────────────────────────────────────────────────────

function getAllInterfaceNames(
  items: Array<{
    interfaceQueryName: string;
    interfacePathQueryName: string;
    interfaceBodyQueryName: string;
    interfaceResName: string;
  }>,
  allApiFunctionStr: string,
): string {
  return Array.from(
    new Set(
      items.flatMap((cur) =>
        [
          cur.interfaceQueryName,
          cur.interfacePathQueryName,
          cur.interfaceBodyQueryName,
          cur.interfaceResName,
        ].filter((item) => !!item && allApiFunctionStr.includes(item)),
      ),
    ),
  )
    .sort()
    .join(",");
}

function buildHead(
  allInterfaceName: string,
  axiosQuote: string,
  isNeedQs: boolean,
): string {
  const heardAnnotation = `/* eslint-disable @typescript-eslint/no-unused-vars */\n// @ts-nocheck: 忽略类型错误 系统工具生成`;
  if (_config.model === "custom" && _config.head) {
    return `${heardAnnotation}\n${_config.head}\nimport type { ${allInterfaceName} } from './interface';`;
  }
  if (_config.model === "wx") {
    return `import { http } from "../request/index";\n${isNeedQs ? "import qs from 'qs';" : ""}\nimport type { ${allInterfaceName} } from './interface';\ntype Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;`;
  }
  return `\n${heardAnnotation}\n${isNeedQs ? "import qs from 'qs';" : ""}\nimport type { AxiosRequestConfig } from 'axios';\nimport type { ${allInterfaceName} } from './interface';\n${axiosQuote}\ntype Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;\n`;
}

export interface GenerateResult {
  apiFilePath: string;
  interfaceFilePath: string;
  apiContent: string;
  interfaceContent: string;
}

export async function generateApiFiles(
  targetDir: string,
  apiIds: number[],
): Promise<GenerateResult[]> {
  const axiosQuote = _config.axiosPath || 'import axios from "axios"';
  const apiModel: apiModelType = _config.model || "axios";
  const prettierSetting = getPrettierSetting();
  const projectId = _config.projectId[_config.projectId.length - 1];

  // group by directory: for multiple apis, they go into the same dir
  const items = apiIds.map((id) => {
    const detail: Partial<ApiDetailListData> =
      _detailList.find((d) => d.id === id) || {};
    const apiFunctionName =
      `${detail.method}${convertPathToPascalCase(detail.path || "")}`.trim();
    const useApiFunctionName = `use${firstToLocaleUpperCase(apiFunctionName)}`;
    const { fun, interFace } = buildMethodTemplate(
      apiFunctionName,
      apiModel,
      detail,
      axiosQuote,
      projectId,
    );
    return {
      id,
      apiFunctionName,
      useApiFunctionName,
      apiFunctionContext: fun,
      apiInterfaceContext: interFace,
      interfaceQueryName: (detail?.parameters?.query || []).length
        ? `${apiFunctionName}Query`
        : "",
      interfacePathQueryName:
        (detail?.parameters?.path || []).length > 1
          ? `${apiFunctionName}PathQuery`
          : "",
      interfaceBodyQueryName:
        (detail?.requestBody?.parameters || []).length ||
        detail?.requestBody?.jsonSchema
          ? `${apiFunctionName}Body`
          : "",
      interfaceResName: `${apiFunctionName}Res`,
    };
  });

  const apiFunctionStr = items.map((i) => i.apiFunctionContext).join("");
  const allInterfaceName = getAllInterfaceNames(items, apiFunctionStr);
  const isNeedQs = apiFunctionStr.includes("${qs.stringify(");
  const head = buildHead(allInterfaceName, axiosQuote, isNeedQs);
  const allFunctionContext = head + apiFunctionStr;
  const allInterfaceContext = items.map((i) => i.apiInterfaceContext).join("");

  const [formattedFun, formattedInterface] = await Promise.all([
    formatCode(allFunctionContext, prettierSetting),
    formatCode(allInterfaceContext, prettierSetting),
  ]);

  const apiFilePath = path.join(targetDir, `${_config.appName}.ts`);
  const interfaceFilePath = path.join(targetDir, "interface.ts");

  return [
    {
      apiFilePath,
      interfaceFilePath,
      apiContent: formattedFun,
      interfaceContent: formattedInterface,
    },
  ];
}
