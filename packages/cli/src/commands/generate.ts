import path from 'path'
import fs from 'fs'
import chalk from 'chalk'
import ora from 'ora'
import { initHttp, getApiTreeList, getApiDetailList, getDataSchemas, getUserProjects, cnToPinyin } from '@auto-api-gen/core'
import type { ConfigFromModel, ApiTreeListResData, ApiDetailListData } from '@auto-api-gen/core'
import { initCodeGenContext, generateApiFiles, convertPathToPascalCase } from '../generator/codeGen'

export interface GenerateOptions {
  all?: boolean
  output?: string
  dryRun?: boolean
}

function flattenTreeWithPath(
  tree: ApiTreeListResData[],
  groupPath: string[] = []
): Array<{ id: number; name: string; path: string; method: string; group: string; groupPath: string[] }> {
  const result: Array<{ id: number; name: string; path: string; method: string; group: string; groupPath: string[] }> = []
  for (const node of tree) {
    if (node.type === 'apiDetail' && node.api) {
      result.push({
        id: node.api.id,
        name: node.name,
        path: node.api.path || '',
        method: node.api.method?.toUpperCase() || 'GET',
        group: groupPath.join(' / '),
        groupPath,
      })
    } else if (node.type === 'apiDetailFolder' && node.children?.length) {
      // 与插件 dfs 保持一致：直接用 cnToPinyin(node.name) 生成 camelCase
      const sanitized = node.name.replace(/[/\\:*?"<>|]/g, '').replace(/[\x00-\x1f]/g, '').trim()
      const folderName = sanitized ? cnToPinyin(sanitized) : 'unnamed'
      result.push(...flattenTreeWithPath(node.children, [...groupPath, folderName]))
    }
  }
  return result
}

export async function runGenerate(
  config: ConfigFromModel,
  apiKeys: string[],
  options: GenerateOptions = {}
): Promise<void> {
  const projectId = config.projectId[config.projectId.length - 1]
  const cwd = process.cwd()
  // 与插件保持一致：path.join(workspaceFolders[0], config.path)
  const outputBase = options.output
    ? path.resolve(cwd, options.output)
    : path.join(cwd, config.path || 'src/services')

  const spinner = ora('连接 Apifox，获取接口数据...').start()

  try {
    await initHttp(config.appName, {
      projectId,
      Authorization: config.Authorization,
      Cookie: config.Cookie,
    })

    const [treeList, detailList, schemas, userProjects] = await Promise.all([
      getApiTreeList(projectId),
      getApiDetailList(),
      getDataSchemas(projectId),
      config.useProjectName ? getUserProjects() : Promise.resolve([]),
    ])

    spinner.succeed('接口数据获取成功')

    initCodeGenContext(config, detailList as ApiDetailListData[], schemas)

    // ── 与插件对齐：rootGroupPath = [appName] 或 [appName, projectName] ──
    const rootGroupPath: string[] = [config.appName]
    if (config.useProjectName) {
      const projectInfo = (userProjects as any[]).find((p: any) => p.id === projectId)
      const projectName = projectInfo?.name || ''
      if (projectName) {
        rootGroupPath.push(convertPathToPascalCase(cnToPinyin(projectName)).trim())
      }
    }

    // ── 确定要生成的接口 IDs ──
    let targetApiItems: Array<{ id: number; name: string; path: string; method: string; group: string; groupPath: string[] }>

    if (options.all) {
      targetApiItems = flattenTreeWithPath(treeList, rootGroupPath)
    } else if (apiKeys.length) {
      const allItems = flattenTreeWithPath(treeList, rootGroupPath)
      // apiKeys 可以是 id 数字、路径关键词或名称关键词
      targetApiItems = allItems.filter((item) =>
        apiKeys.some(
          (key) =>
            item.id.toString() === key ||
            item.path.toLowerCase().includes(key.toLowerCase()) ||
            item.name.toLowerCase().includes(key.toLowerCase())
        )
      )
      if (!targetApiItems.length) {
        console.log(chalk.yellow(`未找到匹配 "${apiKeys.join(', ')}" 的接口`))
        return
      }
    } else {
      console.log(chalk.red('请指定要生成的接口 ID/关键词，或使用 --all 生成全部'))
      process.exit(1)
    }

    // ── 按目录分组生成 ──
    const groupedByDir = new Map<string, typeof targetApiItems>()
    for (const item of targetApiItems) {
      let dirPath: string
      const groupDir = item.groupPath.join('/')
      dirPath = path.join(outputBase, groupDir)
      const existing = groupedByDir.get(dirPath) || []
      existing.push(item)
      groupedByDir.set(dirPath, existing)
    }

    let totalFiles = 0
    for (const [targetDir, items] of groupedByDir) {
      const ids = items.map((i) => i.id)
      const genSpinner = ora(`生成 ${targetDir} (${ids.length} 个接口)...`).start()
      try {
        const results = await generateApiFiles(targetDir, ids)
        for (const result of results) {
          if (options.dryRun) {
            console.log(chalk.dim(`[dry-run] ${result.apiFilePath}`))
            console.log(chalk.dim(`[dry-run] ${result.interfaceFilePath}`))
          } else {
            fs.mkdirSync(path.dirname(result.apiFilePath), { recursive: true })
            fs.writeFileSync(result.apiFilePath, result.apiContent, 'utf-8')
            fs.writeFileSync(result.interfaceFilePath, result.interfaceContent, 'utf-8')
            totalFiles += 2
          }
        }
        genSpinner.succeed(`已生成: ${path.relative(cwd, targetDir)}`)
      } catch (err: any) {
        genSpinner.fail(`生成失败: ${targetDir} — ${err.message}`)
      }
    }

    if (!options.dryRun) {
      console.log(chalk.green(`\n✓ 共生成 ${totalFiles} 个文件`))
    }
  } catch (err: any) {
    spinner.fail(`失败: ${err.message}`)
    process.exit(1)
  }
}
