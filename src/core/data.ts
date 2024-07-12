/*
 * @FilePath: /AutoAPIGen/src/core/data.ts
 * @Description: 
 */
import * as vscode from 'vscode'
import { api } from './api'
import type { AxiosInstance } from 'axios'

export let http: AxiosInstance

/**
 * 初始化HTTP请求
 *
 * @param appName 应用集合名称
 * @param data 初始化参数，可以是任意类型
 * @returns 无返回值，但会设置全局的http变量
 */
export const initHttp = async (appName: AppCollections, data: Record<string, any>) => {
    http = await api({
        appName,
        ...data,
    })
}

/**
 * 获取项目列表
 *
 * @returns 项目列表树形结构
 * @throws 获取项目列表失败时抛出错误
 */
export const getProjectList = async () => {
    try {
        const [spaceListRes, projectListRes] = await Promise.all([
            http.get('/user-teams?locale=zh-CN'),
            http.get('/user-projects?locale=zh-CN')
        ]);
        
        if (spaceListRes.status === 200 && projectListRes.status === 200) {
            const spaceList: UserTeamsResData = spaceListRes.data.data
            const projectList: UserProjectResData = projectListRes.data.data
            const projectListTree = spaceList.map((item: any) => {
                item.children = projectList.filter((project: any) => project.teamId === item.id)
                return item
            })
            return projectListTree
        }
        throw new Error('获取空间列表或项目列表时，其中一个或多个请求失败')
    } catch (error: any) {
        console.error('----->getProjectList--error', error)
        vscode.window.showErrorMessage(`获取项目列表失败: ${error?.message || '未知错误'}`)
    }
}

/**
 * 获取接口详情列表
 *
 * @returns 返回接口详情列表数据
 */
export const getApiDetailList = async () => {
    try {
        const res = await http.get('/api-details?locale=zh-CN')
        return res.data.data
    } catch (error: any) {
        vscode.window.showErrorMessage(`获取接口详情失败: ${error?.message || '未知错误'}`)
    }
}

/**
 * 获取指定项目的接口树列表
 *
 * @param projectId 项目ID
 * @returns 返回接口树列表数据
 * @throws 当请求失败时，抛出错误并显示错误信息
 */
export const getApiTreeList = async (projectId: number) => {
    try {
        const res = await http.get(`/projects/${projectId}/api-tree-list?locale=zh-CN`)
        return res.data.data
    } catch (error: any) {
        vscode.window.showErrorMessage(`获取接口树失败: ${error?.message || '未知错误'}`)
    }
}

export const initPageData = async () => {
    try {
        // const stateApiTreeList = vscode.workspace.ge
    } catch (error) {
        
    }
}