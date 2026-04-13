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

`aag` CLI 让 AI 助手真正读懂你的接口。配置好后，AI 会按 AutoAPIGen 的真实工作流来处理接口任务——先查本地文件，再查 Apifox，最后才生成代码，而不是凭接口名瞎猜。

#### 安装

```bash
npm install -g @zhangheteng/aag-cli
aag --version
aag init
```

#### 命令速查

| 命令                                  | 作用                                     |
| ------------------------------------- | ---------------------------------------- |
| `aag init`                            | 检查当前项目配置                         |
| `aag groups`                          | 查看接口分组树和接口 ID                  |
| `aag groups --json`                   | 输出结构化分组树，适合 AI 读取           |
| `aag query <关键词>`                  | 搜索接口                                 |
| `aag query <关键词> --json`           | 输出结构化接口摘要（函数名、参数、响应） |
| `aag query --group <分组> --ids-only` | 只拿分组下接口 ID                        |
| `aag generate <ids...>`               | 生成指定接口                             |
| `aag ui`                              | 交互式树形浏览（慎用，优先用结构化命令） |

#### AI 决策流程

```
用户提到某个接口
      ↓
先检查本地是否已有 apifox.ts / interface.ts
      ↓
有 → 直接读取本地文件并使用

没有
  → 想看分组：aag groups / aag groups --json
  → 想看参数和响应：aag query <关键词> --json
  → 已知接口 ID：aag generate <id>
```

#### AI 工作原则

1. **先看本地，后查 CLI**：优先查找 `<config.path>/<appName>/[<projectName>/]<groupPath>/` 下是否已有生成文件
2. **只有本地没有时，才调用 `aag`**
3. **生成后再读一次文件**：生成完成后重新读取 `apifox.ts` 和 `interface.ts` 再写业务代码

#### 常见错误

- ❌ 本地已有生成文件时还重复执行 `aag query`
- ❌ 只凭接口名称猜函数名和参数结构
- ❌ 生成完代码却不回读生成文件
- ❌ 用户没要求就 `aag generate --all`
- ❌ 默认使用 `aag ui` 代替结构化命令

#### 配置到 AI 工具

把以下 skill 内容复制到你的 AI 工具规则文件中，即可让 AI 自动按上述流程工作：

| AI 工具        | 规则文件位置                                          |
| -------------- | ----------------------------------------------------- |
| Claude Code    | `CLAUDE.md`                                           |
| Cursor         | `.cursorrules` 或 `.cursor/rules/auto-api-gen.mdc`    |
| GitHub Copilot | `.github/copilot-instructions.md`                     |
| Windsurf       | `.windsurfrules` 或 `.windsurf/rules/auto-api-gen.md` |

建议用 marker 包住，方便后续更新：

```md
<!-- AutoAPIGen:skill:start -->

[把下方 skill 内容完整贴进来]

<!-- AutoAPIGen:skill:end -->
```

#### 可直接复制的 Skill

````md
---
name: auto-api-gen
description: 使用 AutoAPIGen 的 `aag` CLI 在已配置 `.vscode/autoApiGen.json` 的项目里查询 Apifox 接口并生成 TypeScript 服务代码。只要用户提到接口、API、Apifox、服务层、生成接口、调用某个接口、查看接口参数或返回值、批量生成接口、根据接口写请求代码，甚至只是说"帮我接一下这个接口""帮我找店铺列表接口""看看这个接口怎么调"时，都应该使用这个技能。
---

# AutoAPIGen

## 核心工作方式

### 原则 1：先看本地，后查 CLI

只要用户要调用、修改、理解某个接口，先检查本地是否已经存在生成结果。

优先查找：

```text
<config.path>/<appName>/[<projectName(PascalCase)>/]<groupPath>/
├── apifox.ts
└── interface.ts
```

如果本地已经有对应文件，直接读取并使用。

### 原则 2：只有本地没有时，才调用 `aag`

- 想看分组结构：`aag groups`
- 想让 AI 读取结构化接口摘要：`aag query <关键词> --json`
- 想只拿某个分组的接口 ID：`aag query --group <分组名> --ids-only`
- 想直接生成：`aag generate <ids...>`

### 原则 3：生成后再读一次文件

无论是单接口生成还是批量生成，生成完成后都要重新读取生成出来的 `apifox.ts` 和 `interface.ts`，再继续帮用户写调用代码。

## 推荐决策流程

```text
用户提到某个接口
      ↓
先检查本地是否已有 apifox.ts / interface.ts
      ↓
有 → 直接读取本地文件并使用

没有
  → 想看分组：aag groups / aag groups --json
  → 想看参数和响应：aag query <关键词> --json
  → 已知接口 ID：aag generate <id>
```

## 命令手册

| 命令                                  | 作用                               |
| ------------------------------------- | ---------------------------------- |
| `aag init`                            | 检查当前项目配置                   |
| `aag groups`                          | 查看接口分组树                     |
| `aag groups --json`                   | 输出结构化分组树，适合 AI 读取     |
| `aag query <关键词>`                  | 搜索接口                           |
| `aag query <关键词> --json`           | 输出结构化接口摘要                 |
| `aag query --group <分组> --ids-only` | 只拿分组下接口 ID                  |
| `aag query --limit 20`                | 限制返回数量                       |
| `aag generate <ids...>`               | 生成指定接口                       |
| `aag generate /api/user`              | 按路径生成                         |
| `aag generate --all`                  | 生成全部分组（慎用）               |
| `aag generate <id> --dry-run`         | 预览生成结果                       |
| `aag ui`                              | 交互式浏览（默认优先用结构化命令） |

## 执行任务时的输出要求

1. 本次是直接复用本地文件，还是新生成的
2. 最终使用的函数名
3. 关键参数类型来源于哪里
4. 生成文件或读取文件的路径
5. 如果做了假设，要明确说明

## 不要这样做

- 不要在本地已有生成文件时还重复执行 `aag query`
- 不要只凭接口名称猜函数名和参数结构
- 不要生成完代码却不回读生成文件
- 不要在用户没有要求的情况下直接 `aag generate --all`
- 不要默认使用 `aag ui` 代替结构化命令
````

配置完成后，验证 Skill 是否生效——在 AI 工具里问"帮我调用店铺列表接口"，AI 应该会优先检查本地文件，或者执行 `aag query 店铺 --json` 查询后再生成。

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
