---
name: auto-api-gen
description: 使用 AutoAPIGen 的 `aag` CLI 在已配置 `.vscode/autoApiGen.json` 的项目里查询 Apifox 接口并生成 TypeScript 服务代码。只要用户提到接口、API、Apifox、服务层、生成接口、调用某个接口、查看接口参数或返回值、批量生成接口、根据接口写请求代码，甚至只是说“帮我接一下这个接口”“帮我找店铺列表接口”“看看这个接口怎么调”时，都应该使用这个技能。尤其当任务需要先判断本地是否已有 `apifox.ts` / `interface.ts`，再决定是否查询或生成代码时，必须使用这个技能。
---

# AutoAPIGen

## 这个技能解决什么问题

这个技能让 AI 按 AutoAPIGen 的真实工作流来处理接口相关任务，而不是凭接口名猜参数或直接手写请求代码。

它适合的任务包括：

- 找某个接口在哪个分组
- 看接口的 Query、Body、响应结构
- 生成一个接口或一组接口
- 读取已经生成好的 `apifox.ts` / `interface.ts`
- 在业务代码里正确引用生成好的函数和类型

## 前提条件

开始前先确认两件事：

1. 当前项目根目录存在 `.vscode/autoApiGen.json`
2. 当前环境已经安装 `aag` CLI

如果配置文件不存在，先告诉用户需要在 VS Code 插件里完成 AutoAPIGen 配置。

## 核心工作方式

### 原则 1：先看本地，后查 CLI

只要用户要调用、修改、理解某个接口，先检查本地是否已经存在生成结果。

优先查找：

```text
<config.path>/<appName>/[<projectName(PascalCase)>/]<groupPath>/
├── apifox.ts
└── interface.ts
```

如果本地已经有对应文件：

- 直接读取 `apifox.ts`
- 直接读取 `interface.ts`
- 用本地文件回答问题或继续写业务代码

这样更快，也能避免重复生成和误判参数。

### 原则 2：只有本地没有时，才调用 `aag`

当本地不存在对应生成文件时，再根据任务选择 CLI 命令：

- 想看分组结构：`aag groups`
- 想让 AI 读取结构化接口摘要：`aag query <关键词> --json`
- 想只拿某个分组的接口 ID：`aag query --group <分组名> --ids-only`
- 想直接生成：`aag generate <ids...>`

### 原则 3：生成后再读一次文件

无论是单接口生成还是批量生成，生成完成后都要重新读取生成出来的 `apifox.ts` 和 `interface.ts`，再继续帮用户写调用代码。

不要在生成完成前就假设：

- 函数名一定是什么
- Query / Body 类型一定是什么
- 返回值一定是什么

## 推荐决策流程

```text
用户提到某个接口
      ↓
先检查本地是否已有 apifox.ts / interface.ts
      ↓
有
  → 直接读取本地文件并使用

没有
  → 先决定是看分组还是看接口摘要
      ↓
  需要看分组
    → aag groups / aag groups --json

  需要看参数和响应
    → aag query <关键词> --json

  已经知道目标接口 ID
    → aag generate <id>

  已经知道目标分组下的一组 ID
    → aag generate <id1> <id2> ...
```

## 命令手册

### 1. 检查配置

```bash
aag init
```

用来确认当前项目配置是否可读，重点看：

- `appName`
- `projectId`
- `path`

### 2. 查看分组

```bash
aag groups
aag groups --json
```

何时使用：

- 用户只知道业务分组，不知道接口名
- 想整组生成一批接口
- 需要先建立“这个接口属于哪个分组”的上下文

### 3. 查询接口

```bash
aag query
aag query <keyword>
aag query <keyword> --json
aag query --group <groupName> --ids-only
aag query --limit 20
```

何时使用：

- 用户给了接口关键词，如“支付”“店铺列表”“会话创建”
- 需要知道 Query、Body、`response200`
- 需要给 AI 一个结构化摘要，而不是原始冗长详情

### 4. 生成代码

```bash
aag generate 123456
aag generate 111 222 333 444
aag generate /api/user
aag generate --all
aag generate 123456 --dry-run
```

何时使用：

- 已经知道目标接口 ID
- 已经从分组结果里拿到一组接口 ID
- 想预览生成落点时，用 `--dry-run`

### 5. 交互式浏览

```bash
aag ui
```

这是给人用的交互式入口。只有当用户明确希望在终端里自己浏览树形结构时再用。

默认情况下，AI 更应该优先使用非交互式命令。

## 关键输出结构

### `aag query --json` 最值得看的字段

重点关注 `summary`：

- `functionName`
- `method`
- `path`
- `pathParams`
- `queryParams`
- `body`
- `response200`

这些字段足够让 AI 判断：

- 生成出来的函数大概率叫什么
- 调用时需要哪些参数
- 返回值顶层结构是什么

### 生成目录规则

统一目录结构：

```text
<config.path>/<appName>/[<projectName(PascalCase)>/]<groupPath>/
├── apifox.ts
└── interface.ts
```

补充理解：

- `appName` 一般是 `apifox`
- `useProjectName: true` 时会插入项目名目录
- 分组目录会按插件规则转换

## 配置里最关键的字段

`.vscode/autoApiGen.json` 里最值得关心的是：

| 字段                  | 作用                           |
| --------------------- | ------------------------------ |
| `appName`             | 生成目录第一层名称             |
| `projectId`           | 当前项目 ID                    |
| `path`                | 生成代码的基础目录             |
| `model`               | 代码模板，如 `axios`、`custom` |
| `axiosPath`           | 自定义请求实例导入             |
| `axiosReturnKey`      | 返回值解包字段                 |
| `head`                | 文件头部导入                   |
| `customReturn`        | 自定义请求函数模板             |
| `customExtraFunction` | 自定义附加函数模板             |
| `useProjectName`      | 是否在目录中插入项目名         |
| `useProjectId`        | 是否在请求配置里带上项目 ID    |

## 执行任务时的输出要求

当你使用这个技能帮助用户时，尽量给出这些信息：

1. **本次是直接复用本地文件，还是新生成的**
2. **最终使用的函数名**
3. **关键参数类型来源于哪里**
4. **生成文件或读取文件的路径**
5. **如果做了假设，要明确说明**

不要只说“我帮你接好了”，而不告诉用户你是基于本地现有文件，还是基于新生成文件完成的。

## 示例

### 示例 1：用户说“帮我调用店铺列表接口”

处理顺序：

1. 先检查本地是否已有相关目录，如 `.../dianPu/apifox.ts`
2. 如果有，直接读本地文件
3. 如果没有，执行：

```bash
aag query 店铺 --json
```

4. 确认接口后执行：

```bash
aag generate 324170228
```

5. 再读取生成后的文件，写最终调用代码

### 示例 2：用户说“把支付分组整组生成”

处理顺序：

```bash
aag groups --json
aag generate 111 222 333 444 555
```

### 示例 3：用户说“看一下这个接口返回什么字段”

优先选择：

```bash
aag query <关键词> --json
```

如果本地已有 `interface.ts`，则直接读取 `interface.ts` 更快更准。

## 不要这样做

- 不要在本地已有生成文件时还重复执行 `aag query`
- 不要只凭接口名称猜函数名和参数结构
- 不要生成完代码却不回读生成文件
- 不要在用户没有要求的情况下直接 `aag generate --all`
- 不要默认使用 `aag ui` 代替结构化命令
