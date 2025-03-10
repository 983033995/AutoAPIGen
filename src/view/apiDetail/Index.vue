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

// 接口详情数据
const apiDetail = ref<ApiDetailListData>();
// 配置信息
const configInfo = ref<ConfigurationInformation>();

// tab激活状态
const bodyActiveTab = ref('params'); // body参数的标签页状态
const resActiveTab = ref('params'); // 响应的标签页状态

// 表格展开行状态
const expandedRowKeys = ref<string[]>([]);

// 构造唯一的行key
const getRowKey = (record: RequestParam) => {
  return `${record.name}-${record.type}`;
};

// 判断参数是否有子参数
const hasChildren = (record: RequestParam) => {
  return record.children && record.children.length > 0;
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

// 监听来自插件主进程的消息
window.addEventListener('message', (event) => {
  const message = event.data;
  switch (message.command) {
    case 'setApiDetail':
      console.log('----- 接口详情数据 -----', message.data);
      apiDetail.value = message.data;
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

// 获取请求头参数
const headerParams = computed(() => {
  const headers = apiDetail.value?.parameters?.header || [];
  const commonHeaders = apiDetail.value?.commonParameters?.header || [];

  // 合并公共请求头和特定请求头
  return [...headers, ...commonHeaders].map((header) => ({
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
});

// 获取响应参数
const responseParams = computed(() => {
  const successResponse = apiDetail.value?.responses?.find((res) => res.code === 200);
  if (successResponse) {
    const { parametersTable, schemaTable } = generateTableData(successResponse);
    console.log('----- 响应参数 -----', parametersTable, schemaTable);
    return schemaTable.length > 0 ? schemaTable : parametersTable;
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
</script>

<template>
  <a-spin :loading="loading" class="h-full w-full" style="height: 100%; overflow-x: auto;">
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
        <h3 class="text-[14px] font-medium mb-4">请求参数</h3>

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
            <div class="text-[13px] font-medium">查询参数</div>
          </template>
          <ParamTable :data="queryParams" />
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
            <div class="text-[13px] font-medium">Body参数 ({{ apiDetail.requestBody.type }})</div>
          </template>

          <a-tabs v-model:active-key="bodyActiveTab" class="request-body-tabs">
            <!-- Body参数表格 -->
            <a-tab-pane key="params" title="参数">
              <ParamTable v-if="bodyParams.length > 0" :data="bodyParams" />
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
          </a-tabs>
        </a-card>
      </div>

      <!-- 返回响应 -->
      <div class="mt-6">
        <h3 class="text-[14px] font-medium mb-4">返回响应</h3>

        <div class="bg-[#f5f7fa] px-4 py-2 rounded-t-md border border-b-0 border-gray-200">
          <div class="flex items-center">
            <div class="text-[13px] font-medium text-green-600">成功(200)</div>
            <div class="text-[12px] text-gray-500 ml-2">
              内容格式:
              {{ apiDetail?.responses?.find((r) => r.code === 200)?.contentType || 'JSON' }}
            </div>
          </div>
        </div>

        <a-tabs v-model:active-key="resActiveTab">
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
        </a-tabs>
      </div>
    </div>
  </a-spin>
</template>

<style scoped>
/* 确保外层容器允许横向滚动 */
.min-w-[800px] {
  min-width: 800px;
}

.max-w-full {
  max-width: 100%;
}

/* 明确设置横向滚动 */
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
