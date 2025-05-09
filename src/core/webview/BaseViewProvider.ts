/*
 * @FilePath: /AutoAPIGen/src/core/webview/BaseViewProvider.ts
 * @Description: 
 */
/// <reference path="../../global.d.ts" />
import * as vscode from 'vscode'
import { handleMessages } from '../messenger'
import { injectMonacoLoaderScript } from '../monaco/loader'

export class BaseViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'base-view-sidebar'

	private _view?: vscode.WebviewView

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _context: vscode.ExtensionContext
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
			localResourceRoots: [
				this._extensionUri
			]
		}

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview)
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist/compiled', 'index.es.js'))

		// Do the same for the stylesheet.
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'output.css'))
		const styleArco = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist/compiled', 'style.css'))

		// Monaco编辑器CDN配置
		const monacoCdnPath = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs'
		// 本地回退路径
		const monacoLocalPath = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'dist/monaco')
		).toString()

		// 注入Monaco加载脚本
		const monacoLoaderScript = injectMonacoLoaderScript(monacoCdnPath, monacoLocalPath)

		// 更新CSP以允许CDN访问和内联脚本
		const csp = `default-src 'none'; img-src ${webview.cspSource} https: data:; script-src ${webview.cspSource} https://cdn.jsdelivr.net blob: 'unsafe-eval' 'unsafe-inline'; worker-src blob:; style-src ${webview.cspSource} https://cdn.jsdelivr.net 'unsafe-inline'; font-src ${webview.cspSource} https://cdn.jsdelivr.net; connect-src ${webview.cspSource} https://cdn.jsdelivr.net;`

		handleMessages(webview, this._context, 'BaseViewProvider')

		return `
			<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<meta http-equiv="Content-Security-Policy" content="${csp}">

					<link href="${styleMainUri}" rel="stylesheet">
					<link href="${styleArco}" rel="stylesheet">

					<title>Base View Extension</title>
				</head>
				<body>
					<script>
						const vscode = acquireVsCodeApi();
						${monacoLoaderScript}
					</script>

					<div id="app"></div>

					<script type="module" src="${scriptUri}"></script>
				</body>
			</html>`
	}
}
