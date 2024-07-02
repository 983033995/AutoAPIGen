/*
 * @FilePath: /AutoAPIGen/src/extension.ts
 * @Description: 
 */
import * as vscode from 'vscode'
import { BaseViewProvider } from './core/BaseViewProvider'
import { generateConfigPage } from './core/configPageProvider'

export function activate(context: vscode.ExtensionContext) {
	const workspaceFolders = vscode.workspace.workspaceFolders || []

	if (workspaceFolders.length === 0) {
		vscode.window.showInformationMessage('还没有打开项目，无法使用 AutoAPIGen 插件')
		return
	}
	let configPagePanel: vscode.WebviewPanel | undefined = undefined;
	console.log('start----->configPagePanel', configPagePanel)
	const provider = new BaseViewProvider(context.extensionUri, context)

	const baseWebview = vscode.window.registerWebviewViewProvider(BaseViewProvider.viewType, provider)
	// 注册 BaseViewProvider
	context.subscriptions.push(baseWebview)

	const disposable = vscode.commands.registerCommand('AutoAPIGen.showConfigPagePanel', function (title, configInfo) {
		console.log('----->configInfo', configInfo)
		const columnToShowIn = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		if (configPagePanel) {
			// 如果已经存在，则激活
			configPagePanel.reveal(columnToShowIn)
		} else {
			// 否则创建一个新面板
			configPagePanel = vscode.window.createWebviewPanel(
				'ProjectConfig',
				'Project Config',
				columnToShowIn || vscode.ViewColumn.One,
				{
					enableScripts: true,
					localResourceRoots: [
						context.extensionUri
					]
				}
			)

			configPagePanel.title = title

			configPagePanel.webview.html = generateConfigPage(configPagePanel.webview, context)

			configPagePanel.onDidDispose(
				() => {
					configPagePanel = undefined;
				},
				null,
				context.subscriptions
			);
		}
	})
	context.subscriptions.push(disposable)

	const closeConfigPanel = vscode.commands.registerCommand('AutoAPIGen.closeConfigPagePanel', function () {
		if (configPagePanel) {
			configPagePanel.dispose()
		}
	})
	context.subscriptions.push(closeConfigPanel)
}
