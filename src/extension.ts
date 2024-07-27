/*
 * @FilePath: /AutoAPIGen/src/extension.ts
 * @Description: 
 */
import * as vscode from 'vscode'
import { BaseViewProvider } from './core/webview/BaseViewProvider'
import { generateConfigPage } from './core/webview/configPageProvider'
import { initializeWorkspaceStateUtil } from './core/workspace/stateManager'

export function activate(context: vscode.ExtensionContext) {
    console.log('------>startTime', new Date().toLocaleTimeString())
	const workspaceFolders = vscode.workspace.workspaceFolders || []
	initializeWorkspaceStateUtil(context)

	if (workspaceFolders.length === 0) {
		vscode.window.showInformationMessage('还没有打开项目，无法使用 AutoAPIGen 插件')
		return
	}

	const provider = new BaseViewProvider(context.extensionUri, context)

	const baseWebview = vscode.window.registerWebviewViewProvider(BaseViewProvider.viewType, provider)
	// 注册 BaseViewProvider
	context.subscriptions.push(baseWebview)

	// 注册配置页
	let configPagePanel: vscode.WebviewPanel | undefined = undefined;
	const showConfigPagePanel = async (title: string) => {
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
                    localResourceRoots: [context.extensionUri]
                }
            )

            configPagePanel.title = title;
            configPagePanel.webview.html = generateConfigPage(configPagePanel.webview, context)

            configPagePanel.onDidDispose(() => {
                configPagePanel = undefined;
            }, null, context.subscriptions)
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
}
