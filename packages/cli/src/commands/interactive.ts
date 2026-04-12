import path from 'path'
import fs from 'fs'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import { initHttp, getApiTreeList, getApiDetailList, getDataSchemas, cnToPinyin } from '@auto-api-gen/core'
import type { ConfigFromModel, ApiTreeListResData, ApiDetailListData } from '@auto-api-gen/core'
import { initCodeGenContext, generateApiFiles } from '../generator/codeGen'

// ─── 类型 ─────────────────────────────────────────────────────────────────────

interface FlatApiItem {
  id: number
  name: string
  method: string
  path: string
  group: string
  groupPath: string[]
  groupDisplay: string  // 原始中文分组路径，用于展示
}

interface FolderNode {
  name: string
  displayName: string
  children: (FolderNode | FlatApiItem)[]
  isFolder: true
}

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

// ─── 树形扁平化（保留原始 displayName 用于展示） ────────────────────────────

function sanitizeFolderName(name: string): string {
  const hasChinese = /[\u4E00-\u9FFF]/.test(name)
  const sanitized = name.replace(/[/\\:*?"<>|]/g, '').replace(/[\x00-\x1f]/g, '').trim()
  return hasChinese
    ? cnToPinyin(sanitized).toLowerCase().replace(/[^a-z0-9_-]/g, '')
    : sanitized.replace(/[^a-zA-Z0-9_-]/g, '') || 'unnamed'
}

function flattenTree(
  tree: ApiTreeListResData[],
  groupPath: string[] = [],
  displayPath: string[] = [],
): FlatApiItem[] {
  const result: FlatApiItem[] = []
  for (const node of tree) {
    if (node.type === 'apiDetail' && node.api) {
      result.push({
        id: node.api.id,
        name: node.name,
        method: node.api.method?.toUpperCase() || 'GET',
        path: node.api.path || '',
        group: groupPath.join('/'),
        groupPath,
        groupDisplay: displayPath.join(' / '),
      })
    } else if (node.type === 'apiDetailFolder' && node.children?.length) {
      const folderKey = sanitizeFolderName(node.name)
      result.push(...flattenTree(
        node.children,
        [...groupPath, folderKey],
        [...displayPath, node.name],
      ))
    }
  }
  return result
}

function getGroups(items: FlatApiItem[]): string[] {
  const set = new Set<string>()
  for (const item of items) {
    if (item.groupDisplay) set.add(item.groupDisplay)
  }
  return Array.from(set).sort()
}

// ─── 主交互流程 ───────────────────────────────────────────────────────────────

export async function runInteractive(
  config: ConfigFromModel,
  output?: string,
): Promise<void> {
  const projectId = config.projectId[config.projectId.length - 1]
  const cwd = process.cwd()
  const outputBase = output
    ? path.resolve(cwd, output)
    : path.resolve(cwd, config.path || 'src/services')

  // ── 1. 拉取数据 ──
  const spinner = ora('连接 Apifox，获取接口数据...').start()
  let allItems: FlatApiItem[] = []
  let detailList: ApiDetailListData[] = []

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

    detailList = details as ApiDetailListData[]
    allItems = flattenTree(treeList)
    initCodeGenContext(config, detailList, schemas)
    spinner.succeed(`获取成功，共 ${chalk.cyan(allItems.length)} 个接口`)
  } catch (err: any) {
    spinner.fail(`获取失败: ${err.message}`)
    process.exit(1)
  }

  if (allItems.length === 0) {
    console.log(chalk.yellow('未找到任何接口'))
    return
  }

  // ── 2. 选择分组 ──
  const groups = getGroups(allItems)
  const ALL_GROUPS = '── 全部分组 ──'

  const { selectedGroups } = await inquirer.prompt<{ selectedGroups: string[] }>([
    {
      type: 'checkbox',
      name: 'selectedGroups',
      message: '选择要操作的分组（空格选择，回车确认）',
      pageSize: 20,
      choices: [
        new inquirer.Separator('─── 快捷选项 ───'),
        { name: chalk.cyan(ALL_GROUPS), value: ALL_GROUPS },
        new inquirer.Separator('─── 分组列表 ───'),
        ...groups.map((g) => ({ name: g, value: g })),
      ],
    },
  ])

  if (selectedGroups.length === 0) {
    console.log(chalk.yellow('未选择分组，已退出'))
    return
  }

  // ── 3. 筛选接口 ──
  const isAllGroups = selectedGroups.includes(ALL_GROUPS)
  const candidateItems = isAllGroups
    ? allItems
    : allItems.filter((item) => selectedGroups.includes(item.groupDisplay))

  // ── 4. 可选：关键词二次过滤 ──
  const { keyword } = await inquirer.prompt<{ keyword: string }>([
    {
      type: 'input',
      name: 'keyword',
      message: `在 ${chalk.cyan(candidateItems.length)} 个接口中过滤（路径/名称关键词，直接回车跳过）：`,
    },
  ])

  const filteredItems = keyword.trim()
    ? candidateItems.filter(
        (item) =>
          item.name.toLowerCase().includes(keyword.toLowerCase()) ||
          item.path.toLowerCase().includes(keyword.toLowerCase()),
      )
    : candidateItems

  if (filteredItems.length === 0) {
    console.log(chalk.yellow('没有匹配的接口'))
    return
  }

  // ── 5. 多选接口 ──
  const { selectedIds } = await inquirer.prompt<{ selectedIds: number[] }>([
    {
      type: 'checkbox',
      name: 'selectedIds',
      message: `选择要生成的接口（${chalk.cyan(filteredItems.length)} 个，空格选择，a 全选，回车确认）`,
      pageSize: 25,
      choices: filteredItems.map((item) => ({
        name: `${colorMethod(item.method)} ${chalk.white(item.path)}  ${chalk.gray(item.name)}`,
        value: item.id,
        short: item.name,
      })),
    },
  ])

  if (selectedIds.length === 0) {
    console.log(chalk.yellow('未选择接口，已退出'))
    return
  }

  // ── 6. 预览 + 确认 ──
  const selectedItems = filteredItems.filter((i) => selectedIds.includes(i.id))

  console.log(chalk.cyan(`\n已选择 ${selectedItems.length} 个接口：`))

  // 按分组聚合展示
  const groupedByDir = new Map<string, FlatApiItem[]>()
  for (const item of selectedItems) {
    const groupDir = item.groupPath.join('/')
    const dirPath = path.join(outputBase, groupDir)
    const existing = groupedByDir.get(dirPath) || []
    existing.push(item)
    groupedByDir.set(dirPath, existing)
  }

  for (const [dir, items] of groupedByDir) {
    console.log(`  ${chalk.dim('→')} ${chalk.yellow(path.relative(cwd, dir))}`)
    for (const item of items) {
      console.log(`      ${colorMethod(item.method)} ${chalk.white(item.path)}`)
    }
  }

  const { mode } = await inquirer.prompt<{ mode: string }>([
    {
      type: 'list',
      name: 'mode',
      message: '选择操作',
      choices: [
        { name: '生成文件', value: 'generate' },
        { name: '预览路径（dry-run）', value: 'dryrun' },
        { name: '取消', value: 'cancel' },
      ],
    },
  ])

  if (mode === 'cancel') {
    console.log(chalk.gray('已取消'))
    return
  }

  const dryRun = mode === 'dryrun'

  // ── 7. 生成 ──
  let totalFiles = 0
  for (const [targetDir, items] of groupedByDir) {
    const ids = items.map((i) => i.id)
    const genSpinner = ora(`生成 ${path.relative(cwd, targetDir)} (${ids.length} 个接口)...`).start()
    try {
      const results = await generateApiFiles(targetDir, ids)
      for (const result of results) {
        if (dryRun) {
          console.log(chalk.dim(`  [dry-run] ${result.apiFilePath}`))
          console.log(chalk.dim(`  [dry-run] ${result.interfaceFilePath}`))
        } else {
          fs.mkdirSync(path.dirname(result.apiFilePath), { recursive: true })
          fs.writeFileSync(result.apiFilePath, result.apiContent, 'utf-8')
          fs.writeFileSync(result.interfaceFilePath, result.interfaceContent, 'utf-8')
          totalFiles += 2
        }
      }
      genSpinner.succeed(`已完成: ${chalk.cyan(path.relative(cwd, targetDir))}`)
    } catch (err: any) {
      genSpinner.fail(`失败: ${targetDir} — ${err.message}`)
    }
  }

  if (!dryRun) {
    console.log(chalk.green(`\n✓ 共生成 ${totalFiles} 个文件`))
  }
}
