<!--
 * @FilePath: /AutoAPIGen/README.md
 * @Description:
-->

# AutoAPIGen

<div align="center">

![GitHub release (latest by date)](https://img.shields.io/github/v/release/983033995/AutoAPIGen?style=flat-square)
![GitHub](https://img.shields.io/github/license/983033995/AutoAPIGen?style=flat-square)
![GitHub stars](https://img.shields.io/github/stars/983033995/AutoAPIGen?style=flat-square)
![GitHub forks](https://img.shields.io/github/forks/983033995/AutoAPIGen?style=flat-square)
![GitHub issues](https://img.shields.io/github/issues/983033995/AutoAPIGen?style=flat-square)
![GitHub pull requests](https://img.shields.io/github/issues-pr/983033995/AutoAPIGen?style=flat-square)
![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/AutoAPIGen.AutoAPIGen?style=flat-square&label=VS%20Code%20Downloads)
![Visual Studio Marketplace Rating](https://img.shields.io/visual-studio-marketplace/r/AutoAPIGen.AutoAPIGen?style=flat-square)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![VSCode](https://img.shields.io/badge/VSCode-007ACC?style=flat-square&logo=visual-studio-code&logoColor=white)](https://code.visualstudio.com/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

## 简介

AutoAPIGen 是一个面向 **Apifox + TypeScript 项目** 的 VS Code 插件，同时提供配套 `aag` CLI。它既能在编辑器里可视化浏览接口、生成 `apifox.ts` / `interface.ts`，也能让 AI 助手通过 CLI 查询接口分组、获取参数摘要并按需生成代码。

适合的场景很明确：

- 想把接口生成从“手写模板”变成“标准化产物”
- 团队里已经在用 Apifox，希望生成目录、命名、类型统一
- 希望让 Cursor、Claude Code、Copilot 这类 AI 先查本地、再查 Apifox、最后自动生成接口代码

[![Video Thumbnail](https://zhanght1992.oss-cn-hangzhou.aliyuncs.com/autoApiGen/img/image5.png)](https://zhanght1992.oss-cn-hangzhou.aliyuncs.com/autoApiGen/img/video2.mov)

## 1.3.0 亮点

- **新增 `aag` CLI**：支持 `init`、`query`、`groups`、`generate`、`ui`
- **新增交互式树钻取模式**：`aag ui` 或 `aag generate` 无参数时直接进入分组浏览和多选生成
- **AI 友好的查询输出**：`aag query --json` 会返回函数名、路径参数、Query、Body、`response200` 摘要
- **路径规则与插件完全对齐**：CLI 现在和插件共用同一套输出目录规则，`config.path` 按项目根目录拼接
- **AI 支持入口调整**：插件面板内新增 **AI 支持** / **使用文档** 快捷入口，`启用 AI 支持` 会直接打开文档引导页
- **补强复杂 Schema 解析**：`query --json` 已支持 body / response 中 `$ref` 与 `x-apifox-refs`

## 核心能力

1. **插件内一键生成**
   根据接口或分组生成请求函数和类型定义，支持直接查看接口详情、复制引用、快速插入代码。
2. **统一的目录与命名约定**
   生成路径统一为 `<config.path>/<appName>/[<projectName(PascalCase)>/]<groupPath>/`，适合多人协作和大型项目维护。
3. **多种生成模型**
   支持 `axios`、微信小程序、自定义模板，并支持 `head`、`customReturn`、`customExtraFunction`。
4. **AI 原生工作流**
   通过 `aag groups`、`aag query --json`、`aag generate`，让 AI 具备“先查本地，再决定是否生成”的能力。
5. **真实项目可落地**
   已在 Next.js 单仓项目和 pnpm monorepo 项目中长期使用，支持 `useProjectName`、`useProjectId`、自定义 `http` 封装与 React Query hook 生成。

## 典型工作流

### 1. 插件工作流

1. 在 VS Code 中打开项目并完成 `.vscode/autoApiGen.json` 配置
2. 选择项目、搜索接口、查看接口详情
3. 对单接口或整个分组执行“生成接口”
4. 在业务代码中直接引入生成好的 `apifox.ts` / `interface.ts`

### 2. AI / CLI 工作流

```bash
# 检查当前项目配置
aag init

# 先看分组树
aag groups

# 需要结构化信息时查 JSON 摘要
aag query 店铺 --json

# 直接生成指定接口
aag generate 324170228

# 无参数进入交互式树钻取浏览
aag generate
```

推荐的 AI 使用原则：

1. **先查本地已生成文件**
2. 本地没有，再执行 `aag groups` / `aag query --json`
3. 确认接口后，执行 `aag generate`

## 生成目录规则

当前插件与 CLI 完全一致，统一输出到：

```text
<config.path>/<appName>/[<projectName(PascalCase)>/]<分组(camelCase拼音)>/
├── apifox.ts
└── interface.ts
```

关键规则：

- `appName` 永远是第一层目录，例如 `apifox`
- `useProjectName: true` 时，会插入项目名目录，例如 `ChaoJiAPP`
- 分组目录会做清洗后再转拼音
- 历史上很多项目把 `path` 写成 `"/src/services"` 或 `"/apps/copilot/src/services"`，`1.3.0` 起 CLI 已与插件对齐，都会按**项目根目录**拼接，不再错误解析成系统根目录

## 真实项目示例

### Next.js 项目：`h5-nextjs`

配置文件里使用：

- `path: "/src/services"`
- `appName: "apifox"`
- `useProjectName: true`
- `useProjectId: true`
- 自定义 `http` 封装 + React Query hook 模板

真实生成结果类似：

```text
src/services/apifox/ChaoJiAPP/dianPu/
├── apifox.ts
└── interface.ts
```

生成后的 `apifox.ts` 中会同时包含：

- 原始请求函数，如 `getSuperAppShopList`
- React Query hook，如 `useGetSuperAppShopList`
- `queryOptions` 版本，如 `useOptiongetSuperAppShopList`

### Monorepo 项目：`admin-refactor`

配置文件里使用：

- `path: "/apps/copilot/src/services"`
- `appName: "apifox"`
- `useProjectName: true`
- `useProjectId: true`

真实生成结果类似：

```text
apps/copilot/src/services/apifox/AIBFFJieKou/huiHuaGuanLi/
├── apifox.ts
└── interface.ts
```

这说明 AutoAPIGen 不只适用于简单单仓项目，也适合：

- 多应用 monorepo
- 自定义 `http` 封装
- React Query / Mutation 二次封装
- 需要在请求配置中透传 `projectId` 的业务场景

## 文档与入口

- **完整文档**：[https://doc.du-ai.cn/](https://doc.du-ai.cn/)
- **AI / CLI 使用指南**：[https://doc.du-ai.cn/guide/ai-support](https://doc.du-ai.cn/guide/ai-support)
- **快速开始**：[https://doc.du-ai.cn/guide/quickstart](https://doc.du-ai.cn/guide/quickstart)

在插件面板里：

- 点击 **AI 支持**：打开 AI / CLI 接入文档
- 点击 **使用文档**：打开完整文档站

## 贡献

欢迎对本项目进行贡献。提交前建议先阅读仓库中的开发规范，并确认：

- CLI 与插件的路径规则保持一致
- 涉及 `SKILL.md` / CLI 命令签名的改动，同步更新文档
- 改动后执行：

```bash
pnpm --filter auto-api-gen-cli build
npx tsc -p tsconfig.extension.json --skipLibCheck --noEmit
```

相关链接：

- [报告 Bug](https://github.com/983033995/AutoAPIGen/issues/new?assignees=&labels=bug&template=bug_report.md)
- [提出功能建议](https://github.com/983033995/AutoAPIGen/issues/new?assignees=&labels=enhancement&template=feature_request.md)
- [提交 Pull Request](https://github.com/983033995/AutoAPIGen/pulls)

## 许可证

本项目采用 [MIT 许可证](LICENSE)。
