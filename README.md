<!--
 * @FilePath: /AutoAPIGen/README.md
 * @Description: AutoAPIGen - Apifox API 代码生成工具
-->

# AutoAPIGen

<div align="center">

[![GitHub release](https://img.shields.io/github/v/release/983033995/AutoAPIGen?style=flat-square)](https://github.com/983033995/AutoAPIGen/releases)
[![VS Code Downloads](https://img.shields.io/visual-studio-marketplace/d/AutoAPIGen.AutoAPIGen?style=flat-square&label=Downloads)](https://marketplace.visualstudio.com/items?itemName=AutoAPIGen.AutoAPIGen)
[![License](https://img.shields.io/github/license/983033995/AutoAPIGen?style=flat-square)](LICENSE)

**告别手写 API 代码。从 Apifox 到 TypeScript，一键生成，AI 原生。**

[快速开始](#快速开始) · [功能特性](#功能特性) · [CLI 工具](#cli-工具) · [文档](https://doc.du-ai.cn/) · [AI 集成](https://doc.du-ai.cn/guide/ai-support)

</div>

---

## 你是否也这样度过每一天？

作为 TypeScript 开发者，接入新接口时，你是不是也在重复这些操作——手动复制 Apifox 的接口文档，逐字敲类型定义，几十个字段敲到一半眼睛发花，接口一变又得全改一遍。费时费力，还容易出错。

更难受的是，当你把项目交给 AI 助手，它根本不知道你有哪些接口、每个接口的参数是什么。AI 只能干瞪眼，代码还是得你自己写。

**AutoAPIGen 把这个流程倒过来——让 Apifox 直接生成 TypeScript 代码，AI 也能读懂你的接口。**

[![Video Thumbnail](https://zhanght1992.oss-cn-hangzhou.aliyuncs.com/autoApiGen/img/image5.png)](https://zhanght1992.oss-cn-hangzhou.aliyuncs.com/autoApiGen/img/video2.mov)

---

## 快速开始

### VS Code 插件（3 步搞定）

1. 在 VS Code 中搜索 `AutoAPIGen` 并安装
2. 配置 `.vscode/autoApiGen.json`（填写 Apifox 的 Authorization 和项目 ID）
3. 打开插件面板，选择项目，搜索接口，点击生成

### CLI 工具（AI 助手专用）

```bash
# 安装
npm install -g @zhangheteng/aag-cli

# 查看项目中所有接口分组
aag groups

# 结构化查询，AI 读取后直接知道接口信息
aag query 登录 --json

# 生成指定接口的 TypeScript 代码
aag generate 123456789

# 交互式选择（无参数时自动进入）
aag ui
```

---

## 工作原理

```text
Apifox API
    ↓
AutoAPIGen 拉取接口数据（Tree / Detail / Schema）
    ↓
解析 JSON Schema，生成 TypeScript 类型
    ↓
按模板生成代码（支持自定义 head / return / extraFunction）
    ↓
输出到项目目录
```

---

## 功能特性

### VS Code 插件：可视化操作

- **接口浏览**：树形结构展示 Apifox 分组，支持关键词搜索
- **一键生成**：生成 `apifox.ts` 请求函数 + `interface.ts` 类型定义
- **快速操作**：复制函数名、复制 import 语句、跳转到定义
- **实时预览**：查看接口详情、路径参数、请求体、响应结构

### CLI 工具：AI 原生集成

```bash
# 查看分组树，了解项目中有哪些接口
aag groups --json

# 结构化查询，返回函数名、参数、响应类型
aag query 用户 --json

# AI 生成原则：
# 1. 先查本地已生成文件
# 2. 本地没有，再查 aag groups
# 3. 用 aag query --json 获取详细信息
# 4. 最后用 aag generate 生成代码
```

支持的 AI 工具：Claude Code / Cursor / Copilot 及所有支持 `.cursorrules` / `.windsurfrules` / `CLAUDE.md` 的工具。

### 代码生成：类型安全，无后顾之忧

- **自动解析 JSON Schema**：支持 `$ref` 引用链递归解析，`x-apifox-refs` 和 `x-apifox-overrides` 也能智能处理
- **完整参数支持**：路径参数、Query 参数、Body 参数全部类型推导
- **多种生成模式**：axios（支持 React Query hook）、微信小程序、自定义模板
- **标准化输出**：

```
<项目根目录>/<config.path>/<appName>/[<项目名>/]<分组拼音>/
├── apifox.ts      # 请求函数
└── interface.ts   # 类型定义
```

---

## 适用场景

### 单体项目

- Next.js / React / Vue + TypeScript
- 直接在项目根目录生成 `src/services/apifox/`

### Monorepo 项目

- pnpm / npm workspaces 多应用
- 支持 `useProjectName: true`，按项目名生成子目录
- 示例：`apps/admin/src/services/apifox/AdminBackend/`

### AI 辅助编程

- AI 先查本地文件 → 再用 CLI 查 Apifox → 最后生成代码
- 全程无需打开 Apifox，AI 独立完成接口开发

---

## 技术栈

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![VSCode](https://img.shields.io/badge/VSCode-007ACC?style=flat-square&logo=visual-studio-code&logoColor=white)](https://code.visualstudio.com/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Apifox](https://img.shields.io/badge/Apifox-0099FF?style=flat-square)](https://apifox.com/)

</div>

- **VS Code 插件**：Vue 3 + TypeScript + TailwindCSS
- **CLI 工具**：Node.js + TypeScript + Commander.js + Inquirer
- **代码生成引擎**：TypeScript + Prettier（支持自定义模板）

---

## 相关链接

- [完整文档](https://doc.du-ai.cn/)
- [AI / CLI 集成指南](https://doc.du-ai.cn/guide/ai-support)
- [快速开始](https://doc.du-ai.cn/guide/quickstart)
- [报告 Bug](https://github.com/983033995/AutoAPIGen/issues)
- [功能建议](https://github.com/983033995/AutoAPIGen/issues/new?labels=enhancement)

---

## 许可证

[MIT License](LICENSE) · Copyright © 2024-2026 John张鹤腾
