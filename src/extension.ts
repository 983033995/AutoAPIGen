/*
 * @FilePath: /AutoAPIGen/src/extension.ts
 * @Description: 
 */
import * as vscode from 'vscode'
import { BaseViewProvider } from './core/BaseViewProvider'
import { generateConfigPage } from './core/configPageProvider'

export function activate(context: vscode.ExtensionContext) {
	let currentPanel: vscode.WebviewPanel | undefined = undefined;
	console.log('start----->currentPanel', currentPanel)
	const provider = new BaseViewProvider(context.extensionUri, context)

	const baseWebview = vscode.window.registerWebviewViewProvider(BaseViewProvider.viewType, provider)
	// 注册 BaseViewProvider
	context.subscriptions.push(baseWebview)

	const disposable = vscode.commands.registerCommand('AutoAPIGen.showDetail', function (title, configInfo) {
		console.log('----->configInfo', configInfo)
		const columnToShowIn = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		if (currentPanel) {
			// We re-use a panel when it's already open:
			currentPanel.reveal(columnToShowIn)
		} else {
			// Otherwise, create a new panel:
			currentPanel = vscode.window.createWebviewPanel(
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

			currentPanel.title = title

			currentPanel.webview.html = generateConfigPage(currentPanel.webview, context)

			currentPanel.onDidDispose(
				() => {
				  currentPanel = undefined;
				},
				null,
				context.subscriptions
			);
		}
	})
	context.subscriptions.push(disposable)

	// const message = context.workspaceState.get('AutoApiGen.setting', {
	// 	language: 'zh',
	// 	app: 'apifox'
	// })
}
