<!--
 * @FilePath: /AutoAPIGen/src/view/config/Index.vue
 * @Description: 
-->

<script setup lang="ts">
import type { ValidatedError } from '@arco-design/web-vue';
import { APP_LIST, API_MODEL } from '@/constant';
import Editor from '../components/Editor.vue';

const { t } = useI18n();

const formRef = ref();
// 配置信息
const configInfo = ref<ConfigurationInformation>();

// 定义KeysType类型
type KeysType = keyof typeof defaultModel;

// 定义AppCollections类型
type AppCollections = string;

// 定义apiModelType类型
type apiModelType = string;

const defaultModel = {
  appName: 'apifox' as AppCollections,
  Authorization: '',
  path: [],
  projectId: [],
  head: '',
  customReturn: '',
  customExtraFunction: '',
  model: '' as apiModelType,
  prettierSetting:
    '{\n    "semi": false, \n    "singleQuote": true,\n    "parser": "typescript"\n}',
  axiosPath: '',
  axiosReturnKey: '',
  useProjectName: false,
  alias: '',
  useProjectId: false,
  useTypeExtension: false
};

// 表单配置信息，允许字段为any类型
type ConfigFormType = {
  [K in KeysType]: any;
};

const formConfig = ref<ConfigFormType>(defaultModel);

const pathDefaultValue = ref<string[][]>([]);

const formRules = {
  appName: [{ required: true, message: `请选择${t('configInfoFrom.appLabel')}` }],
  Authorization: [{ required: true, message: `请输入${t('configInfoFrom.Authorization')}` }],
  path: [{ required: true, message: `请选择${t('configInfoFrom.path')}` }],
  projectId: [{ required: true, message: `请选择${t('configInfoFrom.projectId')}` }],
  model: [{ required: true, message: `请选择${t('configInfoFrom.model')}` }]
};
const submitLoading = ref(false);

// 文件夹目录
const foldersList = ref<DirectoryItem[]>();

// 项目列表
const projectList = ref([]);

function buildPathArray(pathStr: string): string[] {
  // 移除路径字符串开头的 '/'，以避免在结果数组中出现空字符串
  const trimmedPath = pathStr.startsWith('/') ? pathStr.slice(1) : pathStr;

  // 通过 '/' 分割路径
  const pathParts = trimmedPath.split('/');

  // 逐步构建路径数组
  const pathArray = pathParts.map((_, index) => {
    // 获取当前部分到路径的初始部分
    const currentPart = pathParts.slice(0, index + 1);
    // 将这些部分重新组合为路径，并在开头添加 '/'
    return '/' + currentPart.join('/');
  });

  return pathArray;
}

const projectLoading = ref<boolean>(false);
// 获取项目列表
const getProjectList = () => {
  projectLoading.value = true;
  if (!formConfig.value.Authorization) {
    formRef.value && formRef.value?.validateField('Authorization');
    return;
  }
  console.log('----->formConfig.value.Authorization', formConfig.value.Authorization);
  vscode.postMessage({
    command: 'getProjectList',
    data: {
      Authorization: formConfig.value.Authorization,
      appName: formConfig.value?.appName
    }
  });
};

window.addEventListener('message', (event) => {
  const message = event.data;
  switch (message.command) {
    case 'getWorkspaceState':
      configInfo.value = message.data;

      const initialConfiguration: ProjectConfigInfo = message.data.configInfo;

      const keys = Object.keys(defaultModel) as KeysType[];
      keys.forEach((key) => {
        if (key in initialConfiguration) {
          if (key === 'path' && initialConfiguration[key]) {
            formConfig.value.path = buildPathArray(initialConfiguration.path as unknown as string);
          }
          if (key === 'projectId' && initialConfiguration[key]) {
            getProjectList();
            formConfig.value.projectId = initialConfiguration.projectId as unknown as number[];
          } else {
            if (key !== 'path') {
              formConfig.value[key] = initialConfiguration[key] as unknown as any;
            }
          }
        }
      });
      break;
    case 'getFolders':
      foldersList.value = message.data;
      console.log('----- getFolders ------', foldersList.value);
      break;
    case 'saveConfig':
      submitLoading.value = false;
      break;
    case 'getProjectList':
      console.log('-----getProjectList', message.data);
      projectList.value = message.data || [];
      if (!projectList.value.length) {
        formConfig.value.projectId = [];
      }
      projectLoading.value = false;
      break;
  }
});

vscode.postMessage({ command: 'getWorkspaceState', data: { init: true } });
vscode.postMessage({ command: 'getFolders' });

watch(
  () => configInfo.value?.theme,
  (value) => {
    if (value && value.kind === 2) {
      document.body.setAttribute('arco-theme', 'dark');
    }
  }
);

const customModel = computed(() => {
  return formConfig.value.model === 'custom';
});

// 计算属性用于Editor组件绑定
const customReturnValue = computed({
  get: () => formConfig.value.customReturn || '',
  set: (val) => { formConfig.value.customReturn = val; }
});

const customExtraFunctionValue = computed({
  get: () => formConfig.value.customExtraFunction || '',
  set: (val) => { formConfig.value.customExtraFunction = val; }
});

const handleSubmit = ({
  values,
  errors
}: {
  values: Record<string, any>;
  errors: Record<string, ValidatedError> | undefined;
}) => {
  console.log('----- handleSubmit ------', formConfig.value.customExtraFunction, values, errors);
  submitLoading.value = true;
  if (!errors) {
    const configData = toRaw(formConfig.value);
    vscode.postMessage({
      command: 'saveConfig',
      data: {
        ...configData,
        path: configData.path[configData.path.length - 1]
      }
    });
  } else {
    submitLoading.value = false;
  }
};
const workspacePath = computed(() => configInfo.value?.workspaceFolders[0].uri.path || '');

const optionsType = `
        declare interface ApiDetailParametersQuery {
          name: string;
          type: string;
        }
  
        declare interface CustomFunctionOptions {
          /** 路径参数数组 */
          pathParams: ApiDetailParametersQuery[];
          /** 路径参数类型名称 */
          pathParamsType: string;
          /** 查询参数数组 */
          queryParams: {
          name: string;
          type: string;
        }[];
          /** 查询参数类型名称 */
          queryParamsType: string;
          /** API 请求方法(get/post 等) */
          apiMethod: string;
          /** API 返回值类型名称 */
          apiReturnType: string;
          /** 是否有请求体 */
          haveReqBody: boolean;
          /** 请求体数据类型名称 */
          dataParamsType: string;
          /** API 函数名称 */
          apiFunctionName: string;
          /** 扩展函数名称(use 开头) */
          extraFunctionName: string;
          /** API 路径 */
          apiPath: string;
          /** 将接口定义的类型转换为ts类型 */
          buildParameters: (
            params: ApiDetailParametersQuery[]
          ) => string;
          /** 日志函数 */
          log: (message: string) => void;
          /** 项目ID */
          projectId: number | string;
          /** 是否使用项目ID */
          useProjectId: boolean;
        }
  
        declare const options: CustomFunctionOptions;
      `;
const optionsProperties = [
  { label: 'pathParams', documentation: '路径参数数组' },
  { label: 'pathParamsType', documentation: '路径参数类型名称' },
  { label: 'queryParams', documentation: '查询参数数组' },
  { label: 'queryParamsType', documentation: '查询参数类型名称' },
  { label: 'apiMethod', documentation: 'API 请求方法(get/post 等)' },
  { label: 'apiReturnType', documentation: 'API 返回值类型名称' },
  { label: 'haveReqBody', documentation: '是否有请求体' },
  { label: 'dataParamsType', documentation: '请求体数据类型名称' },
  { label: 'apiFunctionName', documentation: 'API 函数名称' },
  { label: 'extraFunctionName', documentation: '扩展函数名称(use 开头)' },
  { label: 'apiPath', documentation: 'API 路径' },
  { label: 'buildParameters', documentation: '将接口定义的类型转换为ts类型' },
  { label: 'log', documentation: '日志函数' },
  { label: 'projectId', documentation: '项目ID' },
  { label: 'useProjectId', documentation: '是否使用项目ID' }
];
const defaultValue = '// 在此输入自定义内容';
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <a-page-header
      title="AutoApiGen"
      :subtitle="t('configPageTitle')"
      :show-back="false"
    ></a-page-header>

    <a-divider dashed margin="2px" />

    <div class="w-full flex-1 overflow-hidden overflow-y-auto">
      <a-form
        ref="formRef"
        :model="formConfig"
        @submit="handleSubmit"
        class="p-[20px]"
        :rules="formRules"
        :feedback="true"
        auto-label-width
      >
        <a-form-item :label="t('tip4')" class="relative">
          <a-input v-model="workspacePath" />
          <div class="absolute inset-0 z-30"></div>
        </a-form-item>
        <a-form-item
          field="appName"
          tooltip="Please enter username"
          :label="t('configInfoFrom.appLabel')"
        >
          <a-select v-model="formConfig.appName" placeholder="Please select ...">
            <a-option
              v-for="item in APP_LIST"
              :key="item.value"
              :value="item.value"
              :label="item.label"
              :disabled="item.disabled"
            ></a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="Authorization" :label="t('configInfoFrom.Authorization')">
          <a-input
            v-model="formConfig.Authorization"
            placeholder="please enter your Authorization..."
          />
        </a-form-item>
        <a-form-item field="path" :label="t('configInfoFrom.path')">
          <a-cascader
            v-model="formConfig.path"
            :options="foldersList"
            placeholder="Please select ..."
            path-mode
            allow-search
            :field-names="{ label: 'name', value: 'key' }"
            check-strictly
          />
        </a-form-item>
        <a-form-item field="projectId" :label="t('configInfoFrom.projectId')">
          <a-spin :loading="projectLoading" class="w-full">
            <div class="w-full flex justify-between">
              <a-cascader
                v-model="formConfig.projectId"
                :options="projectList"
                placeholder="Please select ..."
                path-mode
                allow-search
                :field-names="{ label: 'name', value: 'id' }"
              />
              <a-button type="outline" @click="getProjectList" class="w-auto">{{
                t('tip5')
              }}</a-button>
            </div>
          </a-spin>
        </a-form-item>
        <a-form-item
          field="model"
          tooltip="Please enter username"
          :label="t('configInfoFrom.model')"
        >
          <a-select v-model="formConfig.model" placeholder="Please select ...">
            <a-option
              v-for="item in API_MODEL"
              :key="item.value"
              :value="item.value"
              :label="item.label"
              :disabled="item.disabled"
            ></a-option>
          </a-select>
        </a-form-item>
        <a-form-item
          field="useProjectName"
          tooltip="是否将项目名做为文件夹目录（用于多项目同时生成时区分）"
          :label="t('configInfoFrom.useProjectName')"
        >
          <div class="w-100px">
            <a-switch type="round" v-model="formConfig.useProjectName" />
          </div>
        </a-form-item>
        <a-form-item
          field="useProjectId"
          tooltip="是否将项目ID生成到AXIOS的请求参数中，如：{ ...axiosConfig, projectId: 12345 }"
          label="是否使用项目ID"
        >
          <div class="w-100px">
            <a-switch type="round" v-model="formConfig.useProjectId" />
          </div>
        </a-form-item>
        <a-form-item
          field="useTypeExtension"
          tooltip="是否启用类型拓展，会在接口定义中添加：[key: string]: any"
          label="启用类型拓展"
        >
          <div class="w-100px">
            <a-switch type="round" v-model="formConfig.useTypeExtension" />
          </div>
        </a-form-item>
        <a-form-item
          field="alias"
          tooltip="使用别名配置，如：src: @, assets: @/assets, 会将路径中的src之前的路径替换为@"
          :label="t('configInfoFrom.alias')"
        >
            <a-input v-model="formConfig.alias" />
        </a-form-item>
        <a-form-item
          v-if="formConfig.model !== 'wx'"
          field="axiosPath"
          tooltip="输入axios引用路径（使用@等别名配置）"
          :label="t('configInfoFrom.axiosPath')"
        >
          <a-input v-model="formConfig.axiosPath" />
        </a-form-item>
        <a-form-item
          field="axiosReturnKey"
          tooltip="响应拦截中最终返回的属性，如有多个使用英文','分割"
          :label="t('configInfoFrom.axiosReturnKey')"
        >
          <a-input v-model="formConfig.axiosReturnKey" />
        </a-form-item>
        <a-form-item
          field="prettierSetting"
          tooltip="Please enter prettier setting"
          :label="t('configInfoFrom.prettierSetting')"
        >
          <a-textarea
            type="textarea"
            :auto-size="{
              minRows: 3,
              maxRows: 8
            }"
            v-model="formConfig.prettierSetting"
          ></a-textarea>
        </a-form-item>
        <div v-if="customModel">
          <a-form-item field="head" :label="t('configInfoFrom.head')">
            <a-textarea
              v-model="formConfig.head"
              placeholder="This is the contents of the textarea. This is the contents of the textarea. This is the contents of the textarea."
              :auto-size="{
                minRows: 3,
                maxRows: 8
              }"
            />
          </a-form-item>
          <a-form-item field="customReturn" :label="t('configInfoFrom.customReturn')">
            <Editor
              key="customReturn"
              v-model:modelValue="customReturnValue"
              :optionsType="optionsType"
              :optionsProperties="optionsProperties"
              :defaultValue="defaultValue"
            />
          </a-form-item>
          <a-form-item field="customExtraFunction" :label="t('configInfoFrom.customExtraFunction')">
            <Editor
              key="customExtraFunction"
              v-model:modelValue="customExtraFunctionValue"
              :optionsType="optionsType"
              :optionsProperties="optionsProperties"
              :defaultValue="defaultValue"
            />
          </a-form-item>
        </div>
        <div class="w-full h-10 flex justify-center">
          <a-button html-type="submit" type="primary" class="w-20">{{ t('save') }}</a-button>
        </div>
      </a-form>
    </div>
  </div>
</template>
