/*
 * @FilePath: /AutoAPIGen/src/extension.ts
 * @Description: 
 */
/// <reference path="./global.d.ts" />
import * as vscode from 'vscode'
import { BaseViewProvider } from './core/webview/BaseViewProvider'
import { generateConfigPage } from './core/webview/configPageProvider'
import { generateApiDetailPage } from './core/webview/apiDetailPageProvider'
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

    // 打开接口详情页
    let apiDetailPanel: vscode.WebviewPanel | undefined = undefined;
    const showApiDetailPanel = async (title: string, data: any) => {
        try {
            const columnToShowIn = vscode.window.activeTextEditor
                ? vscode.window.activeTextEditor.viewColumn
                : undefined;

            // 更新或创建面板
            if (!apiDetailPanel) {
                apiDetailPanel = vscode.window.createWebviewPanel(
                    'ApiDetail',
                    'Api Detail',
                    vscode.ViewColumn.Beside,
                    {
                        enableScripts: true,
                        localResourceRoots: [context.extensionUri, vscode.Uri.joinPath(context.extensionUri, 'dist/compiled'), vscode.Uri.joinPath(context.extensionUri, 'dist')],
                        retainContextWhenHidden: true
                    }
                );
                apiDetailPanel.reveal(vscode.ViewColumn.Beside);
                // 注册面板关闭事件
                apiDetailPanel.onDidDispose(() => {
                    apiDetailPanel = undefined;
                }, null, context.subscriptions);
            }

            // 显示面板
            apiDetailPanel.reveal(columnToShowIn);

            // 更新面板内容
            const httpType = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'];
            const iconPath = vscode.Uri.joinPath(
                context.extensionUri,
                'dist/compiled',
                `${httpType.includes(data.method) ? data.method : 'http'}.png`
            );

            apiDetailPanel.title = title;
            apiDetailPanel.iconPath = iconPath;
            apiDetailPanel.webview.html = generateApiDetailPage(apiDetailPanel.webview, context);
            apiDetailPanel.webview.postMessage(data);
        } catch (error) {
            vscode.window.showErrorMessage(`打开接口详情页失败: ${error instanceof Error ? error.message : String(error)}`);
            if (apiDetailPanel) {
                apiDetailPanel.dispose();
                apiDetailPanel = undefined;
            }
        }
    };

    const disposable2 = vscode.commands.registerCommand('AutoAPIGen.showApiDetailPanel', showApiDetailPanel);
    context.subscriptions.push(disposable2);

    // 复制文本内容
    const copyTextDisposable = vscode.commands.registerCommand('AutoAPIGen.copyToClipboard', async (text: string) => {
        try {
          await vscode.env.clipboard.writeText(text);
          vscode.window.showInformationMessage("文本已复制到剪贴板。");
        } catch (error) {
          vscode.window.showErrorMessage("复制到剪贴板时出错：" + error);
        }
      });
    
      context.subscriptions.push(copyTextDisposable);
}