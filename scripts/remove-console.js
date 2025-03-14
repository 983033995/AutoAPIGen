const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

// 递归处理目录下的所有JS文件
async function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // 递归处理子目录
      await processDirectory(fullPath);
    } else if (path.extname(file) === '.js') {
      // 处理JS文件
      await processJsFile(fullPath);
    }
  }
}

// 处理单个JS文件
async function processJsFile(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const result = await minify(code, {
      compress: {
        drop_console: true,
        drop_debugger: true
      },
      mangle: false, // 不混淆变量名
      format: {
        comments: false // 移除注释
      }
    });
    
    if (result.code) {
      fs.writeFileSync(filePath, result.code);
      console.log(`Processed: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

// 从dist目录开始处理
(async () => {
  try {
    await processDirectory(path.resolve(__dirname, '../dist'));
    console.log('All console.log statements have been removed from compiled code.');
  } catch (error) {
    console.error('Error during processing:', error);
    process.exit(1);
  }
})(); 