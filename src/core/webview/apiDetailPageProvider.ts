/*
 * @FilePath: /AutoAPIGen/src/core/webview/apiDetailPageProvider.ts
 * @Description: 
 */
/// <reference path="../../global.d.ts" />
import * as vscode from 'vscode'
import { handleMessages } from '../messenger'
import { injectMonacoLoaderScript } from '../monaco/loader'

export const generateApiDetailPage = (webview: vscode.Webview, context: vscode.ExtensionContext, extraInfo: any = undefined) => {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist/compiled', 'api.es.js'))

		// Do the same for the stylesheet.
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', 'output.css'))
		const styleArco = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist/compiled', 'style.css'))

		// Monaco编辑器CDN配置
		const monacoCdnPath = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs'
		// 本地回退路径
		const monacoLocalPath = webview.asWebviewUri(
			vscode.Uri.joinPath(context.extensionUri, 'dist/monaco')
		).toString()

		// 注入Monaco加载脚本
		const monacoLoaderScript = injectMonacoLoaderScript(monacoCdnPath, monacoLocalPath)

		// 更新CSP以允许CDN访问和内联脚本
		const csp = `default-src 'none'; img-src ${webview.cspSource} https: data:; script-src ${webview.cspSource} https://cdn.jsdelivr.net blob: 'unsafe-eval' 'unsafe-inline'; worker-src blob:; style-src ${webview.cspSource} https://cdn.jsdelivr.net 'unsafe-inline'; font-src ${webview.cspSource} https://cdn.jsdelivr.net; connect-src ${webview.cspSource} https://cdn.jsdelivr.net;`

		handleMessages(webview, context, 'apiDetailPageProvider')

		return `
			<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<meta http-equiv="Content-Security-Policy" content="${csp}">

					<link href="${styleMainUri}" rel="stylesheet">
					<link href="${styleArco}" rel="stylesheet">
					<title>配置信息</title>
				</head>
				<body>
					<script>
						const vscode = acquireVsCodeApi();
						window.extraInfo = ${JSON.stringify(extraInfo)};
						${monacoLoaderScript}
					</script>

					<div id="app"></div>

					<script type="module" src="${scriptUri}"></script>
				</body>
			</html>`
}
