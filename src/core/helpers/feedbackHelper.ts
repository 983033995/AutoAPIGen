/*
 * @FilePath: /AutoAPIGen/src/core/helpers/feedbackHelper.ts
 * @Description: 提供一些常用的提示消息显示方法
 */
/// <reference path="../../global.d.ts" />
import * as vscode from "vscode";
import * as path from "path";

export class FeedbackHelper {
    private static outputChannel: vscode.OutputChannel | undefined;
    /**
     * 显示错误消息，支持用户点击按钮执行相应操作
     * @param message 错误提示信息
     * @param actions 可选的用户操作按钮
     * @param onAction 用户点击按钮后的回调函数
     */
    public static showError(
        message: string,
        actions: string[] = [],
        onAction?: (selection: string | undefined) => void
    ): void {
        vscode.window.showErrorMessage(message, ...actions).then((selection) => {
            if (onAction) {
                onAction(selection);
            }
        });
    }

    /**
     * 显示警告消息，支持用户点击按钮执行相应操作
     * @param message 警告提示信息
     * @param actions 可选的用户操作按钮
     * @param onAction 用户点击按钮后的回调函数
     */
    public static showWarning(
        message: string,
        actions: string[] = [],
        onAction?: (selection: string | undefined) => void
    ): void {
        vscode.window.showWarningMessage(message, ...actions).then((selection) => {
            if (onAction) {
                onAction(selection);
            }
        });
    }

    /**
     * 显示信息消息，支持用户点击按钮执行相应操作
     * @param message 信息提示
     * @param actions 可选的用户操作按钮
     * @param onAction 用户点击按钮后的回调函数
     */
    public static showInfo(
        message: string,
        actions: string[] = [],
        onAction?: (selection: string | undefined) => void
    ): void {
        vscode.window
            .showInformationMessage(message, ...actions)
            .then((selection) => {
                if (onAction) {
                    onAction(selection);
                }
            });
    }

    /**
     * 显示状态栏消息，支持指定自动消失的时间
     * @param message 状态栏显示的信息
     * @param timeout 可选的自动消失时间（毫秒）
     */
    public static showStatus(
        message: string,
        timeout?: number
    ): vscode.Disposable {
        return vscode.window.setStatusBarMessage(message, timeout || 5000);
    }

    /**
     * 提供一个 QuickPick 下拉框供用户选择选项
     * @param items 供用户选择的选项列表
     * @param onSelect 用户选择选项后的回调函数
     */
    public static showQuickPick(
        items: string[],
        onSelect?: (selection: string | undefined) => void
    ): void {
        vscode.window.showQuickPick(items).then((selection) => {
            if (onSelect) {
                onSelect(selection);
            }
        });
    }

    /**
     * 提示文件创建结果，并提供路径跳转功能
     * @param files 创建成功的文件路径列表
     */
    public static showFileCreationResults(files: string[]): void {
        if (files.length === 0) {
            vscode.window.showInformationMessage("没有文件被创建。");
            return;
        }

        vscode.window
            .showInformationMessage(`创建了 ${files.length} 个文件。`, "查看文件")
            .then((selection) => {
                if (selection === "查看文件") {
                    // 提供多个文件供用户选择跳转
                    FeedbackHelper.showFilePicker(files);
                }
            });
    }

    /**
     * 显示一个 QuickPick 列表，用户选择文件后跳转到对应文件
     * @param files 文件路径列表
     */
    private static showFilePicker(files: string[]): void {
        const items = files.map((file) => {
            return {
                label: path.basename(file), // 文件名
                description: file, // 完整路径
            };
        });

        vscode.window
            .showQuickPick(items, {
                placeHolder: "请选择要打开的文件",
            })
            .then((selection) => {
                if (selection) {
                    const fileUri = vscode.Uri.file(selection.description || "");
                    // 打开对应文件
                    vscode.commands.executeCommand("vscode.open", fileUri);
                }
            });
    }

    /**
     * 将错误信息输出到VSCode的输出面板
     * @param errorMessage 要输出的错误信息
     */
    public static logErrorToOutput(errorMessage: string, type: 'Info' | 'Warning' | 'Error' = "Error"): void {
        // 如果输出通道不存在，才创建一个
        if (!this.outputChannel) {
            this.outputChannel = vscode.window.createOutputChannel("AutoAPIGen");
        }

        // 将错误信息输出到输出通道
        this.outputChannel.appendLine(`[${type}] ${errorMessage}`);

        // 显示输出面板
        this.outputChannel.show(true);
    }

    /**
       * 显示一个进度窗口，并执行指定任务
       * @param taskTitle 任务标题
       * @param task 任务函数，包含进度回调，用于更新进度
       */
    public static showProgress(taskTitle: string, task: (progress: vscode.Progress<{ message?: string, increment?: number }>) => Thenable<void>): void {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification, // 进度条显示在通知栏
            title: taskTitle,                               // 显示任务标题
            cancellable: false                              // 任务不可取消，如果你需要可取消功能，可以改为 true
        }, async (progress) => {
            // 执行传入的任务函数，并在任务过程中更新进度
            await task(progress);
        });
    }
}
