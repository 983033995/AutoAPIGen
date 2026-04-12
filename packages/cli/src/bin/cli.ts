#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import { loadConfig } from '../config'
import { runQuery, runGroups } from '../commands/query'
import { runGenerate } from '../commands/generate'
import { runInteractive } from '../commands/interactive'

const program = new Command()

program
  .name('aag')
  .description('AutoAPIGen CLI — query Apifox APIs and generate TypeScript code')
  .version('1.0.0')

// ─── aag query [keyword] ──────────────────────────────────────────────────────
program
  .command('query [keyword]')
  .description('搜索接口列表，支持按路径/名称关键词过滤')
  .option('-g, --group <group>', '按分组名称过滤')
  .option('-j, --json', '输出完整 JSON（适合 AI 工具使用）')
  .option('--ids-only', '只输出接口 ID（空格分隔，AI 可直接拼接到 generate 命令）')
  .option('-l, --limit <n>', '限制返回数量', (val) => parseInt(val, 10), 50)
  .action(async (keyword: string | undefined, opts: any) => {
    try {
      const config = loadConfig()
      await runQuery(config, keyword, {
        group: opts.group,
        json: opts.json,
        idsOnly: opts.idsOnly,
        limit: opts.limit,
      })
    } catch (err: any) {
      console.error(chalk.red(`✗ ${err.message}`))
      process.exit(1)
    }
  })

// ─── aag generate [apiIds...] ─────────────────────────────────────────────────
program
  .command('generate [apiIds...]')
  .description('生成指定接口的 TypeScript 代码（无参数时进入交互式选择）')
  .option('-a, --all', '生成全部接口')
  .option('-o, --output <dir>', '指定输出目录（默认读取配置文件 path 字段）')
  .option('--dry-run', '预览生成路径，不实际写入文件')
  .option('-i, --interactive', '强制进入交互式选择模式')
  .action(async (apiIds: string[], opts: any) => {
    try {
      const config = loadConfig()
      // 无参数 / 指定 -i 时进入交互模式
      if ((!apiIds.length && !opts.all) || opts.interactive) {
        await runInteractive(config, opts.output)
      } else {
        await runGenerate(config, apiIds, {
          all: opts.all,
          output: opts.output,
          dryRun: opts.dryRun,
        })
      }
    } catch (err: any) {
      console.error(chalk.red(`✗ ${err.message}`))
      process.exit(1)
    }
  })

// ─── aag groups ──────────────────────────────────────────────────────────────
program
  .command('groups')
  .description('列出所有接口分组及其接口 ID（AI 用此确定要生成哪个分组）')
  .option('-j, --json', '输出 JSON 格式（含完整树结构和 ID 列表）')
  .action(async (opts: any) => {
    try {
      const config = loadConfig()
      await runGroups(config, { json: opts.json })
    } catch (err: any) {
      console.error(chalk.red(`✗ ${err.message}`))
      process.exit(1)
    }
  })

// ─── aag ui (交互式主入口) ──────────────────────────────────────────────────
program
  .command('ui')
  .description('交互式界面：分组浏览 → 接口多选 → 生成代码')
  .option('-o, --output <dir>', '指定输出目录（默认读取配置文件 path 字段）')
  .action(async (opts: any) => {
    try {
      const config = loadConfig()
      await runInteractive(config, opts.output)
    } catch (err: any) {
      console.error(chalk.red(`✗ ${err.message}`))
      process.exit(1)
    }
  })

// ─── aag init ────────────────────────────────────────────────────────────────
program
  .command('init')
  .description('检查当前项目的 AutoAPIGen 配置')
  .action(() => {
    try {
      const config = loadConfig()
      console.log(chalk.green('✓ 配置文件读取成功'))
      console.log(chalk.cyan('\n当前配置：'))
      console.log(`  appName:   ${chalk.white(config.appName)}`)
      console.log(`  projectId: ${chalk.white(config.projectId.join(', '))}`)
      console.log(`  path:      ${chalk.white(config.path)}`)
      console.log(`  model:     ${chalk.white(config.model || 'axios')}`)
    } catch (err: any) {
      console.error(chalk.red(`✗ ${err.message}`))
      process.exit(1)
    }
  })

program.parse(process.argv)
