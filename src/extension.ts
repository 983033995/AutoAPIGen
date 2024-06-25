/*
 * @FilePath: /AutoAPIGen/src/extension.ts
 * @Description: 
 */
import * as vscode from 'vscode'
import { BaseViewProvider } from './core/BaseViewProvider'

export function activate(context: vscode.ExtensionContext) {
	const provider = new BaseViewProvider(context.extensionUri)

	// 注册 BaseViewProvider
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(BaseViewProvider.viewType, provider)
	)

	const disposable = vscode.commands.registerCommand('AutoAPIGen.showContent', function () {
		const panel = vscode.window.createWebviewPanel(
			'customContent',
			'Custom Content',
			vscode.ViewColumn.One,
			{}
		)

		panel.webview.html = `<html><body><h1>Hello, Custom Content!</h1></body></html>`
	})
	context.subscriptions.push(disposable)

	const message = context.workspaceState.get('AutoApiGen.setting', {
		language: 'zh',
		app: 'apifox'
	})


}
