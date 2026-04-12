/*
 * @FilePath: /AutoAPIGen/src/extension.ts
 * @Description: 
 */
/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="./global.d.ts" />
import * as vscode from 'vscode'
import path from 'path'
import { BaseViewProvider } from './core/webview/BaseViewProvider'
import { generateConfigPage } from './core/webview/configPageProvider'
import { generateApiDetailPage } from './core/webview/apiDetailPageProvider'
import { initializeWorkspaceStateUtil } from './core/workspace/stateManager'

// 定义一个公共函数处理模块加载错误
function handleModuleError(moduleName: string, e: Error): boolean {
    console.error(`模块 '${moduleName}' 无法加载: ${e.message}`);
    if (e.message.includes('Cannot find module')) {
        // 继续插件初始化，稍后在需要模块时再处理
        return true;
    }
    return false;
}

export function activate(context: vscode.ExtensionContext) {
    try {
        console.log('------>startTime', new Date().toLocaleTimeString())
        const workspaceFolders = vscode.workspace.workspaceFolders || []
        initializeWorkspaceStateUtil(context)

        if (workspaceFolders.length === 0) {
            vscode.window.showInformationMessage('还没有打开项目，无法使用 AutoAPIGen 插件')
            return
        }

        // 使用 WebviewViewProvider 代替 WebviewPanel 注册
        const provider = new BaseViewProvider(context.extensionUri, context)
        const baseWebview = vscode.window.registerWebviewViewProvider(
            BaseViewProvider.viewType, // WebviewViewProvider 注册标识符
            provider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true // 防止 Webview 被销毁
                }
            }
        )

        // 将 WebviewViewProvider 注册到 subscriptions
        context.subscriptions.push(baseWebview)

        // 如果你需要打开新的配置页，使用 WebviewPanel 时保留上下文
        let configPagePanel: vscode.WebviewPanel | undefined = undefined;
        const showConfigPagePanel = async (title: string) => {
            try {
                const columnToShowIn = vscode.window.activeTextEditor
                    ? vscode.window.activeTextEditor.viewColumn
                    : undefined

                if (configPagePanel) {
                    configPagePanel.reveal(columnToShowIn);
                } else {
                    configPagePanel = vscode.window.createWebviewPanel(
                        'ProjectConfig',
                        'Project Config',
                        columnToShowIn || vscode.ViewColumn.One,
                        {
                            enableScripts: true,
                            localResourceRoots: [context.extensionUri, vscode.Uri.joinPath(context.extensionUri, 'dist/compiled'), vscode.Uri.joinPath(context.extensionUri, 'dist')],
                            retainContextWhenHidden: true, // 保留上下文防止 Webview 被销毁
                        }
                    )

                    configPagePanel.title = title;
                    const iconPath = vscode.Uri.joinPath(context.extensionUri, 'dist/compiled', 'system-update.png')
                    configPagePanel.iconPath = iconPath;
                    configPagePanel.webview.html = generateConfigPage(configPagePanel.webview, context)

                    configPagePanel.onDidDispose(() => {
                        configPagePanel = undefined;
                    }, null, context.subscriptions)
                }
            } catch (error) {
                vscode.window.showErrorMessage(`打开配置页失败: ${error instanceof Error ? error.message : String(error)}`);
                if (configPagePanel) {
                    configPagePanel.dispose();
                    configPagePanel = undefined;
                }
            }
        }

        const disposable = vscode.commands.registerCommand('AutoAPIGen.showConfigPagePanel', showConfigPagePanel)
        context.subscriptions.push(disposable)

        // 关闭配置页
        const closeConfigPanel = vscode.commands.registerCommand('AutoAPIGen.closeConfigPagePanel', function () {
            if (configPagePanel) {
                configPagePanel.dispose()
            }
        })
        context.subscriptions.push(closeConfigPanel)

        // 打开接口详情页
        let apiDetailPanel: vscode.WebviewPanel | undefined = undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const showApiDetailPanel = async (title: string, data: any) => {
            try {
                // 始终在右侧列显示（vscode.ViewColumn.Beside）
                const targetColumn = vscode.ViewColumn.Beside;

                // 复用或创建面板
                if (apiDetailPanel) {
                    // 已存在面板时直接显示在右侧
                    apiDetailPanel.reveal(targetColumn, true); // preserveFocus 保持当前焦点
                } else {
                    // 创建新面板时直接指定右侧列
                    apiDetailPanel = vscode.window.createWebviewPanel(
                        'ApiDetail',
                        'Api Detail',
                        targetColumn,
                        {
                            enableScripts: true,
                            localResourceRoots: [context.extensionUri, 
                                vscode.Uri.joinPath(context.extensionUri, 'dist/compiled'), 
                                vscode.Uri.joinPath(context.extensionUri, 'dist')],
                            retainContextWhenHidden: true
                        }
                    );

                    // 注册面板关闭事件
                    apiDetailPanel.onDidDispose(() => {
                        apiDetailPanel = undefined;
                    }, null, context.subscriptions);
                }

                // 更新面板内容
                const httpType = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'];
                const iconPath = vscode.Uri.joinPath(
                    context.extensionUri,
                    'dist/compiled',
                    `${httpType.includes(data.method) ? data.method : 'http'}.png`
                );

                apiDetailPanel.title = title;
                apiDetailPanel.iconPath = iconPath;
                apiDetailPanel.webview.html = generateApiDetailPage(apiDetailPanel.webview, context, data);
            } catch (error) {
                vscode.window.showErrorMessage(`打开接口详情页失败: ${error instanceof Error ? error.message : String(error)}`);
                if (apiDetailPanel) {
                    apiDetailPanel.dispose();
                    apiDetailPanel = undefined;
                }
            }
        };

        const disposable2 = vscode.commands.registerCommand('AutoAPIGen.showApiDetailPanel', showApiDetailPanel);
        context.subscriptions.push(disposable2);

		// 启用 AI 工具支持（安装 CLI + 注入项目级 skill）
		const enableAISupportDisposable = vscode.commands.registerCommand('AutoAPIGen.enableAISupport', async () => {
			const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath
			if (!workspaceRoot) {
				vscode.window.showErrorMessage('未找到工作区目录，请先打开一个项目')
				return
			}

			// ── 1. 安装 CLI ──
			const terminal = vscode.window.createTerminal({
				name: 'AutoAPIGen — 启用 AI 支持',
				hideFromUser: false,
			})
			terminal.show()
			terminal.sendText('npm install -g auto-api-gen-cli')

			// ── 2. 读取 SKILL.md（打包在插件内）──
			const skillMdUri = vscode.Uri.joinPath(context.extensionUri, 'skills', 'auto-api-gen', 'SKILL.md')
			let skillContent = ''
			try {
				const raw = await vscode.workspace.fs.readFile(skillMdUri)
				skillContent = Buffer.from(raw).toString('utf-8')
			} catch {
				skillContent = '<!-- AutoAPIGen Skill: see https://github.com/983033995/AutoAPIGen/blob/main/skills/auto-api-gen/SKILL.md -->'
			}

			const MARKER_START = '<!-- AutoAPIGen:skill:start -->'
			const MARKER_END = '<!-- AutoAPIGen:skill:end -->'
			const block = `${MARKER_START}\n${skillContent}\n${MARKER_END}`

			/** 把 skill 块写入目标文件（已存在则替换 marker 区间，否则追加） */
			const injectSkill = async (filePath: string): Promise<void> => {
				const uri = vscode.Uri.file(filePath)
				const dirUri = vscode.Uri.file(path.dirname(filePath))
				try { await vscode.workspace.fs.createDirectory(dirUri) } catch { /* 目录已存在 */ }

				let existing = ''
				try {
					const raw = await vscode.workspace.fs.readFile(uri)
					existing = Buffer.from(raw).toString('utf-8')
				} catch { /* 文件不存在，从空内容开始 */ }

				let updated: string
				if (existing.includes(MARKER_START)) {
					updated = existing.replace(
						new RegExp(`${MARKER_START}[\\s\\S]*?${MARKER_END}`),
						block
					)
				} else {
					updated = existing ? `${existing}\n\n${block}` : block
				}
				await vscode.workspace.fs.writeFile(uri, Buffer.from(updated, 'utf-8'))
			}

			// 各 AI 工具识别的项目级规则文件
			const targets = [
				path.join(workspaceRoot, '.windsurfrules'),                         // Windsurf
				path.join(workspaceRoot, '.windsurf', 'rules', 'auto-api-gen.md'),  // Windsurf rules dir
				path.join(workspaceRoot, '.cursorrules'),                            // Cursor legacy
				path.join(workspaceRoot, '.cursor', 'rules', 'auto-api-gen.mdc'),   // Cursor rules dir
				path.join(workspaceRoot, 'CLAUDE.md'),                              // Claude Code
				path.join(workspaceRoot, '.github', 'copilot-instructions.md'),     // GitHub Copilot
			]

			const results = await Promise.allSettled(targets.map(injectSkill))
			const failed = results.filter(r => r.status === 'rejected').length
			const succeeded = results.length - failed

			const answer = await vscode.window.showInformationMessage(
				`AutoAPIGen AI 支持已启用！\n✓ aag CLI 正在安装中\n✓ Skill 已注入 ${succeeded} 个 AI 工具规则文件${failed ? `（${failed} 个失败）` : ''}`,
				'查看使用说明',
				'关闭'
			)
			if (answer === '查看使用说明') {
				vscode.env.openExternal(vscode.Uri.parse('https://github.com/983033995/AutoAPIGen/blob/main/skills/auto-api-gen/SKILL.md'))
			}
		})
		context.subscriptions.push(enableAISupportDisposable)

        // 复制文本内容
        const copyTextDisposable = vscode.commands.registerCommand('AutoAPIGen.copyToClipboard', async (text: string) => {
            try {
              await vscode.env.clipboard.writeText(text);
              vscode.window.showInformationMessage("文本已复制到剪贴板。");
            } catch (error) {
              vscode.window.showErrorMessage("复制到剪贴板时出错：" + error);
            }
          });
        
          context.subscriptions.push(copyTextDisposable);
    } catch (e) {
        if (e instanceof Error) {
            if (handleModuleError('@monaco-editor/loader', e)) {
                // 如果是monaco-editor加载器错误，继续尝试加载插件的其他功能
                vscode.window.showWarningMessage('Monaco编辑器加载失败，部分功能可能不可用');
            } else {
                // 如果是其他错误，显示具体错误信息并停止插件加载
                vscode.window.showErrorMessage(`插件激活失败: ${e.message}`);
                throw e; // 重新抛出错误以中断插件激活
            }
        } else {
            vscode.window.showErrorMessage(`插件激活失败: ${String(e)}`);
            throw e;
        }
    }
}