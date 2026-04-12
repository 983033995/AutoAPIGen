import path from 'path'
import fs from 'fs'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import { initHttp, getApiTreeList, getApiDetailList, getDataSchemas, cnToPinyin } from '@auto-api-gen/core'
import type { ConfigFromModel, ApiTreeListResData, ApiDetailListData } from '@auto-api-gen/core'
import { initCodeGenContext, generateApiFiles } from '../generator/codeGen'

// ─── 类型 ─────────────────────────────────────────────────────────────────────

interface ApiItem {
  id: number
  name: string
  method: string
  path: string
  groupPath: string[]       // 用于生成文件路径（已 sanitize）
  groupDisplayPath: string[] // 原始中文，用于展示
}

interface TreeFolder {
  kind: 'folder'
  name: string           // sanitized，用于路径
  displayName: string    // 原始名，用于展示
  children: TreeNode[]
  totalApis: number
}

type TreeNode = TreeFolder | ApiItem

// ─── 颜色配置 ─────────────────────────────────────────────────────────────────

const METHOD_COLOR: Record<string, chalk.Chalk> = {
  GET: chalk.green,
  POST: chalk.blue,
  PUT: chalk.yellow,
  DELETE: chalk.red,
  PATCH: chalk.magenta,
  HEAD: chalk.cyan,
  OPTIONS: chalk.gray,
}

function colorMethod(method: string): string {
  const fn = METHOD_COLOR[method.toUpperCase()] || chalk.white
  return fn(method.toUpperCase().padEnd(7))
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

function sanitizeFolderName(name: string): string {
  const hasChinese = /[\u4E00-\u9FFF]/.test(name)
  const sanitized = name.replace(/[/\\:*?"<>|]/g, '').replace(/[\x00-\x1f]/g, '').trim()
  return hasChinese
    ? cnToPinyin(sanitized).toLowerCase().replace(/[^a-z0-9_-]/g, '')
    : sanitized.replace(/[^a-zA-Z0-9_-]/g, '') || 'unnamed'
}

/** 把 ApiTreeListResData[] 转为内部 TreeFolder 树 */
function buildTree(
  nodes: ApiTreeListResData[],
  groupPath: string[] = [],
  displayPath: string[] = [],
): TreeNode[] {
  const result: TreeNode[] = []
  for (const node of nodes) {
    if (node.type === 'apiDetail' && node.api) {
      result.push({
        id: node.api.id,
        name: node.name,
        method: node.api.method?.toUpperCase() || 'GET',
        path: node.api.path || '',
        groupPath,
        groupDisplayPath: displayPath,
      } as ApiItem)
    } else if (node.type === 'apiDetailFolder') {
      const sanitized = sanitizeFolderName(node.name)
      const children = buildTree(
        node.children || [],
        [...groupPath, sanitized],
        [...displayPath, node.name],
      )
      const totalApis = countApis(children)
      result.push({
        kind: 'folder',
        name: sanitized,
        displayName: node.name,
        children,
        totalApis,
      } as TreeFolder)
    }
  }
  return result
}

function countApis(nodes: TreeNode[]): number {
  let count = 0
  for (const n of nodes) {
    if ('kind' in n) count += n.totalApis
    else count++
  }
  return count
}

function collectAllApis(nodes: TreeNode[]): ApiItem[] {
  const result: ApiItem[] = []
  for (const n of nodes) {
    if ('kind' in n) result.push(...collectAllApis(n.children))
    else result.push(n)
  }
  return result
}

function searchApis(nodes: TreeNode[], keyword: string): ApiItem[] {
  const kw = keyword.toLowerCase()
  return collectAllApis(nodes).filter(
    (a) => a.name.toLowerCase().includes(kw) || a.path.toLowerCase().includes(kw),
  )
}

// ─── 渲染面包屑 ───────────────────────────────────────────────────────────────

function renderBreadcrumb(stack: TreeFolder[]): string {
  if (stack.length === 0) return chalk.bold('根目录')
  return stack.map((f) => chalk.yellow(f.displayName)).join(chalk.dim(' / '))
}

// ─── 树形钻取式交互主流程 ─────────────────────────────────────────────────────

const ACTION_SEARCH   = '__SEARCH__'
const ACTION_BACK     = '__BACK__'
const ACTION_CONFIRM  = '__CONFIRM__'
const ACTION_ALL      = '__ALL__'

/**
 * 递归在某个文件夹层级交互，返回用户选中的 ApiItem 数组
 * selected 是跨层级共享的已选集合（用 id 做 key）
 */
async function browseFolder(
  folder: TreeFolder | null,  // null = 根目录
  allRootNodes: TreeNode[],
  stack: TreeFolder[],
  selected: Map<number, ApiItem>,
): Promise<void> {
  const currentNodes = folder ? folder.children : allRootNodes

  while (true) {
    const apis = currentNodes.filter((n): n is ApiItem => !('kind' in n))
    const folders = currentNodes.filter((n): n is TreeFolder => 'kind' in n)

    const selectedCount = selected.size

    // ── 构建 choices ──
    const choices: any[] = []

    // 操作区
    choices.push(new inquirer.Separator(
      chalk.dim(`─── 位置：${renderBreadcrumb(stack)}  已选 ${chalk.cyan(selectedCount)} 个 ───`)
    ))

    if (selectedCount > 0) {
      choices.push({ name: chalk.bgGreen.black(` ✓ 确认生成 ${selectedCount} 个接口 → 直接回车 `), value: ACTION_CONFIRM })
    }
    if (stack.length > 0) {
      choices.push({ name: chalk.dim('← 返回上级'), value: ACTION_BACK })
    }
    choices.push({ name: chalk.magenta('🔍 全局搜索接口'), value: ACTION_SEARCH })

    // 子文件夹区
    if (folders.length > 0) {
      choices.push(new inquirer.Separator(chalk.dim('─── 文件夹 ───')))
      for (const f of folders) {
        const folderSelected = collectAllApis(f.children).filter((a) => selected.has(a.id)).length
        const badge = folderSelected > 0 ? chalk.cyan(` [已选${folderSelected}]`) : ''
        choices.push({
          name: `${chalk.yellow('▶')} ${chalk.bold(f.displayName)}${chalk.dim(` (${f.totalApis})`)}${badge}`,
          value: `folder:${f.name}`,
        })
      }
    }

    // 接口区
    if (apis.length > 0) {
      choices.push(new inquirer.Separator(chalk.dim('─── 接口（空格多选）───')))
      // 当前层"全选/取消全选"快捷键
      const allCurrentSelected = apis.length > 0 && apis.every((a) => selected.has(a.id))
      choices.push({
        name: allCurrentSelected
          ? chalk.dim('☑ 取消当前层全选')
          : chalk.dim('☐ 选中当前层全部'),
        value: ACTION_ALL,
      })
      for (const api of apis) {
        const isSelected = selected.has(api.id)
        const mark = isSelected ? chalk.cyan('●') : chalk.dim('○')
        choices.push({
          name: `${mark} ${colorMethod(api.method)} ${chalk.white(api.path)}  ${chalk.gray(api.name)}`,
          value: `api:${api.id}`,
        })
      }
    }

    if (choices.length <= 2) {
      console.log(chalk.yellow('当前目录为空'))
      return
    }

    const { action } = await inquirer.prompt<{ action: string }>([
      {
        type: 'list',
        name: 'action',
        message: `浏览接口树`,
        pageSize: 22,
        choices,
      },
    ])

    // ── 处理选择 ──
    if (action === ACTION_BACK) {
      return
    }

    if (action === ACTION_SEARCH) {
      await handleSearch(allRootNodes, selected)
      continue
    }

    if (action === ACTION_CONFIRM) {
      return
    }

    if (action === ACTION_ALL) {
      const allCurrentSelected = apis.every((a) => selected.has(a.id))
      if (allCurrentSelected) {
        apis.forEach((a) => selected.delete(a.id))
      } else {
        apis.forEach((a) => selected.set(a.id, a))
      }
      continue
    }

    if (action.startsWith('folder:')) {
      const folderName = action.slice('folder:'.length)
      const targetFolder = folders.find((f) => f.name === folderName)
      if (targetFolder) {
        await browseFolder(targetFolder, allRootNodes, [...stack, targetFolder], selected)
      }
      continue
    }

    if (action.startsWith('api:')) {
      const id = parseInt(action.slice('api:'.length), 10)
      const api = apis.find((a) => a.id === id)
      if (!api) continue
      if (selected.has(id)) {
        selected.delete(id)
      } else {
        selected.set(id, api)
      }
      continue
    }
  }
}

/** 全局搜索，搜索结果支持多选后加入已选集合 */
async function handleSearch(allRootNodes: TreeNode[], selected: Map<number, ApiItem>): Promise<void> {
  const { keyword } = await inquirer.prompt<{ keyword: string }>([
    {
      type: 'input',
      name: 'keyword',
      message: '全局搜索（路径/名称关键词）：',
    },
  ])

  if (!keyword.trim()) return

  const results = searchApis(allRootNodes, keyword.trim())
  if (results.length === 0) {
    console.log(chalk.yellow('  没有找到匹配的接口'))
    return
  }

  const { pickedIds } = await inquirer.prompt<{ pickedIds: number[] }>([
    {
      type: 'checkbox',
      name: 'pickedIds',
      message: `找到 ${chalk.cyan(results.length)} 个接口，勾选后加入已选列表`,
      pageSize: 20,
      choices: results.map((a) => ({
        name: `${colorMethod(a.method)} ${chalk.white(a.path)}  ${chalk.gray(a.name)}`,
        value: a.id,
        checked: selected.has(a.id),
      })),
    },
  ])

  // 搜索结果中未勾选的从已选中移除，勾选的加入
  for (const a of results) {
    if (pickedIds.includes(a.id)) selected.set(a.id, a)
    else selected.delete(a.id)
  }
}

// ─── 主入口 ───────────────────────────────────────────────────────────────────

export async function runInteractive(
  config: ConfigFromModel,
  output?: string,
): Promise<void> {
  const projectId = config.projectId[config.projectId.length - 1]
  const cwd = process.cwd()
  const configPath = (config.path || 'src/services').replace(/^\//, '')
  const outputBase = output
    ? path.resolve(cwd, output)
    : path.resolve(cwd, configPath)

  // ── 1. 拉取数据 ──
  const spinner = ora('连接 Apifox，获取接口数据...').start()
  let rootNodes: TreeNode[] = []
  let totalCount = 0

  try {
    await initHttp(config.appName, {
      projectId,
      Authorization: config.Authorization,
      Cookie: config.Cookie,
    })

    const [treeList, details, schemas] = await Promise.all([
      getApiTreeList(projectId),
      getApiDetailList(),
      getDataSchemas(projectId),
    ])

    rootNodes = buildTree(treeList)
    totalCount = countApis(rootNodes)
    initCodeGenContext(config, details as ApiDetailListData[], schemas)
    spinner.succeed(`获取成功，共 ${chalk.cyan(totalCount)} 个接口`)
  } catch (err: any) {
    spinner.fail(`获取失败: ${err.message}`)
    process.exit(1)
  }

  if (totalCount === 0) {
    console.log(chalk.yellow('未找到任何接口'))
    return
  }

  // ── 2. 树形交互浏览 ──
  const selected = new Map<number, ApiItem>()
  await browseFolder(null, rootNodes, [], selected)

  if (selected.size === 0) {
    console.log(chalk.yellow('\n未选择任何接口，已退出'))
    return
  }

  // ── 3. 汇总预览 ──
  const selectedItems = Array.from(selected.values())
  const groupedByDir = new Map<string, ApiItem[]>()
  for (const item of selectedItems) {
    const dirPath = path.join(outputBase, item.groupPath.join('/'))
    const existing = groupedByDir.get(dirPath) || []
    existing.push(item)
    groupedByDir.set(dirPath, existing)
  }

  console.log(chalk.cyan(`\n已选择 ${selectedItems.length} 个接口，将生成到以下目录：`))
  for (const [dir, items] of groupedByDir) {
    console.log(`  ${chalk.dim('→')} ${chalk.yellow(path.relative(cwd, dir))}  ${chalk.dim(`(${items.length} 个)`)}`)
    for (const item of items) {
      console.log(`      ${colorMethod(item.method)} ${chalk.white(item.path)}`)
    }
  }

  // ── 4. 确认操作 ──
  const { mode } = await inquirer.prompt<{ mode: string }>([
    {
      type: 'list',
      name: 'mode',
      message: '选择操作',
      choices: [
        { name: '✓ 生成文件', value: 'generate' },
        { name: '⊙ 预览路径（dry-run，不写入）', value: 'dryrun' },
        { name: '✗ 取消', value: 'cancel' },
      ],
    },
  ])

  if (mode === 'cancel') {
    console.log(chalk.gray('已取消'))
    return
  }

  const dryRun = mode === 'dryrun'

  // ── 5. 生成 ──
  let totalFiles = 0
  for (const [targetDir, items] of groupedByDir) {
    const ids = items.map((i) => i.id)
    const genSpinner = ora(`生成 ${path.relative(cwd, targetDir)} (${ids.length} 个接口)...`).start()
    try {
      const results = await generateApiFiles(targetDir, ids)
      for (const result of results) {
        if (dryRun) {
          genSpinner.stop()
          console.log(chalk.dim(`  [dry-run] ${result.apiFilePath}`))
          console.log(chalk.dim(`  [dry-run] ${result.interfaceFilePath}`))
          genSpinner.start()
        } else {
          fs.mkdirSync(path.dirname(result.apiFilePath), { recursive: true })
          fs.writeFileSync(result.apiFilePath, result.apiContent, 'utf-8')
          fs.writeFileSync(result.interfaceFilePath, result.interfaceContent, 'utf-8')
          totalFiles += 2
        }
      }
      genSpinner.succeed(`已完成: ${chalk.cyan(path.relative(cwd, targetDir))}`)
    } catch (err: any) {
      genSpinner.fail(`失败: ${err.message}`)
    }
  }

  if (!dryRun) {
    console.log(chalk.green(`\n✓ 共生成 ${totalFiles} 个文件`))
  }
}
