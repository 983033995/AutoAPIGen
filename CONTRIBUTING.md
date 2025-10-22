# 贡献指南

感谢您对 AutoAPIGen 项目的关注！我们欢迎并感谢所有形式的贡献。

## 🚀 快速开始

### 贡献方式

我们欢迎以下类型的贡献：

- 🐛 **Bug 报告**：发现问题并报告
- 💡 **功能建议**：提出新功能或改进建议
- 📝 **文档改进**：改善文档质量
- 🔧 **代码贡献**：修复 Bug 或实现新功能
- 🧪 **测试**：添加或改进测试用例
- 🌐 **翻译**：帮助翻译文档或界面

### 开发环境设置

1. **Fork 仓库**
   ```bash
   # 克隆您 fork 的仓库
   git clone https://github.com/YOUR_USERNAME/AutoAPIGen.git
   cd AutoAPIGen
   ```

2. **安装依赖**
   ```bash
   # 推荐使用 pnpm
   pnpm install
   
   # 或使用 npm
   npm install
   ```

3. **开发环境配置**
   ```bash
   # 编译 TypeScript
   pnpm run compile
   
   # 监听文件变化
   pnpm run watch
   ```

4. **在 VSCode 中调试**
   - 按 `F5` 启动扩展开发主机
   - 在新窗口中测试您的更改

## 📋 贡献流程

### 1. 创建 Issue

在开始编码之前，请先创建一个 Issue 来讨论您的想法：

- 🐛 [报告 Bug](https://github.com/983033995/AutoAPIGen/issues/new?template=bug_report.md)
- 💡 [功能请求](https://github.com/983033995/AutoAPIGen/issues/new?template=feature_request.md)

### 2. 开发流程

1. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或
   git checkout -b fix/your-bug-fix
   ```

2. **进行开发**
   - 遵循现有的代码风格
   - 添加必要的测试
   - 更新相关文档

3. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 添加新功能描述"
   ```

4. **推送分支**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **创建 Pull Request**
   - 使用我们的 [PR 模板](https://github.com/983033995/AutoAPIGen/compare)
   - 详细描述您的更改
   - 关联相关的 Issue

## 📝 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 提交类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### 提交格式

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### 示例

```bash
# 新功能
git commit -m "feat(api): 添加接口代码生成功能"

# Bug 修复
git commit -m "fix(webview): 修复页面加载问题"

# 文档更新
git commit -m "docs: 更新安装说明"
```

## 🔍 Pull Request 指南

### PR 检查清单

在提交 PR 之前，请确保：

- [ ] 代码遵循项目的编码规范
- [ ] 添加了必要的测试
- [ ] 所有测试都通过
- [ ] 更新了相关文档
- [ ] 提交信息遵循规范
- [ ] PR 描述清晰明了

### PR 模板要求

请使用我们提供的 PR 模板，包含：

1. **变更说明**：简要描述您的更改
2. **测试**：说明如何测试您的更改
3. **截图**：如果有 UI 变更，请提供截图
4. **关联 Issue**：引用相关的 Issue 编号

## 🐛 Bug 报告

### 报告前检查

- 搜索现有 Issues，确保问题未被报告
- 使用最新版本重现问题
- 收集详细的错误信息

### Bug 报告模板

请使用我们的 [Bug 报告模板](https://github.com/983033995/AutoAPIGen/issues/new?template=bug_report.md)，包含：

- 问题描述
- 复现步骤
- 期望行为
- 实际行为
- 环境信息
- 错误日志

## 💡 功能建议

### 建议前考虑

- 功能是否符合项目目标
- 是否有替代解决方案
- 功能的复杂度和维护成本

### 功能请求模板

请使用我们的 [功能请求模板](https://github.com/983033995/AutoAPIGen/issues/new?template=feature_request.md)，包含：

- 功能描述
- 使用场景
- 预期收益
- 实现建议

## 🎨 代码风格

### TypeScript 规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 配置
- 使用有意义的变量和函数名
- 添加适当的类型注解

### 代码格式

```bash
# 检查代码风格
pnpm run lint

# 自动修复格式问题
pnpm run lint --fix
```

### 命名规范

- **文件名**：使用 kebab-case（如：`api-generator.ts`）
- **类名**：使用 PascalCase（如：`ApiGenerator`）
- **函数名**：使用 camelCase（如：`generateApiCode`）
- **常量**：使用 UPPER_SNAKE_CASE（如：`DEFAULT_CONFIG`）

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定测试
pnpm test -- --grep "测试名称"
```

### 测试规范

- 为新功能添加单元测试
- 确保测试覆盖率不降低
- 使用描述性的测试名称
- 测试边界情况和错误处理

### 测试文件结构

```
src/
├── test/
│   ├── suite/
│   │   ├── extension.test.ts
│   │   └── api-generator.test.ts
│   └── runTest.ts
```

## 📚 文档

### 文档类型

- **README.md**：项目概述和快速开始
- **API 文档**：代码注释和 JSDoc
- **用户指南**：详细使用说明
- **开发文档**：架构和开发指南

### 文档规范

- 使用清晰简洁的语言
- 提供代码示例
- 保持文档与代码同步
- 支持中英文双语

## 🚀 发布流程

### 版本管理

我们使用 [Semantic Versioning](https://semver.org/)：

- **MAJOR**：不兼容的 API 更改
- **MINOR**：向后兼容的功能添加
- **PATCH**：向后兼容的 Bug 修复

### 发布检查清单

- [ ] 所有测试通过
- [ ] 文档已更新
- [ ] CHANGELOG 已更新
- [ ] 版本号已更新
- [ ] 创建 Release 标签

## 🤝 社区

### 沟通渠道

- **GitHub Issues**：Bug 报告和功能请求
- **GitHub Discussions**：一般讨论和问答
- **Pull Requests**：代码审查和讨论

### 行为准则

请遵循我们的 [行为准则](CODE_OF_CONDUCT.md)，创建一个友好和包容的社区环境。

## 📞 获得帮助

如果您需要帮助：

1. 查看 [文档](https://doc.du-ai.cn/)
2. 搜索现有的 [Issues](https://github.com/983033995/AutoAPIGen/issues)
3. 创建新的 [Discussion](https://github.com/983033995/AutoAPIGen/discussions)
4. 联系维护者

## 🙏 致谢

感谢所有为 AutoAPIGen 项目做出贡献的开发者！您的贡献让这个项目变得更好。

---

再次感谢您的贡献！🎉