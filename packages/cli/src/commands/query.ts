import chalk from 'chalk'
import { initHttp, getApiTreeList, getApiDetailList, getDataSchemas } from '@auto-api-gen/core'
import type { ConfigFromModel, ApiTreeListResData, ApiDetailListData } from '@auto-api-gen/core'

export interface QueryOptions {
  group?: string
  json?: boolean
  id?: boolean
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

  console.log(chalk.dim(`\n提示：使用 --json 输出完整 JSON，使用 aag generate <id> 生成代码\n`))
}
