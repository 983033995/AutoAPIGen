/*
 * @FilePath: /AutoAPIGen/src/core/workspace/stateManager.ts
 * @Description: 
 */
/// <reference path="../../global.d.ts" />
import * as vscode from 'vscode';
import { WorkspaceStateUtil } from './workspaceStateUtils';

let workspaceStateUtil: WorkspaceStateUtil;

/**
 * 初始化 WorkspaceStateUtil 实例
 * @param context - VS Code 扩展上下文
 */
export function initializeWorkspaceStateUtil(context: vscode.ExtensionContext) {
    workspaceStateUtil = new WorkspaceStateUtil(context);
}

/**
 * 获取 WorkspaceStateUtil 实例
 * @returns WorkspaceStateUtil 实例
 * @throws 如果实例未初始化则抛出错误
 */
export function getWorkspaceStateUtil(): WorkspaceStateUtil {
    if (!workspaceStateUtil) {
        throw new Error('WorkspaceStateUtil is not initialized');
    }
    return workspaceStateUtil;
}