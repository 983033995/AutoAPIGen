<!-- gitnexus:start -->

# GitNexus — Code Intelligence

This project is indexed by GitNexus as **AutoAPIGen** (424 symbols, 1103 relationships, 32 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/AutoAPIGen/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool             | When to use                   | Command                                                                 |
| ---------------- | ----------------------------- | ----------------------------------------------------------------------- |
| `query`          | Find code by concept          | `gitnexus_query({query: "auth validation"})`                            |
| `context`        | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})`                              |
| `impact`         | Blast radius before editing   | `gitnexus_impact({target: "X", direction: "upstream"})`                 |
| `detect_changes` | Pre-commit scope check        | `gitnexus_detect_changes({scope: "staged"})`                            |
| `rename`         | Safe multi-file rename        | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher`         | Custom graph queries          | `gitnexus_cypher({query: "MATCH ..."})`                                 |

## Impact Risk Levels

| Depth | Meaning                               | Action                |
| ----- | ------------------------------------- | --------------------- |
| d=1   | WILL BREAK — direct callers/importers | MUST update these     |
| d=2   | LIKELY AFFECTED — indirect deps       | Should test           |
| d=3   | MAY NEED TESTING — transitive         | Test if critical path |

## Resources

| Resource                                    | Use for                                  |
| ------------------------------------------- | ---------------------------------------- |
| `gitnexus://repo/AutoAPIGen/context`        | Codebase overview, check index freshness |
| `gitnexus://repo/AutoAPIGen/clusters`       | All functional areas                     |
| `gitnexus://repo/AutoAPIGen/processes`      | All execution flows                      |
| `gitnexus://repo/AutoAPIGen/process/{name}` | Step-by-step execution trace             |

## Self-Check Before Finishing

Before completing any code modification task, verify:

1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

- Re-index: `npx gitnexus analyze`
- Check freshness: `npx gitnexus status`
- Generate docs: `npx gitnexus wiki`

<!-- gitnexus:end -->

---

# AutoAPIGen — Harness 开发规范

> 本节由项目维护，`npx gitnexus analyze` 重建索引时**不会覆盖**此处（marker 外部内容保留）。

## 项目架构概览

```
AutoAPIGen/
├── src/                         # VSCode 插件主体
│   ├── extension.ts             # 插件入口：命令注册、面板管理、AI skill 注入
│   ├── core/
│   │   ├── create/              # 文件生成核心（createFile、模板）
│   │   ├── webview/             # WebviewPanel / WebviewViewProvider
│   │   ├── workspace/           # stateManager：跨会话状态
│   │   └── messenger.ts         # 插件 ↔ WebView 双向通信
│   └── assets/                  # CSS、图标等静态资源
├── packages/
│   ├── cli/                     # CLI 工具（auto-api-gen-cli / aag）
│   │   ├── src/bin/cli.ts       # 命令注册入口
│   │   └── src/commands/        # generate / query / interactive / groups
│   └── core/                    # 共享逻辑（HTTP 请求、类型定义）
├── skills/auto-api-gen/SKILL.md # AI 技能文档（注入各 AI 工具规则文件）
└── .vscode/autoApiGen.json      # 用户项目配置文件（运行时读取）
```

## 模块职责（对应 GitNexus clusters）

| Cluster       | 核心文件                                   | 职责                                 |
| ------------- | ------------------------------------------ | ------------------------------------ |
| **Create**    | `src/core/create/index.ts`                 | 生成 apifox.ts / interface.ts 到磁盘 |
| **Generator** | `packages/cli/src/generator/codeGen.ts`    | 模板渲染、类型推导、参数序列化       |
| **Http**      | `src/core/messenger.ts`                    | API 请求（Apifox）、WebView 通信     |
| **Template**  | `src/core/create/template*.ts`             | 代码模板字符串构建                   |
| **Commands**  | `packages/cli/src/commands/`               | CLI 子命令实现                       |
| **Webview**   | `src/core/webview/`                        | WebView UI 加载与交互                |
| **Workspace** | `src/core/workspace/` + `src/extension.ts` | VSCode 生命周期、状态管理            |

## 关键执行流（修改前必须用 GitNexus 查询）

| 流程                                | 触发点              | Clusters             |
| ----------------------------------- | ------------------- | -------------------- |
| `RunGenerate → BuildTypeExtension`  | `aag generate <id>` | Commands → Generator |
| `GenerateFile → IsSchema`           | 文件写入时类型判断  | Create → Generator   |
| `GenerateApiFiles → NameFormatter`  | 批量生成接口文件    | Create → Generator   |
| `ReceiveMessages → GetModelOptions` | WebView 初始化配置  | Http → Workspace     |
| `BuildMethodTemplate → IsSchema`    | 构建方法签名        | Generator → Create   |

## 编码规范（强制）

- **缩进**：Tab（禁用空格），与现有文件风格保持一致
- **import 顺序**：`vscode` → Node 标准库 → 本地模块；禁止函数内 `require()`
- **TypeScript**：严格模式；禁用裸 `any`（必要时加 `// eslint-disable-next-line` 注释）
- **catch 块**：无需错误变量时用 `catch {}`，不用 `catch (_e) {}`
- **编译验证**：改动后必须执行 `npx tsc -p tsconfig.extension.json --skipLibCheck --noEmit`

## 路径生成规则（CLI 与插件强制一致）

```
<config.path>/<appName>/[<projectName(PascalCase)>/]<分组(camelCase拼音)>/
├── apifox.ts
└── interface.ts
```

- `appName`：始终作为第一路径段（来自配置）
- `projectName`：仅当 `useProjectName: true` 时插入，经 `cnToPinyin` + `convertPathToPascalCase` 转换
- 分组文件夹：通过 `cnToPinyin(name)` 转为 camelCase 拼音

## AI Skill 注入规范

- `skills/auto-api-gen/SKILL.md` 是唯一 skill 源，由 `AutoAPIGen.enableAISupport` 命令注入
- 使用 `<!-- AutoAPIGen:skill:start -->` / `<!-- AutoAPIGen:skill:end -->` marker 实现幂等更新
- 注入目标（6 个文件）：
  - `.windsurfrules` / `.windsurf/rules/auto-api-gen.md`（Windsurf）
  - `.cursorrules` / `.cursor/rules/auto-api-gen.mdc`（Cursor）
  - `CLAUDE.md`（Claude Code）
  - `.github/copilot-instructions.md`（GitHub Copilot）
- **修改 SKILL.md 后**必须提示用户重新执行 `AutoAPIGen: 启用 AI 支持` 命令以同步注入

## 提交规范（Conventional Commits）

```
<type>(<scope>): <subject>

types:  feat | fix | docs | refactor | chore | perf | test
scopes: cli | extension | core | skill | generator | webview
```

示例：`feat(cli): add aag groups command with --json output`

## 构建命令

```bash
pnpm --filter auto-api-gen-cli build                                 # 构建 CLI
npx tsc -p tsconfig.extension.json --skipLibCheck --noEmit           # 校验 extension
vsce package                                                          # 打包插件
```

## 禁止事项

- **禁止**修改 `<!-- gitnexus:start -->` ... `<!-- gitnexus:end -->` 之间内容（工具自动维护）
- **禁止**在 `packages/core/src/types.ts` 中删除已有类型（下游 CLI 依赖）
- **禁止**修改 CLI 命令参数签名而不同步更新 `SKILL.md`
- **禁止**在 `codeGen.ts` 中新增模块级全局状态
