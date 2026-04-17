const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const { execSync } = require('child_process');
const { builtinModules } = require('module');

const repoRoot = path.resolve(__dirname, '..');
const pkgPath = path.join(repoRoot, 'package.json');
const pkg = fs.readJsonSync(pkgPath);
const version = pkg.version;
const name = pkg.name || 'AutoAPIGen';
const npmRegistry = 'https://registry.npmmirror.com';
const distDir = path.join(repoRoot, 'dist');

const tmpRoot = path.join(os.tmpdir(), `autoapigen-vsix-${Date.now()}`);
const tmpDir = path.join(tmpRoot, 'package');

const run = (cmd, cwd) => {
  execSync(cmd, { stdio: 'inherit', cwd });
};

const builtinModuleSet = new Set([...builtinModules, ...builtinModules.map(name => `node:${name}`), 'vscode']);

const collectJsFiles = dir => {
  const files = [];
  const walk = currentDir => {
    for (const entry of fs.readdirSync(currentDir)) {
      const fullPath = path.join(currentDir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (fullPath.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  };

  walk(dir);
  return files;
};

const getRuntimePackageNames = () => {
  const packageNames = new Set();
  const jsFiles = collectJsFiles(distDir);
  const requirePattern = /require\(['"]([^'"]+)['"]\)/g;

  for (const file of jsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    for (const match of content.matchAll(requirePattern)) {
      const request = match[1];
      if (request.startsWith('.') || request.startsWith('/') || builtinModuleSet.has(request)) {
        continue;
      }
      packageNames.add(request);
    }
  }

  return [...packageNames].sort();
};

const getInstalledPackageVersion = (baseDir, packageName) => {
  const pkgJsonPath = path.join(baseDir, 'node_modules', packageName, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    return null;
  }

  return fs.readJsonSync(pkgJsonPath).version;
};

const createTempPackageJson = runtimeEntries => {
  const tempPkg = { ...pkg };

  delete tempPkg.devDependencies;
  delete tempPkg.files;

  tempPkg.dependencies = Object.fromEntries(
    runtimeEntries
      .map(depName => [depName, getInstalledPackageVersion(repoRoot, depName)])
      .filter(([, depVersion]) => Boolean(depVersion))
  );

  tempPkg.scripts = {
    package: 'vsce package --dependencies --no-yarn'
  };

  return tempPkg;
};

const copyFileIfExists = (src, destDir) => {
  if (fs.existsSync(src)) {
    fs.copySync(src, path.join(destDir, path.basename(src)));
  }
};

const copyDirIfExists = (src, destDir) => {
  if (fs.existsSync(src)) {
    fs.copySync(src, path.join(destDir, path.basename(src)));
  }
};

const main = () => {
  console.log('[package-vsix-npm] 先执行 vscode:prepublish，确保 dist 为最新构建产物');
  run('pnpm run vscode:prepublish', repoRoot);

  fs.ensureDirSync(tmpDir);
  const runtimeEntries = getRuntimePackageNames();

  fs.writeJsonSync(path.join(tmpDir, 'package.json'), createTempPackageJson(runtimeEntries), { spaces: 2 });
  copyFileIfExists(path.join(repoRoot, 'README.md'), tmpDir);
  copyFileIfExists(path.join(repoRoot, 'CHANGELOG.md'), tmpDir);
  copyFileIfExists(path.join(repoRoot, 'LICENSE'), tmpDir);
  copyFileIfExists(path.join(repoRoot, 'LICENSE.txt'), tmpDir);

  copyDirIfExists(path.join(repoRoot, 'dist'), tmpDir);
  copyDirIfExists(path.join(repoRoot, 'skills'), tmpDir);

  console.log(`[package-vsix-npm] 临时目录: ${tmpDir}`);
  console.log(`[package-vsix-npm] 使用 registry: ${npmRegistry}`);
  run(`npm install --omit=dev --ignore-scripts --no-fund --no-audit --registry=${npmRegistry}`, tmpDir);
  console.log(`[package-vsix-npm] 运行时入口依赖: ${runtimeEntries.join(', ')}`);
  console.log(`[package-vsix-npm] 运行时入口依赖数量: ${runtimeEntries.length}`);

  run('npm run package', tmpDir);

  const vsixName = `${name}-${version}.vsix`;
  const srcVsix = path.join(tmpDir, vsixName);
  const destVsix = path.join(repoRoot, vsixName);
  fs.copySync(srcVsix, destVsix);

  fs.removeSync(tmpRoot);
};

main();
