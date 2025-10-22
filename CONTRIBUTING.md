# 贡献指南

感谢您对 AutoAPIGen 项目的关注！我们欢迎任何形式的贡献，包括但不限于：

- 🐛 报告 Bug
- 💡 提出新功能建议
- 📝 改进文档
- 🔧 提交代码修复或新功能
- 🧪 编写测试用例

## 开始之前

在开始贡献之前，请确保您已经：

1. 阅读了项目的 [README.md](./README.md)
2. 查看了现有的 [Issues](https://github.com/983033995/AutoAPIGen/issues) 和 [Pull Requests](https://github.com/983033995/AutoAPIGen/pulls)
3. 了解了项目的 [行为准则](./CODE_OF_CONDUCT.md)

## 开发环境设置

### 前置要求

- Node.js >= 16.0.0
- pnpm >= 7.0.0
- VSCode >= 1.74.0

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/983033995/AutoAPIGen.git
cd AutoAPIGen

# 安装依赖
pnpm install
```

### 开发命令

```bash
# 开发模式（监听文件变化）
pnpm run watch

# 编译项目
pnpm run compile

# 运行测试
pnpm run test

# 代码检查
pnpm run lint

# 类型检查
pnpm run typecheck
```

## 贡献流程

### 1. Fork 项目

点击项目页面右上角的 "Fork" 按钮，将项目 fork 到您的 GitHub 账户。

### 2. 创建分支

```bash
# 克隆您 fork 的项目
git clone https://github.com/YOUR_USERNAME/AutoAPIGen.git
cd AutoAPIGen

# 创建新分支
git checkout -b feature/your-feature-name
# 或者修复 bug
git checkout -b fix/your-bug-fix
```

### 3. 开发

- 遵循现有的代码风格和约定
- 确保代码通过所有测试
- 添加必要的测试用例
- 更新相关文档

### 4. 提交代码

```bash
# 添加文件
git add .

# 提交（请使用有意义的提交信息）
git commit -m "feat: 添加新功能描述"
# 或者
git commit -m "fix: 修复某个问题"
```

#### 提交信息规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整（不影响功能）
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具的变动

### 5. 推送分支

```bash
git push origin feature/your-feature-name
```

### 6. 创建 Pull Request

1. 访问您 fork 的项目页面
2. 点击 "New Pull Request"
3. 选择您的分支和目标分支（通常是 `main`）
4. 填写 PR 标题和描述
5. 提交 Pull Request

## Pull Request 指南

### PR 标题

- 使用清晰、简洁的标题
- 遵循提交信息规范
- 例如：`feat: 添加 Cookie 认证支持`

### PR 描述

请在 PR 描述中包含：

- 📝 **变更说明**：详细描述您做了什么
- 🎯 **解决的问题**：关联相关的 Issue（如 `Closes #123`）
- 🧪 **测试**：说明如何测试您的更改
- 📸 **截图**：如果涉及 UI 变更，请提供截图
- ⚠️ **注意事项**：任何需要特别注意的地方

### 代码审查

- 所有 PR 都需要经过代码审查
- 请耐心等待维护者的反馈
- 根据反馈及时修改代码
- 保持友好和建设性的讨论

## 报告 Bug

如果您发现了 bug，请：

1. 检查是否已有相关的 Issue
2. 如果没有，请创建新的 Issue
3. 使用 Bug 报告模板
4. 提供详细的复现步骤
5. 包含环境信息（VSCode 版本、操作系统等）

## 功能建议

如果您有新功能建议：

1. 检查是否已有相关的 Issue 或讨论
2. 创建新的 Feature Request Issue
3. 详细描述功能需求和使用场景
4. 说明为什么这个功能对项目有价值

## 代码风格

- 使用 TypeScript
- 遵循 ESLint 配置
- 使用 Prettier 格式化代码
- 保持代码简洁和可读性
- 添加适当的注释

## 测试

- 为新功能编写测试用例
- 确保所有测试通过
- 测试覆盖率应该保持在合理水平
- 使用 Vitest 作为测试框架

## 文档

- 更新相关的文档
- 确保 README.md 保持最新
- 为新功能添加使用说明
- 保持文档的清晰和准确

## 发布流程

项目维护者会负责版本发布：

1. 更新版本号
2. 更新 CHANGELOG.md
3. 创建 Git 标签
4. 发布到 VSCode 市场

## 获得帮助

如果您在贡献过程中遇到问题：

- 查看现有的 [Issues](https://github.com/983033995/AutoAPIGen/issues)
- 创建新的 Issue 寻求帮助
- 参与 [Discussions](https://github.com/983033995/AutoAPIGen/discussions)

## 致谢

感谢所有为 AutoAPIGen 项目做出贡献的开发者！您的贡献让这个项目变得更好。

---

再次感谢您的贡献！🎉