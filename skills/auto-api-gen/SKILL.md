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

### 2. 查看分组结构（AI 首选）

```bash
# 列出所有分组及其接口 ID（树状，人类可读）
aag groups

# 输出 JSON（AI 解析用，含完整树结构）
aag groups --json
```

**`aag groups` 输出示例：**

```
分组列表（含接口 ID）：

▶ bff
  ▶ C端 (5个接口)  → IDs: 111 222 333 444 555
    [111] POST    /bff/c-transaction/payment/pay
    [222] POST    /bff/c-transaction/payment/paymentInfo
    ...
  ▶ B端 (3个接口)  → IDs: 666 777 888
    ...
```

**`aag groups --json` 输出结构：**

```json
[
  {
    "group": "bff",
    "apiCount": 0,
    "apiIds": [],
    "children": [
      {
        "group": "bff / C端 / 支付",
        "apiCount": 5,
        "apiIds": [111, 222, 333, 444, 555],
        "apis": [{ "id": 111, "method": "POST", "path": "/bff/..." }],
        "children": []
      }
    ]
  }
]
```

### 3. 查询接口

```bash
# 查询所有接口
aag query

# 按关键词搜索（路径或名称）
aag query <keyword>

# 按分组过滤，只输出 ID（AI 直接拼接 generate 命令）
aag query --group <groupName> --ids-only

# 输出完整 JSON（包含接口详情，适合 AI 解析）
aag query --json
aag query <keyword> --json

# 限制返回数量
aag query --limit 20
```

**JSON 输出结构示例（`summary` 字段为 AI 可直接理解的结构化摘要）：**

```json
[
  {
    "id": 123456,
    "name": "用户支付",
    "method": "POST",
    "path": "/bff/c-transaction/payment/pay",
    "group": "bff / C端 / 支付",
    "summary": {
      "functionName": "postBffCTransactionPaymentPay",
      "method": "POST",
      "path": "/bff/c-transaction/payment/pay",
      "description": "用户支付",
      "pathParams": [],
      "queryParams": [],
      "body": {
        "type": "json",
        "fields": [
          { "name": "orderId", "type": "string", "required": true, "description": "订单ID" },
          { "name": "amount", "type": "number", "required": true, "description": "支付金额" },
          { "name": "payType", "type": "string", "required": false, "description": "支付方式" }
        ]
      },
      "response200": [
        { "name": "code", "type": "number", "required": true, "description": "" },
        { "name": "data", "type": "object", "required": false, "description": "支付结果" }
      ]
    }
  }
]
```

### 4. 生成代码

```bash
# 按接口 ID 生成（从 aag groups 或 aag query 结果获取 id）
aag generate 123456

# 生成某个分组的全部接口（将 aag groups 输出的 IDs 直接传入）
aag generate 111 222 333 444 555

# 按路径关键词生成
aag generate /api/user

# 生成全部接口
aag generate --all

# 指定输出目录
aag generate 123456 --output src/services

# 预览（不实际写入）
aag generate 123456 --dry-run
```

**生成文件结构（与插件完全一致）：**

```
<config.path>/
└── <appName>/[<projectName>/]<folder1>/<folder2>/
    ├── apifox.ts      # 接口函数（axios/custom 模式）
    └── interface.ts   # TypeScript 类型定义
```

## AI 工具使用工作流

### 场景一：生成指定分组下的所有接口（推荐）

```bash
# 步骤 1：查看分组结构，找到目标分组的接口 ID
aag groups --json

# 步骤 2：从 JSON 中提取目标分组的 apiIds，直接生成
aag generate 111 222 333 444 555
```

### 场景二：按关键词查询后生成

```bash
# 步骤 1：搜索关键词，只输出 ID
aag query 支付 --ids-only

# 步骤 2：将输出的 ID 直接用于生成（输出格式为空格分隔）
aag generate $(aag query 支付 --ids-only)
```

### 场景三：完整分析接口详情后生成

```bash
# 步骤 1：确认配置
aag init

# 步骤 2：查询接口详情（含参数/响应类型）
aag query <关键词> --json

# 步骤 3：分析 JSON 后生成
aag generate <接口ID>
```

## 典型示例

**场景：生成"支付"分组下所有接口**

```bash
# 1. 获取分组结构
aag groups --json
# 输出：[{ "group": "bff / C端 / 支付", "apiIds": [111,222,333,444,555], ... }]

# 2. 直接生成整个分组
aag generate 111 222 333 444 555

# 输出：
# ✓ 已生成: apps/copilot/src/services/apifox/JAVAZhiFu/bFF/CDuan/zhiFu
# ✓ 共生成 2 个文件
```

**场景：快速生成登录接口**

```bash
# 一行搞定：查询 ID 并生成
aag generate $(aag query 登录 --ids-only)
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
