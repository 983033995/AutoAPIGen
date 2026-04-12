#!/usr/bin/env node
/**
 * 发布前处理：检测已发布版本，替换 workspace:* 为实际版本，发布后还原
 * 用法: node scripts/pre-publish.js <package-dir> [publish-cmd]
 */
const { execSync } = require('child_process');
const https = require('https');

const pkgDir = process.argv[2];
const publishCmd = process.argv.slice(3).join(' ') || 'npm publish --access public';

function getPublishedVersion(name) {
  return new Promise((resolve) => {
    const url = `https://registry.npmjs.org/${name.replace('/', '%2F')}/latest`;
    https.get(url, { headers: { 'accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data).version);
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

(async () => {
  const fs = require('fs');
  const path = require('path');

  const pkgJsonPath = path.join(pkgDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const backup = JSON.stringify(pkg, null, 2);
  const version = pkg.version;

  // 检查是否已发布
  const publishedVersion = await getPublishedVersion(pkg.name);
  if (publishedVersion === version) {
    console.log(`⏭  ${pkg.name}@${version} already published, skipping`);
    return;
  }

  // 替换 workspace:* 为已安装的实际版本
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const [name, spec] of Object.entries(deps)) {
    if (spec === 'workspace:*' || spec === 'workspace:^' || spec === 'workspace:~') {
      const localPath = path.join(pkgDir, 'node_modules', name, 'package.json');
      if (fs.existsSync(localPath)) {
        const localPkg = JSON.parse(fs.readFileSync(localPath, 'utf8'));
        const resolved = spec.replace('workspace:*', `^${localPkg.version}`)
          .replace('workspace:^', `^${localPkg.version}`)
          .replace('workspace:~', `~${localPkg.version}`);
        pkg.dependencies[name] = resolved;
        console.log(`  ${name}: workspace:* → ${resolved}`);
      }
    }
  }

  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n');

  try {
    console.log(`\nPublishing ${pkg.name}@${version}...`);
    execSync(publishCmd, { cwd: pkgDir, stdio: 'inherit' });
    console.log(`\n✓ ${pkg.name}@${version} published`);
  } finally {
    fs.writeFileSync(pkgJsonPath, backup);
    console.log('package.json 已还原');
  }
})();
