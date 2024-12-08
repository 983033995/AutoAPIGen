/*
 * @FilePath: /AutoAPIGen/src/core/workspace/workspaceStateUtils.ts
 * @Description: 
 */
/// <reference path="../../global.d.ts" />
import * as vscode from 'vscode';

/**
 * WorkspaceStateUtil 类，用于管理 VS Code 的 workspaceState 持久化数据。
 */
export class WorkspaceStateUtil {
    private workspaceState: vscode.Memento;

    constructor(context: vscode.ExtensionContext) {
        this.workspaceState = context.workspaceState;
    }

    /**
     * 获取存储的状态值
     * @param key - 状态键
     * @returns 存储的状态值
     */
    public get(key: WorkspaceStateKey): WorkspaceStateData | undefined {
        return this.workspaceState.get(key);
    }
    /**
     * 获取存储的所有状态值
     * @returns 一个对象，其中包含了所有存储的状态键和对应的值
     */
    public getAll(): WorkspaceState {
        const result: WorkspaceState = {
            "AutoApiGen.ApiProjectList": {
                updateTime: 0,
                data: [],
            },
            "AutoApiGen.ApiTreeList": {
                updateTime: 0,
                data: [],
            },
            "AutoApiGen.ApiDetailList": {
                updateTime: 0,
                data: [],
            },
        };
        const keys = this.workspaceState.keys() as (keyof WorkspaceState)[];
        for (const key of keys) {
            result[key] = this.get(key);
        }
        return result;
    }
    /**
     * 获取存储的状态值，如果不存在则返回默认值
     * @param key - 状态键
     * @param defaultValue - 默认值
     * @returns 存储的状态值或默认值
     */
    public getWithDefault(key: WorkspaceStateKey, defaultValue: WorkspaceStateData): WorkspaceStateData | undefined {
        return this.workspaceState.get(key, defaultValue);
    }

    /**
     * 设置存储的状态值
     * @param key - 状态键
     * @param value - 状态值
     * @returns 一个解析为 void 的 Promise
     */
    public async set(key: WorkspaceStateKey, value: WorkspaceStateData): Promise<void> {
        await this.workspaceState.update(key, value);
    }

    /**
     * 批量设置存储的状态值
     * @param entries - 包含键值对的数组
     * @returns 一个解析为 void 的 Promise
     */
    public async setMany(entries: [WorkspaceStateKey, WorkspaceStateData][]): Promise<void> {
        for (const [key, value] of entries) {
            await this.set(key, value);
        }
    }

    /**
     * 删除存储的状态值
     * @param key - 状态键
     * @returns 一个解析为 void 的 Promise
     */
    public async delete(key: WorkspaceStateKey): Promise<void> {
        await this.workspaceState.update(key, undefined);
    }

    /**
     * 批量删除存储的状态值
     * @param keys - 状态键数组
     * @returns 一个解析为 void 的 Promise
     */
    public async deleteMany(keys: WorkspaceStateKey[]): Promise<void> {
        for (const key of keys) {
            await this.delete(key);
        }
    }

    /**
     * 重置存储的所有状态值
     * @returns 一个解析为 void 的 Promise
     */
    public async reset(): Promise<void> {
        const keys = this.workspaceState.keys() as WorkspaceStateKey[];
        for (const key of keys) {
            await this.delete(key);
        }
    }

    /**
     * 获取存储的所有状态键
     * @returns 一个包含所有状态键的字符串数组
     */
    public keys(): readonly WorkspaceStateKey[] {
        return this.workspaceState.keys() as WorkspaceStateKey[];
    }

    /**
     * 检查状态键是否存在
     * @param key - 状态键
     * @returns 一个布尔值，表示状态键是否存在
     */
    public has(key: WorkspaceStateKey): boolean {
        return this.workspaceState.keys().includes(key);
    }

    /**
     * 检查状态值是否为空且是否需要更新
     * @param key - 状态键
     * @returns 一个布尔值，表示状态键存在且还不需要更新
     */
    public hasActive(key: WorkspaceStateKey, interval = 30 * 10 * 1000): boolean {
        if (!this.has(key) || !this.get(key)?.data || !this.get(key)?.data.length) {
            return false;
        }
        return (this.get(key)?.updateTime || 0) - Date.now() < interval;
    }
}
