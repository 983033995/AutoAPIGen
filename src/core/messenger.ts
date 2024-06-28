/*
 * @FilePath: /AutoAPIGen/src/core/messenger.ts
 * @Description: 
 */
import * as vscode from 'vscode'
import { checkFolderOrFileExists, getText, getCurrentWorkspaceStructure, updateFileContent } from '../core/helper'
import { SETTING_FILE_URL } from '../constant/index'
import { initHttp, getProjectList, http } from './data'

const workspaceFolders = vscode.workspace.workspaceFolders || []

type webviewCollectionKey = 'configPageProvider' | 'BaseViewProvider'

const webviewCollection: Record<webviewCollectionKey, vscode.Webview | undefined> = {
	configPageProvider: undefined,
	BaseViewProvider: undefined
}

export const handleMessages = (webview: vscode.Webview, context: vscode.ExtensionContext, key: webviewCollectionKey) => {
	receiveMessages(webview, context)

	sendMessages(webview)

	webviewCollection[key] = webview
}

async function getWorkspaceState(webview: vscode.Webview, context: vscode.ExtensionContext, command: string) {

	try {
		const defaultSetting = context.workspaceState.get('AutoApiGen.setting', {
			language: 'zh',
		})
		const haveSetting = await checkFolderOrFileExists(SETTING_FILE_URL)
		console.log('----->haveSetting', haveSetting)

		let settingObj: ProjectConfigInfo = {}
		if (haveSetting) {
			const settingFileUrl = vscode.Uri.joinPath(workspaceFolders[0].uri, SETTING_FILE_URL)
			const settingFile = await getText(settingFileUrl)
			settingObj = settingFile ? JSON.parse(settingFile) : {}
			if (settingObj.Authorization && settingObj.appName) {
				await initHttp(settingObj.appName, {
					projectId: settingObj?.projectId || '',
					Authorization: settingObj?.Authorization,
				})
			}
		}
		const result: ConfigurationInformation = {
			workspaceFolders,
			haveSetting,
			configInfo: settingObj,
			theme: vscode.window.activeColorTheme,
			...defaultSetting
		}
		webview.postMessage({
			command,
			data: result
		})
	} catch (error) {
		console.error('getWorkspaceState:', error)
	}
}

/**
 * 接收来自webview的消息
 *
 * @param webview vscode的Webview实例
 */
const receiveMessages = (webview: vscode.Webview, context: vscode.ExtensionContext) => {
	webview.onDidReceiveMessage(async (message: WebviewMessage) => {
		// let openPath: vscode.Uri
		console.log('----->', message)
		const { command, data } = message
		const handler: WebviewMessageCollection = {
			openConfigPage: () => {
				const { title, configInfo } = data
				vscode.commands.executeCommand('AutoAPIGen.showDetail', title, configInfo)
			},
			getWorkspaceState: async () => {
				console.log('----->getWorkspaceState')
				await getWorkspaceState(webview, context, command)
			},
			setWorkspaceState: () => { },
			getFolders: async () => {
				const folders = await getCurrentWorkspaceStructure(10)
				console.log('----->getFolders', folders)
				webview.postMessage({
					command,
					data: folders
				})
			},
			saveConfig: async () => {
				console.log('----saveConfig', data)
				try {
					await updateFileContent(SETTING_FILE_URL, data)
					webview.postMessage({
						command,
						data: {
							success: true,
							message: '保存成功'
						}
					})
					await getWorkspaceState(webviewCollection.BaseViewProvider as vscode.Webview, context, 'getWorkspaceState')
				} catch (error) {
					webview.postMessage({
						command,
						data: {
							success: false,
							message: '保存失败'
						}
					})
				}
			},
			getProjectList: async () => {
				if (!http) {
					await initHttp(data.appName, {
						projectId: data?.projectId || '',
						Authorization: data?.Authorization,
					})
				}
				const projectList = await getProjectList()
				webview.postMessage({
					command,
					data: projectList
				})
			}
		}

		handler[command] && await handler[command]()
	})
}

/**
 * 发送消息给 webview
 *
 * @param webview vscode 的 Webview 对象
 */
const sendMessages = (webview: vscode.Webview) => {
	vscode.window.onDidChangeActiveTextEditor(async (editor) => {
		if (!editor) return

		const currentFile = editor.document.fileName

		await webview.postMessage({
			command: 'setCurrentFileExample',
			text: currentFile
		})
	})
}
