/*
 * @FilePath: /AutoAPIGen/src/core/messenger.ts
 * @Description: 
 */
import * as vscode from 'vscode'
import { checkFolderOrFileExists, getText, getCurrentWorkspaceStructure, updateFileContent } from '../core/helper'
import { SETTING_FILE_URL } from '../constant/index'
import { initHttp, getProjectList, http, getApiDetailList, getApiTreeList } from './data'

const workspaceFolders = vscode.workspace.workspaceFolders || []

type webviewCollectionKey = 'configPageProvider' | 'BaseViewProvider'

const webviewCollection: Record<webviewCollectionKey, vscode.Webview | undefined> = {
	configPageProvider: undefined,
	BaseViewProvider: undefined
}

/**
 * 处理Webview的消息
 *
 * @param webview vscode的Webview实例
 * @param context vscode的ExtensionContext实例
 * @param key webviewCollection的键
 */
export const handleMessages = (webview: vscode.Webview, context: vscode.ExtensionContext, key: webviewCollectionKey) => {
	receiveMessages(webview, context, key)

	sendMessages(webview)

	webviewCollection[key] = webview
}

/**
 * 获取工作区状态
 *
 * @param webview webview 对象
 * @param context 扩展上下文
 * @param command 命令字符串
 * @param key webview 集合键
 * @returns 无返回值，通过 webview.postMessage 发送结果
 */
async function getWorkspaceState(webview: vscode.Webview, context: vscode.ExtensionContext, command: string, key: webviewCollectionKey) {
	console.log('----->getWorkspaceState---webview', webview)
	try {
		const defaultSetting = context.workspaceState.get('AutoApiGen.setting', {
			language: 'zh',
		})
		let haveSetting = await checkFolderOrFileExists(SETTING_FILE_URL)
		console.log('----->haveSetting', haveSetting)

		let settingObj: ProjectConfigInfo = {}
		if (haveSetting) {
			const settingFileUrl = vscode.Uri.joinPath(workspaceFolders[0].uri, SETTING_FILE_URL)
			const settingFile = await getText(settingFileUrl)
			settingObj = settingFile ? JSON.parse(settingFile) : {}
			
			// 有了配置文件，配置对应应用的接口请求
			if (settingObj.Authorization && settingObj.appName && Array.isArray(settingObj.projectId) && settingObj.projectId.length > 0) {
				const projectId = settingObj.projectId[settingObj.projectId.length - 1]
				await initHttp(settingObj.appName, {
					projectId,
					Authorization: settingObj?.Authorization,
				})
				if  (key === 'BaseViewProvider') {
					// const apiDetail = await getApiDetailList()
					// settingObj.apiDetailList = apiDetail
					const apiTreeList = await getApiTreeList(projectId)
					settingObj.apiTreeList = apiTreeList
				}
			} else {
				haveSetting = false
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
		vscode.window.showErrorMessage('获取工作区状态失败')
	}
}

/**
 * 接收来自webview的消息
 *
 * @param webview vscode的Webview实例
 */
const receiveMessages = (webview: vscode.Webview, context: vscode.ExtensionContext, key: webviewCollectionKey) => {
	webview.onDidReceiveMessage(async (message: WebviewMessage) => {
		// let openPath: vscode.Uri
		console.log('----->', message)
		const { command, data } = message
		const handler: WebviewMessageCollection = {
			openConfigPage: () => {
				const { title, configInfo } = data
				vscode.commands.executeCommand('AutoAPIGen.showConfigPagePanel', title, configInfo)
			},
			getWorkspaceState: async () => {
				console.log('----->getWorkspaceState')
				await getWorkspaceState(webview, context, command, key)
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
					vscode.commands.executeCommand('AutoAPIGen.closeConfigPagePanel')
					webview.postMessage({
						command,
						data: {
							success: true,
							message: '保存成功'
						}
					})
					await getWorkspaceState(webviewCollection.BaseViewProvider as vscode.Webview, context, 'getWorkspaceState', key)
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
