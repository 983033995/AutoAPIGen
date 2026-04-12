# AutoAPIGen — API 查询与代码生成技能

## 技能简介

本技能帮助 AI 工具（Claude、Cursor、Copilot 等）通过 `aag` CLI 工具，在任意项目目录下：

1. **查询接口列表** — 按路径/名称/分组关键词搜索 Apifox 接口
2. **生成 TypeScript 代码** — 根据接口 ID 或关键词，自动生成接口函数和类型定义

## 前提条件

- 项目根目录存在 `.vscode/autoApiGen.json` 配置文件（通过 AutoAPIGen VSCode 插件配置）
- 已安装 CLI：`npm install -g auto-api-gen-cli`（或通过插件的"启用 AI 工具支持"按钮自动安装）

## 可用命令

### 1. 检查配置

```bash
aag init
```

验证当前项目的 AutoAPIGen 配置是否正确，输出 appName、projectId、path 等信息。

### 2. 查询接口

```bash
# 查询所有接口
aag query

# 按关键词搜索（路径或名称）
aag query <keyword>

# 按分组过滤
aag query --group <groupName>

# 输出完整 JSON（包含接口详情，适合 AI 解析）
aag query --json
aag query <keyword> --json

# 限制返回数量
aag query --limit 20
```

**JSON 输出结构示例：**

```json
[
  {
    "id": 123456,
    "name": "获取用户信息",
    "method": "GET",
    "path": "/api/user/{id}",
    "group": "用户模块 / 基础信息",
    "detail": {
      "parameters": { "query": [...], "path": [...] },
      "requestBody": { ... },
      "responses": [...]
    }
  }
]
```

### 3. 生成代码

```bash
# 按接口 ID 生成（从 aag query 结果获取 id）
aag generate 123456

# 按路径关键词生成
aag generate /api/user

# 生成多个接口
aag generate 123456 789012

# 生成全部接口
aag generate --all

# 指定输出目录
aag generate 123456 --output src/services

# 预览（不实际写入）
aag generate 123456 --dry-run
```

**生成文件结构：**

```
src/services/
└── <groupPath>/
    ├── apifox.ts      # 接口函数（axios/custom 模式）
    └── interface.ts   # TypeScript 类型定义
```

## AI 工具使用工作流

当用户要求"查询某个接口"或"生成某个接口的代码"时，按以下步骤操作：

### 步骤 1：确认配置

```bash
aag init
```

如果报错，提示用户先通过 AutoAPIGen VSCode 插件完成项目配置。

### 步骤 2：查询接口

```bash
aag query <关键词> --json
```

从 JSON 输出中获取接口 ID 和详情。

### 步骤 3：生成代码

```bash
aag generate <接口ID>
```

代码会自动写入配置文件中的 `path` 目录下。

### 步骤 4：验证

生成完成后，检查生成的 `.ts` 文件是否符合项目规范，必要时做微调。

## 典型示例

**场景：生成用户登录接口的 TypeScript 代码**

```bash
# 1. 搜索登录相关接口
aag query 登录 --json

# 输出示例：
# [{ "id": 456789, "name": "用户登录", "method": "POST", "path": "/api/auth/login", ... }]

# 2. 生成代码
aag generate 456789

# 输出：
# ✓ 已生成: src/services/auth
# ✓ 共生成 2 个文件
```

## 配置文件说明

`.vscode/autoApiGen.json` 关键字段：

| 字段 | 说明 |
|------|------|
| `appName` | API 平台，如 `apifox`、`apipost` |
| `projectId` | Apifox 项目 ID 数组 |
| `path` | 生成代码的输出目录 |
| `model` | 代码模板，如 `axios`、`custom` |
| `axiosPath` | 自定义 axios 导入语句 |
| `axiosReturnKey` | 响应数据提取键（如 `data`） |
| `head` | 自定义文件头部导入语句 |
| `customReturn` | 自定义函数模板（JS 代码字符串） |
