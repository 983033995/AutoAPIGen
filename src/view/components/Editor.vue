<script lang="ts" setup name="aceEditor">
import { onMounted, ref, defineProps } from 'vue';
import loader from '@monaco-editor/loader';

interface IProps {
  optionsType: string;
  optionsProperties: {
    label: string;
    documentation: string;
  }[];
  defaultValue: string;
  modelValue: string;
  language?: string;
}

const props = defineProps<IProps>();
const emit = defineEmits(['update:modelValue']);

const editorContainer = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

// 设置CDN或仅加载必要模块
loader.config({
  paths: {
    // 可选用CDN
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs'
  },
  // 或者仅加载必要模块
  'vs/editor/editor.main': {
    format: 'iife',
    moduleName: 'monaco',
    load: () => import('monaco-editor/esm/vs/editor/editor.api')
  }
});

const setupMonaco = async () => {
  const monacoInstance = await loader.init();

  // 设置黑色主题
  monacoInstance.editor.defineTheme('custom-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#1e1e1e'
    }
  });

  // 如果是JSON语言，进行特殊配置
  if (props.language === 'json') {
    // 配置JSON语言选项
    monacoInstance.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: true,
      schemas: [],
      enableSchemaRequest: false,
      schemaRequest: 'warning',
      schemaValidation: 'warning'
    });
  } else {
    // TypeScript相关配置
    const optionsTypeDefinition = `
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
            /** 日志函数 */
            log: (message: string) => void;
          }
    
          declare const options: CustomFunctionOptions;
        `;

    monacoInstance.languages.typescript.typescriptDefaults.addExtraLib(
      props.optionsType,
      'ts:filename/customFunctionOptions.d.ts'
    );

    // 添加代码补全项，带上属性的含义并调整顺序
    const adjustedProperties = props.optionsProperties.map((prop) => {
      let newLabel;
      if (prop.label === 'apiFunctionName') {
        newLabel = `API 函数名称 -> ${prop.label}`;
      } else {
        newLabel = `${prop.documentation.split(' ')[0]} - ${prop.label}`;
      }
      return {
        label: newLabel,
        kind: monaco.languages.CompletionItemKind.Property,
        insertText: prop.label,
        documentation: {
          value: prop.documentation
        }
      };
    });

    // 为 options 添加说明
    const optionsDocumentation = {
      value: '**自定义的函数选项对象，包含了与 API 相关的各种参数和函数。**'
    };

    // 注册TypeScript代码补全提供程序
    monacoInstance.languages.registerCompletionItemProvider('typescript', {
      triggerCharacters: ['.'],
      provideCompletionItems: (model, position, context, token) => {
        const textBeforeCursor = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: position.column - 'options'.length,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });

        if (textBeforeCursor === 'options') {
          return {
            suggestions: [
              {
                label: 'options',
                kind: monaco.languages.CompletionItemKind.Variable,
                insertText: 'options',
                documentation: optionsDocumentation
              },
              ...adjustedProperties
            ]
          };
        }

        return { suggestions: [] };
      }
    });
  }

  // 创建编辑器实例并应用黑色主题
  const language = props.language || 'typescript';
  
  // 编辑器配置
  const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    value: props.modelValue || props.defaultValue,
    language: language,
    automaticLayout: true,
    theme: 'custom-dark',
    wordWrap: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    readOnly: language === 'json', // JSON展示模式设为只读
    folding: true,
    lineNumbers: 'on',
    renderLineHighlight: 'all',
    matchBrackets: 'always',
    scrollbar: {
      useShadows: false,
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
      alwaysConsumeMouseWheel: false
    }
  };

  // 为JSON添加特殊配置
  if (language === 'json') {
    editorOptions.formatOnPaste = true;
    editorOptions.formatOnType = true;
  }

  // 创建编辑器实例
  editor = monacoInstance.editor.create(editorContainer.value as HTMLElement, editorOptions);

  // 如果是JSON，自动格式化内容
  if (language === 'json') {
    setTimeout(() => {
      editor?.getAction('editor.action.formatDocument')?.run();
    }, 300);
  }

  // 使用事件监听器来获取内容变化
  if (editor) {
    editor.onDidChangeModelContent(() => {
      emit('update:modelValue', editor?.getValue() || '');
    });
  }
};

onMounted(() => {
  setupMonaco();
});

onBeforeUnmount(() => {
  editor?.dispose();
});
</script>

<template>
  <div ref="editorContainer" style="height: 400px; width: 100%; text-align: left"></div>
</template>
