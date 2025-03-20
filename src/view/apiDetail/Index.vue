<!--
 * @FilePath: /AutoAPIGen/src/view/apiDetail/Index.vue
 * @Description: 
-->
<script setup lang="ts">
import Editor from '../components/Editor.vue';
import ParamTable from '../components/ParamTable.vue';
import { generateTableData, generateExampleFromParams } from './utils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

// 1. 将这些变量的声明移到文件最前面，在所有 computed 之前
// 接口详情数据
const apiDetail = ref<ApiDetailListData & { generateInfo: any }>();
// 配置信息
const configInfo = ref<ConfigurationInformation>();

// tab激活状态
const bodyActiveTab = ref('params'); // body参数的标签页状态
const resActiveTab = ref('params'); // 响应的标签页状态

const paramTypeMap = {
  body: 'interfaceBodyQueryName',
  response: 'interfaceResName',
  query: 'interfaceQueryName'
};

vscode.postMessage({ command: 'getWorkspaceState', data: { init: true } });
vscode.postMessage({ command: 'getApiDetail', data: (window as any)?.extraInfo || {} });

// 监听主题变化
watch(
  () => configInfo.value?.theme,
  (value) => {
    if (value && value.kind === 2) {
      document.body.setAttribute('arco-theme', 'dark');
    }
  }
);

// 添加Vue响应式代码内容的响应式变量
const queryParamsVueCode = ref('');
const bodyParamsVueCode = ref('');
const responseParamsVueCode = ref('');

// 2. 删除所有的 watch 块 (因为它们在变量定义前过早调用)

// 3. 替换为初始化函数，在 apiDetail 被设置后调用
const initVueCodeGenerators = async () => {
  if (!apiDetail.value) return;
  await nextTick();
  // 延迟执行，确保所有相关计算属性已经更新
  setTimeout(() => {
    if (queryParams.value && queryParams.value.length > 0) {
      generateVueCodeForTab('query');
    }

    if (bodyParams.value && bodyParams.value.length > 0) {
      generateVueCodeForTab('body');
    }

    if (responseParams.value && responseParams.value.length > 0) {
      generateVueCodeForTab('response');
    }
  }, 100);
};

// 4. 在接收消息的处理程序中调用初始化函数
window.addEventListener('message', (event) => {
  const message = event.data;
  switch (message.command) {
    case 'setApiDetail':
      console.log('----- 接口详情数据 -----', message.data);
      apiDetail.value = message.data;
      initVueCodeGenerators();
      break;
    case 'getWorkspaceState':
      configInfo.value = message.data;
      break;
  }
});

const loading = computed(() => !(apiDetail.value && configInfo.value));

// 在脚本部分定义颜色映射
const methodColors: Record<string, string> = {
  get: '#17b26a',
  post: '#ef6820',
  put: '#2e90fa',
  delete: '#f04438',
  patch: '#ee46bc',
  options: '#2e90fa',
  head: '#2e90fa',
  trace: '#165dff',
  connect: '#f53f3f'
} as const;

// 定义 HTTP 方法类型
type HttpMethod = keyof typeof methodColors;

const apiMethodColor = computed(() => {
  const method = apiDetail.value?.method?.toLowerCase() as HttpMethod | undefined;
  return method ? methodColors[method] : '#666';
});

// 开发状态颜色映射表
type DevelopStatus =
  | 'designing'
  | 'pending'
  | 'developing'
  | 'integrating'
  | 'testing'
  | 'tested'
  | 'released'
  | 'deprecated'
  | 'obsolete'
  | 'exception';
const developStatus: Record<DevelopStatus, { label: string; color: string }> = {
  designing: {
    label: '设计中',
    color: '#8ad50f'
  },
  pending: {
    label: '待确定',
    color: '#eaaa08'
  },
  developing: {
    label: '开发中',
    color: '#2e90fa'
  },
  integrating: {
    label: '联调中',
    color: '#ee46bc'
  },
  testing: {
    label: '测试中',
    color: '#ef6820'
  },
  tested: {
    label: '已测完',
    color: '#9373ee'
  },
  released: {
    label: '已发布',
    color: '#17b26a'
  },
  deprecated: {
    label: '将废弃',
    color: '#aaaaaa'
  },
  obsolete: {
    label: '已废弃',
    color: '#aaaaaa'
  },
  exception: {
    label: '有异常',
    color: '#f04438'
  }
} as const;

const getStatusColorOrLabel = (type: 'color' | 'label' = 'color') => {
  const status = (apiDetail.value?.status || 'designing') as DevelopStatus;
  return developStatus[status][type];
};

// 修改请求参数接口，添加子参数支持
interface RequestParam {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  example?: any;
  children?: RequestParam[]; // 添加子参数数组
}

// 获取路径参数
const pathParams = computed(() => {
  const params = apiDetail.value?.parameters?.path || [];

  return params.map((param) => ({
    name: param.name,
    type: param.type || 'string',
    required: param.required || false,
    description: param.description || '',
    example: param.example || ''
  }));
});

// 添加接口用于复制操作类型
interface CopyOption {
  label: string;
  key: string;
  icon?: string;
}

// 添加下拉菜单选项
const copyOptions = ref<CopyOption[]>([
  {
    label: '快速使用接口引用',
    key: 'copyImport',
    icon: 'copy'
  },
  {
    label: '生成Vue3的ref变量',
    key: 'generateVueRef',
    icon: 'code'
  },
  {
    label: '生成React的变量',
    key: 'generateReactState',
    icon: 'code'
  }
]);

const generateInfo = computed(() => apiDetail.value?.generateInfo || {});

const getDefaultValue = (param: string | string[]) => {
  let defaultValue = 'undefined';

  const paramTypeMap = {
    string: "''",
    number: '0',
    integer: '0',
    boolean: 'false',
    array: '[]',
    object: '{}',
    undefined: 'undefined',
    null: 'null',
    nan: 'NaN',
    infinity: 'Infinity',
    file: 'null',
  }

  const paramType = ((Array.isArray(param) ? param[0] : param) || '').toLowerCase() as keyof typeof paramTypeMap;
  if (paramTypeMap[paramType]) {
    defaultValue = paramTypeMap[paramType];
  } else if (paramType.includes('[]')) {
    defaultValue = '[]';
  } else if (paramType.includes('{}')) {
    defaultValue = '{}';
  }
  return defaultValue;
};

// 辅助函数：生成Vue3响应式代码 - 使用单一响应式对象
const generateVueReactiveCode = (
  params: RequestParam[],
  paramType: 'body' | 'response' | 'query'
) => {
  if (!params || params.length === 0) return '';

  let code = '';

  // 生成导入语句
  code += '// Vue3 响应式对象\n';
  code += "import { reactive } from 'vue';\n\n";

  // 生成单一响应式对象
  code += '// 请求参数响应式对象\n';
  code += `const formData = reactive<${generateInfo.value[paramTypeMap[paramType]]}>({
`;

  params.forEach((param) => {
    console.log('----- 参数 -----', param);
    // 根据类型设置默认值
    const defaultValue = getDefaultValue(param.type);

    // 注释放在同一行
    code += `  ${param.name}: ${defaultValue},${param.description ? ` // ${param.description}` : ''}\n`;
  });

  code += '});\n';

  return code;
};

// 为嵌套结构生成更复杂的响应式代码
const generateNestedVueReactiveCode = (
  params: RequestParam[],
  paramType: 'body' | 'response' | 'query'
) => {
  if (!params || params.length === 0) return '';

  let code = '';

  // 生成导入语句
  code += '// Vue3 响应式对象\n';
  code += "import { reactive } from 'vue';\n\n";

  // 递归生成嵌套对象的字符串
  const generateObjectStructure = (params: RequestParam[], indent = 0): string => {
    let result = '{\n';
    const spaces = ' '.repeat((indent + 1) * 2);

    params.forEach((param) => {
      if (param.children && param.children.length > 0) {
        result += `${spaces}${param.name}: ${generateObjectStructure(param.children, indent + 1)},${param.description ? ` // ${param.description}` : ''}\n`;
      } else {
        console.log('----- 参数generateObjectStructure -----', param);
        // 根据类型设置默认值
        const defaultValue = getDefaultValue(param.type);

        result += `${spaces}${param.name}: ${defaultValue},${param.description ? ` // ${param.description}` : ''}\n`;
      }
    });

    result += `${' '.repeat(indent * 2)}}`;
    return result;
  };

  // 生成带类型的响应式对象
  code += '// 包含嵌套结构的响应式对象\n';
  code += `const formData = reactive<${generateInfo.value[paramTypeMap[paramType]]}>(${generateObjectStructure(params)});\n`;

  return code;
};

// 自动生成Vue响应式代码的函数
const generateVueCodeForTab = (paramType: 'body' | 'response' | 'query') => {
  const getParamsByType = (): RequestParam[] => {
    switch (paramType) {
      case 'body':
        return bodyParams.value || [];
      case 'query':
        return queryParams.value;
      case 'response':
        return responseParams.value;
      default:
        return [];
    }
  };

  const params = getParamsByType();
  // 检查是否有嵌套结构
  const hasNestedStructure = params.some((param) => param.children && param.children.length > 0);

  // 导入语句
  const importContent = `import type { ${generateInfo.value[paramTypeMap[paramType]]} } from '${generateInfo.value.importInterfacePath}';`;

  // 生成代码
  let code = '';
  if (hasNestedStructure) {
    code = generateNestedVueReactiveCode(params, paramType);
  } else {
    code = generateVueReactiveCode(params, paramType);
  }

  // 添加类型导入
  code = `${importContent}\n\n${code}`;

  // 更新对应的代码变量
  switch (paramType) {
    case 'body':
      bodyParamsVueCode.value = code;
      break;
    case 'query':
      queryParamsVueCode.value = code;
      break;
    case 'response':
      responseParamsVueCode.value = code;
      break;
  }

  return code;
};

// 处理复制操作修改为复制已生成的代码
const handleCopyOperation = (
  key: 'copyImport' | 'generateVueRef' | 'generateReactState',
  paramType: 'body' | 'response' | 'query'
) => {
  const importContent = `import type { ${generateInfo.value[paramTypeMap[paramType]]} } from '${generateInfo.value.importInterfacePath}';`;

  const handler = {
    copyImport: () => {
      vscode.postMessage({
        command: 'copyToClipboard',
        data: {
          text: importContent
        }
      });
    },
    generateVueRef: () => {
      // 根据参数类型获取对应的已生成代码
      let codeToUse = '';
      switch (paramType) {
        case 'body':
          codeToUse = bodyParamsVueCode.value;
          break;
        case 'query':
          codeToUse = queryParamsVueCode.value;
          break;
        case 'response':
          codeToUse = responseParamsVueCode.value;
          break;
      }

      vscode.postMessage({
        command: 'copyToClipboard',
        data: {
          text: codeToUse
        }
      });
    },
    generateReactState: () => {
      // 将在另一个修改中实现
    }
  };

  handler[key]();
};

// 辅助函数：转换为驼峰命名
const camelCase = (str: string): string => {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
};

// 辅助函数：转换为帕斯卡命名
const pascalCase = (str: string): string => {
  const camel = camelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
};

// 类型修复：修复header属性类型
const headerParams = computed(() => {
  const headers = apiDetail.value?.parameters?.header || [];
  const commonHeaders = apiDetail.value?.commonParameters?.header || [];

  // 合并公共请求头和特定请求头
  return [...headers, ...commonHeaders].map((header: any) => ({
    name: header.name,
    type: header.type || 'string',
    required: header.required || false,
    description: header.description || '',
    example: header.example || ''
  }));
});

// 获取Cookie参数
const cookieParams = computed(() => {
  const cookies = apiDetail.value?.parameters?.cookie || [];
  const commonCookies = apiDetail.value?.commonParameters?.cookie || [];

  return [...cookies, ...commonCookies].map((cookie) => ({
    name: cookie.name,
    type: cookie.type || 'string',
    required: cookie.required || false,
    description: cookie.description || '',
    example: cookie.example || ''
  }));
});

// 获取查询参数
const queryParams = computed(() => {
  const queries = apiDetail.value?.parameters?.query || [];

  return queries.map((query) => ({
    name: query.name,
    type: query.type || 'string',
    required: query.required || false,
    description: query.description || '',
    example: query.example || ''
  }));
});

// 获取请求体参数
const bodyParams = computed(() => {
  if (!apiDetail.value?.requestBody || apiDetail.value.requestBody.type === 'none') return [];

  if (apiDetail.value?.requestBody) {
    const { parametersTable, schemaTable } = generateTableData(apiDetail.value.requestBody);
    console.log('----- 请求体参数 -----', parametersTable, schemaTable);
    return schemaTable.length > 0 ? schemaTable : parametersTable;
  }

  return []; // 确保返回一个空数组而不是 undefined
});

// 修复generateTableData函数调用的类型问题
const responseParams = computed(() => {
  const successResponse = apiDetail.value?.responses?.find((res) => res.code === 200);
  if (successResponse) {
    try {
      const { parametersTable, schemaTable } = generateTableData(successResponse as any);
      console.log('----- 响应参数 -----', parametersTable, schemaTable);
      return schemaTable.length > 0 ? schemaTable : parametersTable;
    } catch (error) {
      console.error('生成响应参数表出错', error);
      return [];
    }
  }
  return [];
});

// 获取请求示例
const requestExample = computed(() => {
  console.log('----- 请求示例 -----', apiDetail.value?.requestBody?.jsonSchema);
  // 1. 优先从examples中获取
  if (apiDetail.value?.requestBody?.examples && apiDetail.value.requestBody.examples.length > 0) {
    try {
      return JSON.parse(apiDetail.value.requestBody.examples[0].value);
    } catch (e) {
      return apiDetail.value.requestBody.examples[0].value;
    }
  }

  if (apiDetail.value?.requestBody?.example) {
    try {
      return JSON.parse(apiDetail.value.requestBody.example);
    } catch (e) {
      return apiDetail.value.requestBody.example;
    }
  }

  // 2. 如果有requestBody.jsonSchema，使用经过转换的bodyParams生成示例
  if (apiDetail.value?.requestBody?.jsonSchema) {
    return generateExampleFromParams(bodyParams.value);
  }

  return '';
});

// 获取响应示例
const responseExample = computed(() => {
  // 1. 优先从responseExamples中获取
  if (apiDetail.value?.responseExamples && apiDetail.value.responseExamples.length > 0) {
    try {
      return JSON.parse(apiDetail.value.responseExamples[0].data);
    } catch (e) {
      console.error('解析响应示例出错', e);
      return apiDetail.value.responseExamples[0].data;
    }
  }

  // 2. 如果没有示例，使用经过转换的responseParams生成示例
  return generateExampleFromParams(responseParams.value);
});

// 格式化JSON为字符串
const formatJsonString = (json: any) => {
  try {
    return JSON.stringify(json, null, 2);
  } catch (e) {
    return '';
  }
};

// 编辑器值
const requestEditorValue = ref(formatJsonString(requestExample.value));
const responseEditorValue = ref(formatJsonString(responseExample.value));

// 当示例数据变化时更新编辑器内容
watch(
  () => requestExample.value,
  (newValue) => {
    requestEditorValue.value = formatJsonString(newValue);
  },
  { deep: true }
);

watch(
  () => responseExample.value,
  (newValue) => {
    responseEditorValue.value = formatJsonString(newValue);
  },
  { deep: true }
);

// 空属性数组，满足 Editor 组件接口要求
const emptyProperties = ref([]);

const descriptions = computed(() => {
  return [
    {
      label: '创建时间',
      value: dayjs(apiDetail.value?.createdAt).format('YYYY年MM月DD日')
    },
    {
      label: '修改时间',
      value: dayjs((apiDetail.value?.updatedAt || '').slice(0, 10)).fromNow()
    },
    {
      label: '修改者',
      value: apiDetail.value?.editorName || `${apiDetail.value?.editorId}（已停用）`
    },
    {
      label: '创建者',
      value: apiDetail.value?.creatorName || `${apiDetail.value?.creatorId}（已停用）`
    }
  ];
});

const handleTabChange = (key: string | number, paramType: 'body' | 'response' | 'query') => {
  console.log('----- 切换标签页 -----', key, paramType);
  generateVueCodeForTab(paramType);
};
</script>

<template>
  <a-spin :loading="loading" class="h-full w-full" style="height: 100%; overflow-x: auto">
    <div class="min-w-[800px] max-w-full overflow-auto p-6" v-if="apiDetail">
      <div class="mb-6">
        <h1 class="text-[18px] font-medium mb-2">{{ apiDetail.name }}</h1>
        <div class="flex items-center space-x-3">
          <div
            class="method-tag py-1 px-3 rounded-[4px] text-[12px]"
            :style="{ backgroundColor: apiMethodColor }"
          >
            {{ apiDetail.method?.toUpperCase() }}
          </div>
          <div class="text-[14px] font-mono">{{ apiDetail.path }}</div>
          <div
            class="w-[6px] h-[6px] rounded-full ml-[24px] mr-[8px]"
            :style="{ backgroundColor: getStatusColorOrLabel('color') }"
          ></div>
          <a-tag size="small">
            {{ getStatusColorOrLabel('label') }}
          </a-tag>
        </div>
        <div class="mt-2 text-[13px] text-gray-500" v-if="apiDetail.description">
          {{ apiDetail.description }}
        </div>

        <div class="mt-2 text-[13px] text-gray-500">
          <a-descriptions :data="descriptions" title="" :align="{ label: 'right' }" />
        </div>
      </div>

      <!-- 请求参数 -->
      <div class="mt-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-[14px] font-medium">请求参数</h3>
        </div>

        <!-- 路径参数 -->
        <a-card class="mb-4" v-if="pathParams.length > 0">
          <template #title>
            <div class="text-[13px] font-medium">路径参数</div>
          </template>
          <ParamTable :data="pathParams" />
        </a-card>

        <!-- 查询参数 -->
        <a-card class="mb-4" v-if="queryParams.length > 0">
          <template #title>
            <div class="text-[13px] font-medium flex justify-between">
              <div>查询参数({{ generateInfo.interfaceQueryName }})</div>
              <div class="flex">
                <a-button
                  type="text"
                  size="mini"
                  @click="handleCopyOperation('copyImport', 'query')"
                >
                  <template #icon>
                    <icon-copy />
                  </template>
                  复制接口引用
                </a-button>
              </div>
            </div>
          </template>

          <a-tabs>
            <a-tab-pane
              key="params"
              title="参数"
              @change="(key: string | number) => handleTabChange(key, 'query')"
            >
              <ParamTable :data="queryParams" />
            </a-tab-pane>
            <a-tab-pane key="vueCode" title="Vue响应式代码" v-if="queryParams.length">
              <div class="border rounded-md overflow-hidden">
                <div class="flex justify-between items-center px-4 py-2 bg-gray-50 border-b">
                  <span class="text-[13px] font-medium text-[#333]">Vue响应式代码</span>
                  <a-button
                    type="text"
                    size="mini"
                    class="w-auto"
                    @click="handleCopyOperation('generateVueRef', 'query')"
                  >
                    <template #icon>
                      <icon-copy />
                    </template>
                    复制代码
                  </a-button>
                </div>
                <div class="editor-container" v-if="queryParamsVueCode">
                  <Editor
                    v-model="queryParamsVueCode"
                    :defaultValue="queryParamsVueCode"
                    language="typescript"
                    :readonly="true"
                    optionsType="typescript"
                    :optionsProperties="emptyProperties"
                  />
                </div>
              </div>
            </a-tab-pane>
          </a-tabs>
        </a-card>

        <!-- 请求头参数 -->
        <a-card class="mb-4" v-if="headerParams.length > 0">
          <template #title>
            <div class="text-[13px] font-medium">请求头参数</div>
          </template>
          <ParamTable :data="headerParams" />
        </a-card>

        <!-- Cookie参数 -->
        <a-card class="mb-4" v-if="cookieParams.length > 0">
          <template #title>
            <div class="text-[13px] font-medium">Cookie参数</div>
          </template>
          <ParamTable :data="cookieParams" />
        </a-card>

        <!-- 请求体参数 -->
        <a-card class="mb-4" v-if="apiDetail.requestBody && apiDetail.requestBody.type !== 'none'">
          <template #title>
            <div class="text-[13px] font-medium flex justify-between">
              <div>
                Body参数({{ apiDetail.requestBody.type }})({{
                  generateInfo.interfaceBodyQueryName
                }})
              </div>
              <div class="flex">
                <a-button
                  type="text"
                  size="mini"
                  @click="handleCopyOperation('copyImport', 'body')"
                >
                  <template #icon>
                    <icon-copy />
                  </template>
                  复制接口引用
                </a-button>
              </div>
            </div>
          </template>

          <a-tabs
            v-model:active-key="bodyActiveTab"
            class="request-body-tabs"
            @change="(key: string | number) => handleTabChange(key, 'body')"
          >
            <!-- Body参数表格 -->
            <a-tab-pane key="params" title="参数">
              <ParamTable v-if="bodyParams && bodyParams.length > 0" :data="bodyParams" />
              <div v-else class="text-gray-500 text-[13px] py-2">无参数</div>
            </a-tab-pane>

            <!-- Body示例 -->
            <a-tab-pane key="example" title="示例" v-if="requestExample">
              <div class="border rounded-md overflow-hidden">
                <div class="flex justify-between items-center px-4 py-2 bg-gray-50 border-b">
                  <span class="text-[13px] font-medium text-[#333]">请求示例</span>
                </div>
                <div class="editor-container">
                  <Editor
                    v-model="requestEditorValue"
                    language="json"
                    optionsType="json"
                    :optionsProperties="emptyProperties"
                    :defaultValue="formatJsonString(requestExample)"
                  />
                </div>
              </div>
            </a-tab-pane>

            <!-- Vue响应式代码 -->
            <a-tab-pane key="vueCode" title="Vue响应式代码" v-if="bodyParams.length">
              <div class="border rounded-md overflow-hidden">
                <div class="flex justify-between items-center px-4 py-2 bg-gray-50 border-b">
                  <span class="text-[13px] font-medium text-[#333]">Vue响应式代码</span>
                  <a-button
                    type="text"
                    size="mini"
                    class="w-auto"
                    @click="handleCopyOperation('generateVueRef', 'body')"
                  >
                    <template #icon>
                      <icon-copy />
                    </template>
                    复制代码
                  </a-button>
                </div>
                <div class="editor-container" v-if="bodyParamsVueCode">
                  <Editor
                    v-model="bodyParamsVueCode"
                    :defaultValue="bodyParamsVueCode"
                    language="typescript"
                    :readonly="true"
                    optionsType="typescript"
                    :optionsProperties="emptyProperties"
                  />
                </div>
              </div>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </div>

      <!-- 返回响应 -->
      <div class="mt-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-[14px] font-medium">返回响应</h3>
        </div>

        <div class="bg-[#f5f7fa] px-4 py-2 rounded-t-md border border-b-0 border-gray-200">
          <div class="flex items-center justify-between">
            <div class="flex-1 flex">
              <div class="text-[13px] font-medium text-green-600">
                成功({{ generateInfo.interfaceResName }})
              </div>
              <div class="text-[12px] text-gray-500 ml-2">
                内容格式:
                {{ apiDetail?.responses?.find((r) => r.code === 200)?.contentType || 'JSON' }}
              </div>
            </div>
            <div>
              <a-button
                type="text"
                size="mini"
                @click="handleCopyOperation('copyImport', 'response')"
              >
                <template #icon>
                  <icon-copy />
                </template>
                复制接口引用
              </a-button>
            </div>
          </div>
        </div>

        <a-tabs
          v-model:active-key="resActiveTab"
          @change="(key: string | number) => handleTabChange(key, 'response')"
        >
          <a-tab-pane key="params" title="参数">
            <ParamTable :data="responseParams" />
          </a-tab-pane>

          <a-tab-pane key="example" title="示例">
            <div class="border rounded-md overflow-hidden">
              <div class="flex justify-between items-center px-4 py-2 bg-gray-50 border-b">
                <span class="text-[13px] font-medium text-[#333]">响应示例</span>
              </div>
              <div class="editor-container">
                <Editor
                  v-model="responseEditorValue"
                  language="json"
                  optionsType="json"
                  :optionsProperties="emptyProperties"
                  :defaultValue="formatJsonString(responseExample)"
                />
              </div>
            </div>
          </a-tab-pane>

          <!-- 新增的Vue响应式代码标签页 -->
          <a-tab-pane key="vueCode" title="Vue响应式代码" v-if="responseParams.length">
            <div class="border rounded-md overflow-hidden">
              <div class="flex justify-between items-center px-4 py-2 bg-gray-50 border-b">
                <span class="text-[13px] font-medium text-[#333]">Vue响应式代码</span>
                <a-button
                  type="text"
                  size="mini"
                  class="w-auto"
                  @click="handleCopyOperation('generateVueRef', 'response')"
                >
                  <template #icon>
                    <icon-copy />
                  </template>
                  复制代码
                </a-button>
              </div>
              <div class="editor-container" v-if="responseParamsVueCode">
                <Editor
                  v-model="responseParamsVueCode"
                  :defaultValue="responseParamsVueCode"
                  language="typescript"
                  :readonly="true"
                  optionsType="typescript"
                  :optionsProperties="emptyProperties"
                />
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>
    </div>
  </a-spin>
</template>

<style scoped>
/* 修正CSS语法 */
.min-w-\[800px\] {
  min-width: 800px;
}

.max-w-full {
  max-width: 100%;
}

/* 其他CSS保持不变 */
.overflow-auto {
  overflow: auto;
  overflow-x: auto !important;
  overflow-y: auto;
}

/* 表格样式优化 */
.arco-table-size-small .arco-table-th {
  background-color: #f5f7fa;
  padding: 8px 16px;
}

.arco-table-size-small .arco-table-td {
  padding: 8px 16px;
  white-space: normal; /* 允许文本换行 */
  word-break: break-word; /* 长单词断行 */
}

/* 确保内容可以滚动 */
:deep(.arco-spin-children) {
  height: 100%;
  overflow: auto;
}

/* 改进表格样式，确保内容显示完整 */
:deep(.arco-table-body) {
  overflow-x: auto;
}

:deep(.arco-table-col) {
  word-break: break-word;
}

:deep(.arco-table-cell) {
  vertical-align: top;
}

/* 标签页样式 */
.request-body-tabs {
  margin-bottom: 0;
}

.arco-tabs-nav-tab {
  background-color: #f5f7fa;
  padding: 0 16px;
}

.arco-tabs-content {
  padding: 16px;
  border: 1px solid #e5e6eb;
  border-top: none;
}

/* 卡片样式 */
:deep(.arco-card-header) {
  padding: 8px 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e5e6eb;
}

:deep(.arco-card-body) {
  padding: 16px;
}

/* 编辑器容器 */
.editor-container {
  width: 100%;
  overflow: auto;
}

/* HTTP 方法标签样式 */
.method-tag {
  color: #ffffff;
  font-weight: 500;
  user-select: none;
}
</style>
