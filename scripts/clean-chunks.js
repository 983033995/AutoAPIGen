/*
 * @FilePath: /AutoAPIGen/scripts/clean-chunks.js
 * @Description: 清理不必要的编译产物，减少插件体积
 */
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

// 要保留的关键文件
const ESSENTIAL_FILES = [
  // 主入口文件
  'dist/extension.js',
  // Web视图入口
  'dist/compiled/index.es.js',
  'dist/compiled/config.es.js',
  'dist/compiled/api.es.js',
  // 样式
  'dist/compiled/style.css',
  'dist/output.css',
  // 资源
  'dist/compiled/default.png'
];

// 保留的vendor chunk正则模式
const KEEP_CHUNKS_PATTERNS = [
  // 核心功能相关
  /vendor-vue\.(es|cjs)\.js$/,
  /arco\.(es|cjs)\.js$/,
  /index\.(es|cjs)\.js$/,
  /config\.(es|cjs)\.js$/,
  /api\.(es|cjs)\.js$/,
];

async function cleanupChunks() {
  console.log('开始清理不必要的编译产物...');
  
  // 获取dist目录下的所有文件
  const getFiles = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat && stat.isDirectory()) {
        results = results.concat(getFiles(fullPath));
      } else {
        results.push(fullPath);
      }
    });
    
    return results;
  };
  
  // 获取dist下所有文件
  const allFiles = getFiles(path.resolve(__dirname, '../dist'));
  
  // 检查每个文件是否为关键文件或匹配保留模式
  const filesToDelete = allFiles.filter(file => {
    // 转换为相对路径
    const relativePath = path.relative(path.resolve(__dirname, '..'), file);
    
    // 检查是否为关键文件
    if (ESSENTIAL_FILES.includes(relativePath)) {
      return false;
    }
    
    // 检查是否匹配保留的chunk模式
    if (KEEP_CHUNKS_PATTERNS.some(pattern => pattern.test(file))) {
      return false;
    }
    
    // Monaco离线版不删除
    if (file.includes('dist/monaco/')) {
      return false;
    }
    
    // 如果包含editor字样且是大文件(>500KB)，则删除
    if (file.includes('editor') && fs.statSync(file).size > 500 * 1024) {
      return true;
    }
    
    // 删除多余的.cjs.js文件(保留.es.js)
    if (file.endsWith('.cjs.js') && !KEEP_CHUNKS_PATTERNS.some(pattern => pattern.test(file))) {
      return true;
    }
    
    // 可选：删除source maps
    if (file.endsWith('.map')) {
      return true;
    }
    
    // 默认保留
    return false;
  });
  
  // 删除文件
  let totalSaved = 0;
  for (const file of filesToDelete) {
    try {
      const fileSize = fs.statSync(file).size;
      fs.unlinkSync(file);
      totalSaved += fileSize;
      console.log(`已删除: ${file} (${(fileSize / 1024).toFixed(2)} KB)`);
    } catch (error) {
      console.error(`删除失败: ${file}`, error);
    }
  }
  
  console.log(`清理完成，共删除 ${filesToDelete.length} 个文件，节省约 ${(totalSaved / 1024 / 1024).toFixed(2)} MB`);
}

// 执行清理
cleanupChunks().catch(err => {
  console.error('清理失败:', err);
  process.exit(1);
}); 