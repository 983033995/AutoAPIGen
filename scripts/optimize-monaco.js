/*
 * @FilePath: /AutoAPIGen/scripts/optimize-monaco.js
 * @Description: Monaco编辑器离线包优化脚本 - 极简版
 */
const fs = require('fs-extra');
const path = require('path');
const https = require('https');

// 下载文件函数
function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destination, () => {});
      reject(err);
    });
  });
}

// 创建极简版离线文件
async function createMinimalOfflineFile(destPath) {
  // 创建一个最小化的占位文件，仅用于提示用户需要联网
  const content = `
  // Monaco Editor离线回退模块
  // 此文件是一个极简版的占位文件
  self.MonacoEnvironment = {
    baseUrl: '',
  };
  console.warn('Monaco Editor需要从CDN加载，当前使用极简离线版本');
  
  // 提供最基本的编辑器功能
  export function create(domElement, options) {
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
    
    return {
      getValue: () => textarea.value,
      setValue: (value) => { textarea.value = value; },
      onDidChangeModelContent: (cb) => {
        textarea.addEventListener('input', () => cb({ changes: [] }));
        return { dispose: () => {} };
      },
      dispose: () => {},
      layout: () => {},
      focus: () => textarea.focus()
    };
  }
  
  export default { create };
  `.trim();
  
  await fs.writeFile(destPath, content, 'utf8');
}

// 优化Monaco大小
async function optimizeMonaco() {
  console.log('开始创建Monaco Editor极简离线版...');
  
  const monacoDestDir = path.resolve(__dirname, '../dist/monaco');
  const editorDir = path.join(monacoDestDir, 'editor');
  
  // 确保目标目录存在
  await fs.ensureDir(monacoDestDir);
  await fs.ensureDir(editorDir);
  
  // 创建主要文件 - 极简版
  await createMinimalOfflineFile(path.join(editorDir, 'editor.main.js'));
  
  // 创建必要的CSS文件
  const minimalCss = 'textarea { width: 100%; min-height: 200px; font-family: monospace; padding: 8px; }';
  await fs.writeFile(path.join(editorDir, 'editor.main.css'), minimalCss, 'utf8');
  
  console.log('Monaco极简离线版创建完成');
}

// 执行优化
optimizeMonaco().catch(err => {
  console.error('Monaco优化失败:', err);
  process.exit(1);
}); 