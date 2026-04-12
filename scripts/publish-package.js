#!/usr/bin/env node
/**
 * 发布 monorepo 子包：构建 -> 替换 workspace:* 为实际版本 -> 发布 -> 还原
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const publishCmd = args[0]; // 如 'pnpm publish --access public --no-git-checks'
const pkgDir = args[1]; // 如 'packages/core'
const pkgJsonPath = path.join(pkgDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
const version = pkg.version;

console.log(`Publishing ${pkg.name}@${version}...`);

// 1. 发布
try {
  execSync(`${publishCmd}`, { cwd: pkgDir, stdio: 'inherit' });
  console.log(`✓ ${pkg.name}@${version} published`);
} catch (err) {
  console.error(`✗ Failed to publish ${pkg.name}`);
  process.exit(1);
}
