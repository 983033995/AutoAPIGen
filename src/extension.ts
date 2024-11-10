/*
 * @FilePath: /AutoAPIGen/src/extension.ts
 * @Description: 
 */
/// <reference path="./global.d.ts" />
import * as vscode from 'vscode'
import { BaseViewProvider } from './core/webview/BaseViewProvider'
import { generateConfigPage } from './core/webview/configPageProvider'
import { initializeWorkspaceStateUtil } from './core/workspace/stateManager'

export function activate(context: vscode.ExtensionContext) {
    console.log('------>startTime', new Date().toLocaleTimeString())
    const workspaceFolders = vscode.workspace.workspaceFolders || []
    initializeWorkspaceStateUtil(context)

    if (workspaceFolders.length === 0) {
        vscode.window.showInformationMessage('还没有打开项目，无法使用 AutoAPIGen 插件')
        return
    }

    // 使用 WebviewViewProvider 代替 WebviewPanel 注册
    const provider = new BaseViewProvider(context.extensionUri, context)
    const baseWebview = vscode.window.registerWebviewViewProvider(
        BaseViewProvider.viewType, // WebviewViewProvider 注册标识符
        provider,
        {
            webviewOptions: {
                retainContextWhenHidden: true // 防止 Webview 被销毁
            }
        }
    )

    // 将 WebviewViewProvider 注册到 subscriptions
    context.subscriptions.push(baseWebview)

    // 如果你需要打开新的配置页，使用 WebviewPanel 时保留上下文
    let configPagePanel: vscode.WebviewPanel | undefined = undefined;
    const showConfigPagePanel = async (title: string) => {
        const columnToShowIn = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined

        if (configPagePanel) {
            configPagePanel.reveal(columnToShowIn);
        } else {
            configPagePanel = vscode.window.createWebviewPanel(
                'ProjectConfig',
                'Project Config',
                columnToShowIn || vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [context.extensionUri, vscode.Uri.joinPath(context.extensionUri, 'dist/compiled'), vscode.Uri.joinPath(context.extensionUri, 'dist')],
                    retainContextWhenHidden: true, // 保留上下文防止 Webview 被销毁
                }
            )

            configPagePanel.title = title;
            const iconPath = vscode.Uri.joinPath(context.extensionUri, 'dist/compiled', 'system-update.png')
            configPagePanel.iconPath = iconPath;
            configPagePanel.webview.html = generateConfigPage(configPagePanel.webview, context)

            configPagePanel.onDidDispose(() => {
                configPagePanel = undefined;
            }, null, context.subscriptions)
        }
    }

    const disposable = vscode.commands.registerCommand('AutoAPIGen.showConfigPagePanel', showConfigPagePanel)
    context.subscriptions.push(disposable)

    // 关闭配置页
    const closeConfigPanel = vscode.commands.registerCommand('AutoAPIGen.closeConfigPagePanel', function () {
        if (configPagePanel) {
            configPagePanel.dispose()
        }
    })
    context.subscriptions.push(closeConfigPanel)
}