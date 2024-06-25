/*
 * @FilePath: /AutoAPIGen/src/core/messenger.ts
 * @Description: 
 */
import * as vscode from 'vscode'

export const handleMessages = (webview: vscode.Webview) => {
	receiveMessages(webview)

	sendMessages(webview)
}

/**
 * 接收来自webview的消息
 *
 * @param webview vscode的Webview实例
 */
const receiveMessages = (webview: vscode.Webview) => {
	webview.onDidReceiveMessage(async (message) => {
		// let openPath: vscode.Uri

		switch (message.command) {
		case 'openFileExample':
			// const workspaceFolders = vscode.workspace.workspaceFolders
			// openPath = vscode.Uri.file(workspaceFolders[0].uri.fsPath + '/README.md')

			// vscode.workspace.openTextDocument(openPath).then(async (doc) => {
			// 	vscode.window.showTextDocument(doc)
			// })
			vscode.commands.executeCommand('AutoAPIGen.showContent')
			return
		}
	})
}

/**
 * 发送消息给 webview
 *
 * @param webview vscode 的 Webview 对象
 */
const sendMessages = (webview: vscode.Webview, ) => {
	vscode.window.onDidChangeActiveTextEditor(async (editor) => {
		if (!editor) return

		const currentFile = editor.document.fileName

		await webview.postMessage({
			command: 'setCurrentFileExample',
			text: currentFile
		})
	})
}
