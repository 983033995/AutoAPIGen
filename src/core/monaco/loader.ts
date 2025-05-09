/*
 * @FilePath: /AutoAPIGen/src/core/monaco/loader.ts
 * @Description: Monaco编辑器CDN加载器
 */
import loader from '@monaco-editor/loader';

// Monaco CDN配置对象
export interface MonacoConfig {
  cdnPath: string;
  localPath?: string;
  useLocalWhenCdnFails: boolean;
}

// 默认配置
const defaultConfig: MonacoConfig = {
  cdnPath: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs',
  useLocalWhenCdnFails: true
};

// 用于记录加载状态
let isFallbackMode = false;

// 手动实现的Monaco加载函数（当@monaco-editor/loader不可用时使用）
async function manualLoadMonaco(cdnPath: string): Promise<any> {
  // 如果window.monaco已经存在，直接返回
  if ((window as any).monaco) {
    return (window as any).monaco;
  }

  // 动态创建脚本和样式标签来加载Monaco
  return new Promise((resolve, reject) => {
    try {
      // 创建script标签加载Monaco编辑器
      const script = document.createElement('script');
      script.src = `${cdnPath}/loader.js`;
      script.async = true;
      script.onload = () => {
        // 使用window上的require加载Monaco
        (window as any).require.config({ paths: { vs: cdnPath } });
        (window as any).require(['vs/editor/editor.main'], (monaco: any) => {
          resolve(monaco);
        });
      };
      script.onerror = (err) => {
        reject(new Error(`无法加载Monaco: ${err}`));
      };
      
      // 添加样式标签
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = `${cdnPath}/editor/editor.main.css`;
      
      // 将标签添加到文档中
      document.head.appendChild(link);
      document.head.appendChild(script);
    } catch (error) {
      reject(error);
    }
  });
}

// 配置Monaco加载器
export function configureMonacoLoader(config: Partial<MonacoConfig> = {}) {
  // 合并配置
  const finalConfig: MonacoConfig = { ...defaultConfig, ...config };
  
  try {
    // 尝试使用@monaco-editor/loader
    // 配置CDN路径
    loader.config({
      paths: {
        vs: finalConfig.cdnPath
      },
      // 如果CDN加载失败，尝试使用本地版本
      monaco: (window as any).monaco
    });
  } catch (error) {
    console.warn('@monaco-editor/loader不可用，将使用内联实现', error);
  }
  
  return finalConfig;
}

// 加载Monaco编辑器
export async function loadMonaco(config: Partial<MonacoConfig> = {}) {
  const finalConfig = configureMonacoLoader(config);
  
  try {
    // 先尝试从CDN加载 (优先使用@monaco-editor/loader如果可用)
    try {
      return await loader.init();
    } catch (loaderError) {
      console.log('使用内联加载器加载Monaco');
      return await manualLoadMonaco(finalConfig.cdnPath);
    }
  } catch (error) {
    console.warn('从CDN加载Monaco失败，尝试使用本地版本', error);
    isFallbackMode = true;
    
    // 如果配置了本地路径且允许回退，尝试使用本地版本
    if (finalConfig.useLocalWhenCdnFails && finalConfig.localPath) {
      try {
        // 在极简离线模式下，直接动态导入本地文件
        const monaco = await import(/* @vite-ignore */ finalConfig.localPath + '/editor/editor.main.js');
        return monaco;
      } catch (fallbackError) {
        console.error('加载本地Monaco也失败', fallbackError);
        
        // 使用TextArea替代
        return createFallbackEditor();
      }
    }
    
    // 如果都失败，则抛出错误
    throw new Error('Monaco Editor加载失败');
  }
}

// 创建极简的回退编辑器
function createFallbackEditor() {
  // 模拟Monaco接口的基本功能，使用textarea
  return {
    editor: {
      create: (domElement: HTMLElement, options: any) => {
        console.warn('使用基本文本编辑器替代Monaco');
        
        domElement.style.overflow = 'auto';
        domElement.style.border = '1px solid #ccc';
        domElement.style.borderRadius = '4px';
        domElement.style.padding = '8px';
        domElement.style.backgroundColor = '#f5f5f5';
        
        const textarea = document.createElement('textarea');
        textarea.style.width = '100%';
        textarea.style.height = '100%';
        textarea.style.minHeight = '300px';
        textarea.style.resize = 'vertical';
        textarea.style.fontFamily = 'monospace';
        
        if (options && options.value) {
          textarea.value = options.value;
        }
        
        domElement.appendChild(textarea);
        
        // 定义简单的事件回调
        const changeListeners: Array<(e: any) => void> = [];
        
        textarea.addEventListener('input', () => {
          changeListeners.forEach(cb => cb({ changes: [] }));
        });
        
        // 返回模拟编辑器对象
        return {
          getValue: () => textarea.value,
          setValue: (value: string) => { textarea.value = value; },
          onDidChangeModelContent: (cb: (e: any) => void) => {
            changeListeners.push(cb);
            return { dispose: () => {} };
          },
          dispose: () => {},
          layout: () => {},
          focus: () => textarea.focus()
        };
      }
    },
    languages: {
      json: { json: true },
      typescript: { typescript: true },
      javascript: { javascript: true },
    }
  };
}

// 导出到window对象供WebView使用
export function injectMonacoLoaderScript(cdnPath: string, localPath?: string) {
  return `
    window.monacoConfig = {
      cdnPath: '${cdnPath}',
      localPath: '${localPath || ''}',
      useLocalWhenCdnFails: ${Boolean(localPath)}
    };
    
    // 手动加载Monaco的函数
    window.manualLoadMonaco = async function(cdnPath) {
      // 如果window.monaco已经存在，直接返回
      if (window.monaco) {
        return window.monaco;
      }
      
      // 动态创建脚本和样式标签来加载Monaco
      return new Promise((resolve, reject) => {
        try {
          // 创建script标签加载Monaco编辑器
          const script = document.createElement('script');
          script.src = cdnPath + '/loader.js';
          script.async = true;
          script.onload = () => {
            // 使用window上的require加载Monaco
            window.require.config({ paths: { vs: cdnPath } });
            window.require(['vs/editor/editor.main'], (monaco) => {
              resolve(monaco);
            });
          };
          script.onerror = (err) => {
            reject(new Error('无法加载Monaco: ' + err));
          };
          
          // 添加样式标签
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.type = 'text/css';
          link.href = cdnPath + '/editor/editor.main.css';
          
          // 将标签添加到文档中
          document.head.appendChild(link);
          document.head.appendChild(script);
        } catch (error) {
          reject(error);
        }
      });
    };
    
    // 动态加载Monaco
    window.loadMonacoEditor = async function() {
      try {
        // 先尝试从CDN加载
        const monaco = await import(window.monacoConfig.cdnPath + '/editor/editor.main.js').catch(async () => {
          console.log('直接import失败，尝试使用手动加载器');
          return await window.manualLoadMonaco(window.monacoConfig.cdnPath);
        });
        return monaco;
      } catch (error) {
        console.warn('从CDN加载Monaco失败，尝试使用本地版本');
        if (window.monacoConfig.useLocalWhenCdnFails && window.monacoConfig.localPath) {
          try {
            // 加载本地版本
            const monaco = await import(window.monacoConfig.localPath + '/editor/editor.main.js');
            return monaco;
          } catch (fallbackError) {
            console.error('加载本地Monaco也失败，使用基本文本编辑代替');
            
            // 返回一个基本的编辑器实现
            return {
              editor: {
                create: function(element, options) {
                  element.style.overflow = 'auto';
                  element.style.border = '1px solid #ccc';
                  element.style.padding = '8px';
                  
                  const textarea = document.createElement('textarea');
                  textarea.style.width = '100%';
                  textarea.style.height = '300px';
                  textarea.style.fontFamily = 'monospace';
                  if (options && options.value) {
                    textarea.value = options.value;
                  }
                  
                  element.appendChild(textarea);
                  
                  // 模拟编辑器API
                  return {
                    getValue: function() { return textarea.value; },
                    setValue: function(value) { textarea.value = value; },
                    onDidChangeModelContent: function(cb) {
                      textarea.oninput = function() { cb({ changes: [] }); };
                      return { dispose: function() {} };
                    },
                    dispose: function() {},
                    layout: function() {}
                  };
                }
              },
              languages: {
                json: { json: true },
                typescript: { typescript: true }
              }
            };
          }
        } else {
          throw new Error('Monaco Editor加载失败');
        }
      }
    };
  `;
} 