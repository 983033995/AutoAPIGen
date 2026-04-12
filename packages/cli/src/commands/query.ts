import chalk from 'chalk'
import { initHttp, getApiTreeList, getApiDetailList, getDataSchemas } from '@auto-api-gen/core'
import type { ConfigFromModel, ApiTreeListResData, ApiDetailListData } from '@auto-api-gen/core'

export interface QueryOptions {
  group?: string
  json?: boolean
  id?: boolean
  idsOnly?: boolean
  limit?: number
}

interface FlatApiItem {
  id: number
  name: string
  method: string
  path: string
  tags: string[]
  group: string
}

interface GroupNode {
  name: string
  fullPath: string   // 如 "bFF / C端 / 支付"
  apis: FlatApiItem[]
  children: GroupNode[]
}

function buildGroupTree(
  tree: ApiTreeListResData[],
  groupPath: string[] = []
): GroupNode[] {
  const result: GroupNode[] = []
  for (const node of tree) {
    if (node.type === 'apiDetailFolder') {
      const childPath = [...groupPath, node.name]
      const apis: FlatApiItem[] = []
      const children = buildGroupTree(node.children || [], childPath)
      // 直接子节点中的 apiDetail
      for (const child of (node.children || [])) {
        if (child.type === 'apiDetail' && child.api) {
          apis.push({
            id: child.api.id,
            name: child.name,
            method: child.api.method?.toUpperCase() || 'GET',
            path: child.api.path || '',
            tags: [],
            group: childPath.join(' / '),
          })
        }
      }
      result.push({
        name: node.name,
        fullPath: childPath.join(' / '),
        apis,
        children,
      })
    }
  }
  return result
}

function flattenTree(
  tree: ApiTreeListResData[],
  groupPath: string[] = []
): FlatApiItem[] {
  const result: FlatApiItem[] = []
  for (const node of tree) {
    if (node.type === 'apiDetail' && node.api) {
      result.push({
        id: node.api.id,
        name: node.name,
        method: node.api.method?.toUpperCase() || 'GET',
        path: node.api.path || '',
        tags: [],
        group: groupPath.join(' / '),
      })
    } else if (node.type === 'apiDetailFolder' && node.children?.length) {
      result.push(...flattenTree(node.children, [...groupPath, node.name]))
    }
  }
  return result
}

function filterApis(
  apis: FlatApiItem[],
  keyword?: string,
  groupFilter?: string
): FlatApiItem[] {
  return apis.filter((api) => {
    const matchGroup = groupFilter
      ? api.group.toLowerCase().includes(groupFilter.toLowerCase())
      : true
    const matchKeyword = keyword
      ? api.name.toLowerCase().includes(keyword.toLowerCase()) ||
        api.path.toLowerCase().includes(keyword.toLowerCase())
      : true
    return matchGroup && matchKeyword
  })
}

export async function runQuery(
  config: ConfigFromModel,
  keyword?: string,
  options: QueryOptions = {}
): Promise<void> {
  const projectId = config.projectId[config.projectId.length - 1]

  await initHttp(config.appName, {
    projectId,
    Authorization: config.Authorization,
    Cookie: config.Cookie,
  })

  const [treeList, detailList, schemas] = await Promise.all([
    getApiTreeList(projectId),
    getApiDetailList(),
    getDataSchemas(projectId),
  ])

  // save schemas for later use in generate
  process.env._AAG_SCHEMAS = JSON.stringify(schemas)
  process.env._AAG_DETAILS = JSON.stringify(detailList)

  const allApis = flattenTree(treeList)
  const filtered = filterApis(allApis, keyword, options.group)
  const limited = options.limit ? filtered.slice(0, options.limit) : filtered

  // AI 优先模式：只输出空格分隔的 ID，直接拼接到 aag generate 命令
  if (options.idsOnly) {
    console.log(limited.map((a) => a.id).join(' '))
    return
  }

  if (options.json) {
    // AI 友好：输出完整 JSON
    const withDetails = limited.map((api) => {
      const detail = (detailList as ApiDetailListData[]).find((d) => d.id === api.id) || {}
      return { ...api, detail }
    })
    console.log(JSON.stringify(withDetails, null, 2))
    return
  }

  if (limited.length === 0) {
    console.log(chalk.yellow('未找到匹配的接口'))
    return
  }

  console.log(chalk.cyan(`\n找到 ${limited.length} 个接口${keyword ? `（关键词: "${keyword}"）` : ''}：\n`))

  for (const api of limited) {
    const methodColor: Record<string, chalk.Chalk> = {
      GET: chalk.green,
      POST: chalk.blue,
      PUT: chalk.yellow,
      DELETE: chalk.red,
      PATCH: chalk.magenta,
    }
    const colorFn = methodColor[api.method] || chalk.white
    console.log(
      `  ${chalk.gray(`[${api.id}]`)} ${colorFn(api.method.padEnd(7))} ${chalk.white(api.path)}`
    )
    console.log(`         ${chalk.gray(api.name)}${api.group ? chalk.dim(` · ${api.group}`) : ''}`)
  }

  console.log(chalk.dim(`\n提示：--json 输出完整 JSON；--ids-only 只输出 ID（适合 AI 直接拼接 generate）\n`))
}

export async function runGroups(
  config: ConfigFromModel,
  options: { json?: boolean } = {}
): Promise<void> {
  const projectId = config.projectId[config.projectId.length - 1]

  await initHttp(config.appName, {
    projectId,
    Authorization: config.Authorization,
    Cookie: config.Cookie,
  })

  const treeList = await getApiTreeList(projectId)
  const groupTree = buildGroupTree(treeList)

  if (options.json) {
    function serializeGroups(nodes: GroupNode[]): any[] {
      return nodes.map((g) => ({
        group: g.fullPath,
        apiCount: g.apis.length,
        apiIds: g.apis.map((a) => a.id),
        apis: g.apis.map((a) => ({ id: a.id, method: a.method, path: a.path, name: a.name })),
        children: serializeGroups(g.children),
      }))
    }
    console.log(JSON.stringify(serializeGroups(groupTree), null, 2))
    return
  }

  function printGroups(nodes: GroupNode[], indent = 0): void {
    const pad = '  '.repeat(indent)
    for (const g of nodes) {
      if (g.apis.length > 0) {
        const ids = g.apis.map((a) => a.id).join(' ')
        console.log(`${pad}${chalk.yellow('▶')} ${chalk.bold(g.name)} ${chalk.dim(`(${g.apis.length}个接口)`)}  ${chalk.dim('→ IDs:')} ${chalk.cyan(ids)}`)
        for (const api of g.apis) {
          const METHOD_COLOR: Record<string, chalk.Chalk> = { GET: chalk.green, POST: chalk.blue, PUT: chalk.yellow, DELETE: chalk.red, PATCH: chalk.magenta }
          const colorFn = METHOD_COLOR[api.method] || chalk.white
          console.log(`${pad}  ${chalk.gray(`[${api.id}]`)} ${colorFn(api.method.padEnd(7))} ${api.path}`)
        }
      } else {
        console.log(`${pad}${chalk.yellow('▶')} ${chalk.bold(g.name)}`)
      }
      if (g.children.length) printGroups(g.children, indent + 1)
    }
  }

  console.log(chalk.cyan('\n分组列表（含接口 ID）：\n'))
  printGroups(groupTree)
  console.log(chalk.dim('\n提示：使用 aag generate <IDs...> 生成指定分组的所有接口；--json 输出结构化 JSON\n'))
}
