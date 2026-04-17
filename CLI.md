# AutoAPIGen CLI 工具

AutoAPIGen CLI 让 AI 助手真正读懂你的接口。配置好后，AI 会按 AutoAPIGen 的真实工作流来处理接口任务——先查本地文件，再查 Apifox，最后才生成代码，而不是凭接口名瞎猜。

## 安装

```bash
# 全局安装
npm install -g @zhangheteng/aag-cli

# 验证安装
aag --version

# 初始化配置（确保 .vscode/autoApiGen.json 存在）
aag init
```

## 命令速查

| 命令                                  | 作用                                     |
| ------------------------------------- | ---------------------------------------- |
| `aag init`                            | 检查当前项目配置                         |
| `aag groups`                          | 查看接口分组树和接口 ID                  |
| `aag groups --json`                   | 输出结构化分组树，适合 AI 读取           |
| `aag query <关键词>`                  | 搜索接口                                 |
| `aag query <关键词> --json`           | 输出结构化接口摘要（函数名、参数、响应） |
| `aag query --group <分组> --ids-only` | 只拿分组下接口 ID                        |
| `aag query --limit 20`                | 限制返回数量                             |
| `aag generate <ids...>`               | 生成指定接口                             |
| `aag generate /api/user`              | 按路径生成                               |
| `aag generate --all`                  | 生成全部分组（慎用）                     |
| `aag generate <id> --dry-run`         | 预览生成结果                             |
| `aag ui`                              | 交互式树形浏览（慎用，优先用结构化命令） |

## AI 决策流程

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

## AI 工作原则

1. **先看本地，后查 CLI**：优先查找 `<config.path>/<appName>/[<projectName>/]<groupPath>/` 下是否已有生成文件
2. **只有本地没有时，才调用 `aag`**
3. **生成后再读一次文件**：生成完成后重新读取 `apifox.ts` 和 `interface.ts` 再写业务代码

## 常见错误

- ❌ 本地已有生成文件时还重复执行 `aag query`
- ❌ 只凭接口名称猜函数名和参数结构
- ❌ 生成完代码却不回读生成文件
- ❌ 用户没要求就 `aag generate --all`
- ❌ 默认使用 `aag ui` 代替结构化命令

---

## 配置到 AI 工具

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

---

## 可直接复制的 Skill

````md
---
name: auto-api-gen
description: 使用 AutoAPIGen 的 `aag` CLI 在已配置 `.vscode/autoApiGen.json` 的项目里查询 Apifox 接口并生成 TypeScript 服务代码。只要用户提到接口、API、Apifox、服务层、生成接口、调用某个接口、查看接口参数或返回值、批量生成接口、根据接口写请求代码，甚至只是说"帮我接一下这个接口"、"帮我找店铺列表接口"、"看看这个接口怎么调"时，都应该使用这个技能。
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
````

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

```

配置完成后，验证 Skill 是否生效——在 AI 工具里问"帮我调用店铺列表接口"，AI 应该会优先检查本地文件，或者执行 `aag query 店铺 --json` 查询后再生成。
```
