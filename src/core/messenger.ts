/*
 * @FilePath: /AutoAPIGen/src/core/messenger.ts
 * @Description: 
 */
/// <reference path="../global.d.ts" />
import * as vscode from 'vscode'
import { checkFolderOrFileExists, getText, getCurrentWorkspaceStructure, updateFileContent, withProgressWrapper, findSubtreePath, getPathsAndApiDetails } from './helpers/helper'
import { SETTING_FILE_URL } from '../constant/index'
import { initHttp, getProjectList, getApiDetailList, getApiTreeList, getDataSchemas } from './http/data'
import { getWorkspaceStateUtil } from './workspace/stateManager'
import { generateFile } from '../core/create/index'
import { FeedbackHelper } from './helpers/feedbackHelper'

const workspaceFolders = vscode.workspace.workspaceFolders || []

const webviewCollection: Record<WebviewCollectionKey, vscode.Webview | undefined> = {
	configPageProvider: undefined,
	BaseViewProvider: undefined
}

/**
 * 接收来自webview的消息
 *
 * @param webview vscode的Webview实例
 */
const receiveMessages = (webview: vscode.Webview, context: vscode.ExtensionContext, key: WebviewCollectionKey) => {
	webview.onDidReceiveMessage(async (message: WebviewMessage) => {
		try {
			const { command, data } = message
			console.log('---->data', data)
			const handler: WebviewMessageCollection = {
				// 打开插件配置页
				openConfigPage: () => {
					const { title, configInfo } = data
					vscode.commands.executeCommand('AutoAPIGen.showConfigPagePanel', title, configInfo)
				},
				// 初始化配置信息
				getWorkspaceState: async () => {
					await getWorkspaceState(webview, context, command, key, data.init)
				},
				setWorkspaceState: () => { },
				// 获取当前工作区目录
				getFolders: async () => {
					const folders = await getCurrentWorkspaceStructure(10)
					webview.postMessage({
						command,
						data: folders
					})
				},
				// 保存配置信息
				saveConfig: async () => {
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
						webviewCollection.BaseViewProvider?.postMessage({ command: 'loadData' })
						await getWorkspaceState(webviewCollection.BaseViewProvider as vscode.Webview, context, 'getWorkspaceState', 'BaseViewProvider', true)
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
				// 获取项目列表树形结构
				getProjectList: async () => {
					await initHttp(data.appName, {
						projectId: data?.projectId || '',
						Authorization: data?.Authorization,
					})
					const projectList = await getProjectList()
					getWorkspaceStateUtil().set('AutoApiGen.ApiProjectList', {
						updateTime: Date.now(),
						data: projectList || []
					})
					webview.postMessage({
						command,
						data: projectList
					})
				},
				// 操作接口
				interfaceOperate: async () => {
					console.log('----->interfaceOperate', data)
					const { type, itemType, key } = data as InterfaceOperateData
					const handler = {
						generate: async () => {
							const apiTreeList = getWorkspaceStateUtil().get('AutoApiGen.ApiTreeList')?.data || []
							const treeNode = findSubtreePath(apiTreeList, key)
							const configInfo = getWorkspaceStateUtil().get('AutoApiGen.setting')?.data?.configInfo || {}
							const filePathList = getPathsAndApiDetails(treeNode, key, configInfo.appName)
							console.log('----->treeNode', treeNode)
							console.log('----->filePathList', filePathList)
							FeedbackHelper.showProgress('正在生成文件...', async (progress) => {
								let process = 0
								progress.report({ increment: 10, message: `已完成 ${process}%` });
								await generateFile(filePathList, itemType, progress)
							})
						},
						copy: () => {}
					}
					handler[type] && await handler[type]()
				},
				joinEnd: () => {
					webview.postMessage({
						command: 'joinEnd',
						data: true
					})
				}
			}

			handler[command] && await handler[command]()
			handler.joinEnd()
		} catch (error) {
			console.error(`Error handling ${message.command}:`, error);
			webview.postMessage({
				command: 'error',
				data: { message: '处理消息时出错' }
			});
		}
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


/**
 * 处理Webview的消息
 *
 * @param webview vscode的Webview实例
 * @param context vscode的ExtensionContext实例
 * @param key webviewCollection的键
 */
export const handleMessages = (webview: vscode.Webview, context: vscode.ExtensionContext, key: WebviewCollectionKey) => {
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
async function getWorkspaceState(webview: vscode.Webview, context: vscode.ExtensionContext, command: string, key: WebviewCollectionKey, isInit = false) {
	try {
		const defaultSetting = getWorkspaceStateUtil().getWithDefault('AutoApiGen.setting', {
			updateTime: Date.now(),
			data: {
				language: 'zh',
			}
		})?.data

		// 读取配置文件
		let haveSetting = await checkFolderOrFileExists(SETTING_FILE_URL)

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
				const state = getWorkspaceStateUtil().getAll()
				// 从侧边栏发送的消息
				if (key === 'BaseViewProvider') {
					const detailListHas = getWorkspaceStateUtil().hasActive('AutoApiGen.ApiDetailList')
					const treeListHas = getWorkspaceStateUtil().hasActive('AutoApiGen.ApiTreeList')
					const dataSchemasHas = getWorkspaceStateUtil().hasActive('AutoApiGen.ApiDataSchemas')
					if (!isInit && detailListHas && treeListHas && dataSchemasHas) {
						settingObj.apiDetailList = state['AutoApiGen.ApiDetailList']?.data
						settingObj.apiTreeList = state['AutoApiGen.ApiTreeList']?.data
					} else {
						const [apiTreeList, apiDetail, apiDataSchemas] = await Promise.all([getApiTreeList(projectId), getApiDetailList(), getDataSchemas(projectId)])
						// const apiTreeList = await getApiTreeList(projectId)
						getWorkspaceStateUtil().set('AutoApiGen.ApiTreeList', {
							updateTime: Date.now(),
							data: apiTreeList || []
						})
						settingObj.apiTreeList = apiTreeList
						// const apiDetail = await getApiDetailList()
						getWorkspaceStateUtil().set('AutoApiGen.ApiDetailList', {
							updateTime: Date.now(),
							data: apiDetail || []
						})
						settingObj.apiDetailList = apiDetail
						getWorkspaceStateUtil().set('AutoApiGen.ApiDataSchemas', {
							updateTime: Date.now(),
							data: apiDataSchemas || []
						})
						settingObj.apiDataSchemas = apiDataSchemas
					}
				}
				if (!isInit && getWorkspaceStateUtil().hasActive('AutoApiGen.ApiProjectList')) {
					settingObj.apiProjectList = state['AutoApiGen.ApiProjectList']?.data
				} else {
					const projectList = await getProjectList()
					settingObj.apiProjectList = projectList
					getWorkspaceStateUtil().set('AutoApiGen.ApiProjectList', {
						updateTime: Date.now(),
						data: projectList || []
					})
				}
			} else {
				haveSetting = false
			}
		}
		console.log('------>settingObj', settingObj)
		const result: ConfigurationInformation = {
			...defaultSetting,
			workspaceFolders,
			haveSetting,
			configInfo: settingObj,
			theme: vscode.window.activeColorTheme,
		}
		const { apiDetailList, apiProjectList, apiTreeList, ...rest } = settingObj
		getWorkspaceStateUtil().set('AutoApiGen.setting', {
			updateTime: Date.now(),
			data: {
				...defaultSetting,
				workspaceFolders,
				haveSetting,
				theme: vscode.window.activeColorTheme,
				configInfo: rest,
			}
		})
		console.log('---->result', result.configInfo)
		webview.postMessage({
			command,
			data: result
		})
	} catch (error) {
		console.error('getWorkspaceState:', error)
		webview.postMessage({
			command,
			data: {
				haveSetting: false,
				theme: vscode.window.activeColorTheme,
			}
		})
		vscode.window.showErrorMessage('获取工作区状态失败')
	}
}
