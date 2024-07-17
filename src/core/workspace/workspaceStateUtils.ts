/*
 * @FilePath: /AutoAPIGen/src/core/workspace/workspaceStateUtils.ts
 * @Description: 
 */
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
    public get<T>(key: string): T | undefined {
        return this.workspaceState.get<T>(key);
    }

    /**
     * 获取存储的状态值，如果不存在则返回默认值
     * @param key - 状态键
     * @param defaultValue - 默认值
     * @returns 存储的状态值或默认值
     */
    public getWithDefault<T>(key: string, defaultValue: T): T {
        return this.workspaceState.get<T>(key, defaultValue);
    }

    /**
     * 设置存储的状态值
     * @param key - 状态键
     * @param value - 状态值
     * @returns 一个解析为 void 的 Promise
     */
    public async set<T>(key: string, value: T): Promise<void> {
        await this.workspaceState.update(key, value);
    }

    /**
     * 批量设置存储的状态值
     * @param entries - 包含键值对的数组
     * @returns 一个解析为 void 的 Promise
     */
    public async setMany(entries: [string, any][]): Promise<void> {
        for (const [key, value] of entries) {
            await this.set(key, value);
        }
    }

    /**
     * 删除存储的状态值
     * @param key - 状态键
     * @returns 一个解析为 void 的 Promise
     */
    public async delete(key: string): Promise<void> {
        await this.workspaceState.update(key, undefined);
    }

    /**
     * 批量删除存储的状态值
     * @param keys - 状态键数组
     * @returns 一个解析为 void 的 Promise
     */
    public async deleteMany(keys: string[]): Promise<void> {
        for (const key of keys) {
            await this.delete(key);
        }
    }

    /**
     * 重置存储的所有状态值
     * @returns 一个解析为 void 的 Promise
     */
    public async reset(): Promise<void> {
        const keys = this.workspaceState.keys();
        for (const key of keys) {
            await this.delete(key);
        }
    }

    /**
     * 获取存储的所有状态键
     * @returns 一个包含所有状态键的字符串数组
     */
    public keys(): readonly string[] {
        return this.workspaceState.keys();
    }

    /**
     * 检查状态键是否存在
     * @param key - 状态键
     * @returns 一个布尔值，表示状态键是否存在
     */
    public has(key: string): boolean {
        return this.workspaceState.keys().includes(key);
    }
}