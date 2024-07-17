/*
 * @FilePath: /AutoAPIGen/src/core/configPageProvider.ts
 * @Description: 
 */
import * as vscode from 'vscode'
import { handleMessages } from '../messenger'

export const generateConfigPage = (webview: vscode.Webview, context: vscode.ExtensionContext) => {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist/compiled', 'config.es.js'))

		// Do the same for the stylesheet.
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', 'output.css'))
		const styleArco = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist/compiled', 'style.css'))

		handleMessages(webview, context, 'configPageProvider')

		return `
			<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">

					<link href="${styleMainUri}" rel="stylesheet">
					<link href="${styleArco}" rel="stylesheet">

					<title>配置信息</title>
				</head>
				<body>
					<script>
						const vscode = acquireVsCodeApi();
					</script>

					<div id="app"></div>

					<script type="module" src="${scriptUri}"></script>
				</body>
			</html>`
}
