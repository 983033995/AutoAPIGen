<script lang="ts" setup name="aceEditor">
import * as monaco from "monaco-editor";
import loader from "@monaco-editor/loader";

interface IProps {
  optionsType: string;
  optionsProperties: {
    label: string;
    documentation: string;
  }[];
  defaultValue: string;
  modelValue: string;
}

const props = defineProps<IProps>();
const emit = defineEmits(["update:modelValue"]);

const editorContainer = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

const setupMonaco = async () => {
  const monacoInstance = await loader.init();

  // 设置黑色主题
  monacoInstance.editor.defineTheme("custom-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#1e1e1e",
    },
  });

  // 添加自定义的 options 变量和类型
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
    "ts:filename/customFunctionOptions.d.ts"
  );

  // 添加代码补全项，带上属性的含义并调整顺序
  const optionsProperties = [
    { label: "pathParams", documentation: "路径参数数组" },
    { label: "pathParamsType", documentation: "路径参数类型名称" },
    { label: "queryParams", documentation: "查询参数数组" },
    { label: "queryParamsType", documentation: "查询参数类型名称" },
    { label: "apiMethod", documentation: "API 请求方法(get/post 等)" },
    { label: "apiReturnType", documentation: "API 返回值类型名称" },
    { label: "haveReqBody", documentation: "是否有请求体" },
    { label: "dataParamsType", documentation: "请求体数据类型名称" },
    { label: "apiFunctionName", documentation: "API 函数名称" },
    { label: "extraFunctionName", documentation: "扩展函数名称(use 开头)" },
    { label: "apiPath", documentation: "API 路径" },
    { label: "log", documentation: "日志函数" },
  ];

  const adjustedProperties = props.optionsProperties.map((prop) => {
    let newLabel;
    if (prop.label === "apiFunctionName") {
      newLabel = `API 函数名称 -> ${prop.label}`;
    } else {
      newLabel = `${prop.documentation.split(" ")[0]} - ${prop.label}`;
    }
    return {
      label: newLabel,
      kind: monaco.languages.CompletionItemKind.Property,
      insertText: prop.label,
      documentation: {
        value: prop.documentation,
      },
    };
  });

  // 为 options 添加说明
  const optionsDocumentation = {
    value: "**自定义的函数选项对象，包含了与 API 相关的各种参数和函数。**",
  };

  // 创建编辑器实例并应用黑色主题
  editor = monacoInstance.editor.create(editorContainer.value as HTMLElement, {
    value: props.modelValue || props.defaultValue,
    language: "typescript",
    automaticLayout: true,
    theme: "custom-dark",
    wordWrap: "on",
    minimap: { enabled: false },
  });
  
  // 使用事件监听器来获取内容变化
  if (editor) {
    editor.onDidChangeModelContent(() => {
      emit('update:modelValue', editor.getValue());
      console.log('--------', props.modelValue, '-------')
    });
  }

  monacoInstance.languages.registerCompletionItemProvider("typescript", {
    triggerCharacters: ["."],
    provideCompletionItems: (model, position) => {
      const textBeforeCursor = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: position.column - "options".length,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      if (textBeforeCursor === "options") {
        return {
          suggestions: [
            {
              label: "options",
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: "options",
              documentation: optionsDocumentation,
            },
            ...adjustedProperties,
          ],
        };
      }

      return { suggestions: [] };
    },
  });
};

onMounted(() => {
  setupMonaco();
});

onBeforeUnmount(() => {
  editor?.dispose();
});
</script>

<template>
  <div
    ref="editorContainer"
    style="height: 400px; width: 100%; text-align: left"
  ></div>
</template>