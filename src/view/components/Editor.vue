<script lang="ts" setup name="aceEditor">
import { onMounted, ref, defineProps, onBeforeUnmount } from 'vue';
import loader from '@monaco-editor/loader';
import type * as monacoType from 'monaco-editor';

// 使用type而不是interface以避免特殊名称的警告
type Props = {
  optionsType: string;
  optionsProperties: {
    label: string;
    documentation: string;
  }[];
  defaultValue: string;
  modelValue?: string; // 修改为可选字段
  language?: string;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:modelValue']);

const editorContainer = ref<HTMLElement | null>(null);
let editor: monacoType.editor.IStandaloneCodeEditor | null = null;

// 设置CDN或仅加载必要模块
loader.config({
  paths: {
    // 可选用CDN
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs'
  }
});

const setupMonaco = async () => {
  try {
    const monaco = await loader.init();
    // 使用从loader初始化获取的monaco实例

    // 设置黑色主题
    monaco.editor.defineTheme('custom-dark', {
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
      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        allowComments: true,
        schemas: [],
        enableSchemaRequest: false,
        schemaRequest: 'warning',
        schemaValidation: 'warning'
      });
    } else {
      // 更新的TypeScript定义，包含projectId属性
      const updatedOptionsType = `
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
        }
  
        declare const options: CustomFunctionOptions;
      `;

      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        updatedOptionsType,
        'ts:filename/customFunctionOptions.d.ts'
      );

      // 扩展属性列表，添加projectId
      const extendedProperties = [
        ...props.optionsProperties,
        { label: 'projectId', documentation: '项目ID' }
      ];

      // 添加代码补全项，带上属性的含义并调整顺序
      const adjustedProperties = extendedProperties.map((prop) => {
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
      monaco.languages.registerCompletionItemProvider('typescript', {
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
              suggestions: adjustedProperties.map(item => ({
                ...item,
                range: {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endColumn: position.column
                }
              }))
            };
          }

          return { suggestions: [] };
        }
      });
    }

    // 创建编辑器实例并应用黑色主题
    const language = props.language || 'typescript';
    
    // 编辑器配置
    const editorOptions: monacoType.editor.IStandaloneEditorConstructionOptions = {
      value: props.modelValue || props.defaultValue,
      language,
      automaticLayout: true,
      theme: 'custom-dark',
      wordWrap: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      readOnly: language === 'json', // JSON展示模式设为只读
      folding: true,
      lineNumbers: 'on' as monacoType.editor.LineNumbersType,
      renderLineHighlight: 'all',
      matchBrackets: 'always'
    };

    // 为JSON添加特殊配置
    if (language === 'json') {
      // 使用类型断言安全地添加这些属性
      (editorOptions as any).formatOnPaste = true;
      (editorOptions as any).formatOnType = true;
    }

    // 创建编辑器实例
    editor = monaco.editor.create(editorContainer.value as HTMLElement, editorOptions);

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
  } catch (error) {
    console.error('Monaco编辑器初始化失败:', error);
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
