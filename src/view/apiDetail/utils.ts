import { ApiDetailResponse, ApiDetailParameter } from '../../types';

interface ParameterEntry {
    name: string;
    in?: string;
    required: boolean;
    description: string;
    type: string;
    title: string;
}

interface SchemaEntry {
    name: string;
    title: string;
    type: string;
    required: boolean;
    description: string;
    example?: any;
    children?: SchemaEntry[];
}

export function generateTableData(data: ApiDetailListData['requestBody']) {
    // 解析 parameters 数组为表格数据
    const parametersTable: ParameterEntry[] = (data.parameters || []).map(param => {
        // 获取参数类型
        let paramType = '';
        if (param.schema) {
            // 使用 schema 定义的类型 (OpenAPI 3)
            paramType = param.schema.type || '';
            if (paramType === 'array' && param.schema.items) {
                const itemType = param.schema.items.type || '';
                paramType = itemType ? itemType + '[]' : 'array';
            }
        } else if (param.content) {
            // 参数使用 content 提供 schema 定义
            const contentSchema = param.content['application/json']?.schema;
            if (contentSchema) {
                paramType = contentSchema.type || '';
                if (paramType === 'array' && contentSchema.items) {
                    const itemType = contentSchema.items.type || '';
                    paramType = itemType ? itemType + '[]' : 'array';
                }
            }
        } else if (param.type) {
            // 旧版 OpenAPI (Swagger) 在参数上直接提供类型
            paramType = param.type;
            if (paramType === 'array' && param.items) {
                const itemType = param.items.type || '';
                paramType = itemType ? itemType + '[]' : 'array';
            }
        }
        return {
            name: param.name,
            title: param.title || (param.schema?.title || ''),
            in: param.in || '',
            type: paramType,
            required: !!param.required,
            description: param.description || ''
        };
    });

    // 提取 example 数据（取第一个示例的 value）
    const mainExample = data.examples && data.examples.length > 0
        ? data.examples[0].value
        : undefined;

    // 递归解析 JSON Schema 属性为表格数据
    function parseProperties(
        properties: { [key: string]: any },
        requiredList: string[] = [],
        exampleObj: any = undefined
    ): SchemaEntry[] {
        const entries: SchemaEntry[] = [];
        for (const key in properties) {
            if (!properties.hasOwnProperty(key)) continue;
            const prop = properties[key];
            const title = prop.title || '';
            const description = prop.description || '';
            const required = requiredList.includes(key);
            let type = prop.type || '';
            // 当前属性的示例值（如果存在）
            let exampleValue: any = undefined;
            if (exampleObj && exampleObj.hasOwnProperty(key)) {
                exampleValue = exampleObj[key];
            }

            if (type === 'array') {
                // 处理数组类型
                if (prop.items) {
                    const itemType = prop.items.type || '';
                    if (itemType === 'object') {
                        // 数组元素为对象，递归解析子属性
                        type = 'object[]';
                        let childExampleObj: any = undefined;
                        if (Array.isArray(exampleValue) && exampleValue.length > 0) {
                            childExampleObj = exampleValue[0];
                        }
                        const children = parseProperties(
                            prop.items.properties || {},
                            prop.items.required || [],
                            childExampleObj
                        );
                        const entry: SchemaEntry = {
                            name: key,
                            title: title,
                            type: type,
                            required: required,
                            description: description
                        };
                        if (children.length > 0) {
                            entry.children = children;
                        }
                        entries.push(entry);
                        continue;
                    } else {
                        // 数组元素为原始类型
                        type = itemType ? itemType + '[]' : 'array';
                        if (Array.isArray(exampleValue)) {
                            exampleValue = exampleValue.length > 0 ? exampleValue : [];
                        }
                    }
                } else {
                    // 未指定 items 的数组类型
                    type = 'array';
                }
            }

            if (type === 'object') {
                // 处理对象类型
                if (prop.properties) {
                    // 对象包含子属性，递归解析
                    const children = parseProperties(
                        prop.properties,
                        prop.required || [],
                        exampleValue || {}
                    );
                    const entry: SchemaEntry = {
                        name: key,
                        title: title,
                        type: type,
                        required: required,
                        description: description
                    };
                    if (children.length > 0) {
                        entry.children = children;
                    }
                    entries.push(entry);
                    continue;
                } else {
                    // 自由形式的对象，没有预定义属性
                    if (exampleValue && typeof exampleValue === 'object') {
                        // 保留示例对象本身
                        exampleValue = exampleValue;
                    }
                }
            }

            // 处理原始类型或不包含子属性的对象/数组
            const entry: SchemaEntry = {
                name: key,
                title: title,
                type: type || (exampleValue !== undefined ? typeof exampleValue : ''),
                required: required,
                description: description
            };
            if (exampleValue !== undefined) {
                entry.example = exampleValue;
            }
            entries.push(entry);
        }
        return entries;
    }

    // 解析顶层 jsonSchema 为表格数据
    let schemaTable: SchemaEntry[] = [];
    if (data.jsonSchema) {
        if (data.jsonSchema.type === 'array') {
            // 顶层是数组
            if (data.jsonSchema.items) {
                if (data.jsonSchema.items.type === 'object') {
                    // 数组元素为对象
                    let rootExampleObj: any = undefined;
                    if (Array.isArray(mainExample) && mainExample.length > 0) {
                        rootExampleObj = mainExample[0];
                    }
                    schemaTable = parseProperties(
                        data.jsonSchema.items.properties || {},
                        data.jsonSchema.items.required || [],
                        rootExampleObj
                    );
                } else {
                    // 数组元素为原始类型
                    const itemType = data.jsonSchema.items.type || '';
                    const type = itemType ? itemType + '[]' : 'array';
                    const exampleVal = Array.isArray(mainExample) ? mainExample : mainExample;
                    schemaTable = [{
                        name: '',
                        title: data.jsonSchema.items.title || '',
                        type: type,
                        required: true,
                        description: data.jsonSchema.items.description || '',
                        example: exampleVal
                    }];
                }
            } else {
                // 顶层数组未指定 items 结构
                schemaTable = [{
                    name: '',
                    title: data.jsonSchema.title || '',
                    type: 'array',
                    required: true,
                    description: data.jsonSchema.description || '',
                    example: Array.isArray(mainExample) ? mainExample : mainExample
                }];
            }
        } else if (data.jsonSchema.type === 'object') {
            // 顶层是对象
            schemaTable = parseProperties(
                data.jsonSchema.properties || {},
                data.jsonSchema.required || [],
                mainExample || {}
            );
        } else {
            // 顶层是原始类型
            schemaTable = [{
                name: '',
                title: data.jsonSchema.title || '',
                type: data.jsonSchema.type || (mainExample !== undefined ? typeof mainExample : ''),
                required: true,
                description: data.jsonSchema.description || '',
                example: mainExample
            }];
        }
    }

    return { parametersTable, schemaTable };
}

interface JSONSchema {
    type?: string;
    properties?: { [key: string]: JSONSchema };
    items?: JSONSchema | JSONSchema[];
    // 其他 JSON Schema 关键字可根据需要添加
}

export function generateExample(schema: JSONSchema): any {
    if (!schema || !schema.type) {
        // 如果 schema 未指定类型，返回 null
        return null;
    }

    switch (schema.type) {
        case "string":
            // 字符串类型默认填充 "string"
            return "string";

        case "number":
        case "integer":
            // 数字类型默认填充 0（integer 视为 number）
            return 0;

        case "boolean":
            // 布尔类型默认填充 true
            return true;

        case "object":
            // 对象类型，递归解析其属性
            const obj: any = {};
            if (schema.properties) {
                for (const key in schema.properties) {
                    if (schema.properties.hasOwnProperty(key)) {
                        obj[key] = generateExample(schema.properties[key]);
                    }
                }
            }
            return obj;

        case "array":
            // 数组类型，生成一个包含默认项的数组
            if (schema.items) {
                // 如果 items 是一个数组（元组定义），递归处理每个元素
                if (Array.isArray(schema.items)) {
                    return schema.items.map(itemSchema => generateExample(itemSchema));
                } else {
                    // items 是单个模式，为数组生成一个默认元素
                    return [generateExample(schema.items)];
                }
            } else {
                // 未指定 items，返回空数组
                return [];
            }

        default:
            // 其他未明确处理的类型，返回 null
            return null;
    }
}

// 定义 schemaTable 中每个字段的类型
interface SchemaField {
    name: string;                      // 字段名称
    type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
    title?: string;                    // 字段标题（用于注释备用）
    description?: string;              // 字段描述（用于注释）
    children?: SchemaField[];          // 子字段（用于 object 或 array 类型）
}

export function generateDefaultData(schemaTable: SchemaField[]): any {
    const result: any = {};

    for (const field of schemaTable) {
        let value: any;

        // 根据类型填充默认值
        switch (field.type) {
            case 'string':
                value = 'string';
                break;
            case 'number':
            case 'integer':
                value = 0;
                break;
            case 'boolean':
                value = true;
                break;
            case 'object':
                // 递归解析子字段
                value = generateDefaultData(field.children || []);
                break;
            case 'array':
                if (field.children && field.children.length > 0) {
                    // 数组元素结构由 children 定义
                    const elementSchema = field.children;
                    if (elementSchema.length === 1 && !['object', 'array'].includes(elementSchema[0].type)) {
                        // 情况1：数组元素是单一的原始类型
                        value = [generateDefaultData(elementSchema)];
                        // ↑ 这里直接调用 generateDefaultData 传入 children（数组）会返回一个对象。
                        //   如果期望元素是原始类型，比如 string，建议直接处理：
                        //   value = [ elementSchema[0].type === 'string' ? 'string' : 0 ];
                    } else {
                        // 情况2：数组元素是对象类型（由多个子字段构成）
                        value = [generateDefaultData(elementSchema)];
                    }
                } else {
                    // 未定义 children 时，默认为空数组
                    value = [];
                }
                break;
            default:
                value = null;
        }

        // 将默认值赋给结果对象，并在此行添加注释（优先使用 description，其次使用 title）
        result[field.name] = value;  // ${field.description || field.title || ''}
    }

    return result;
}

// 定义参数表格项的接口
export interface ParameterEntry {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  example?: any;
  children?: ParameterEntry[];
  title?: string;
}

// 定义JSON Schema结构的接口
export interface SchemaEntry {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  example?: any;
  children?: SchemaEntry[];
  title?: string;
}

// 定义SchemaField接口（用于生成示例数据）
export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  title?: string;
  description?: string;
  children?: SchemaField[];
  example?: any;
  required?: boolean;
}

/**
 * 将参数表格数据转换为SchemaField格式
 */
export function convertToSchemaFields(params: ParameterEntry[] | SchemaEntry[] | undefined): SchemaField[] {
  if (!params || params.length === 0) return [];
  
  return params.map(param => {
    // 转换类型为SchemaField支持的类型
    let type: SchemaField['type'] = 'string';
    
    if (['number', 'integer'].includes(param.type)) {
      type = param.type as 'number' | 'integer';
    } else if (param.type === 'boolean') {
      type = 'boolean';
    } else if (param.type === 'array' || param.type.includes('[]')) {
      type = 'array';
    } else if (param.type === 'object') {
      type = 'object';
    }
    
    // 转换为SchemaField对象
    const schemaField: SchemaField = {
      name: param.name,
      type,
      title: param.title,
      description: param.description,
      required: param.required,
      example: param.example
    };
    
    // 递归处理子参数
    if (param.children && param.children.length > 0) {
      schemaField.children = convertToSchemaFields(param.children);
    }
    
    return schemaField;
  });
}

/**
 * 根据参数表格数据生成JSON示例
 */
export function generateExampleFromParams(params: ParameterEntry[] | SchemaEntry[] | undefined): any {
  // 转换为SchemaField格式
  const schemaFields = convertToSchemaFields(params);
  
  // 使用现有的generateDefaultData函数生成示例
  return generateDefaultData(schemaFields);
}