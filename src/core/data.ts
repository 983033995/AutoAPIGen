/*
 * @FilePath: /AutoAPIGen/src/core/data.ts
 * @Description: 
 */
import * as vscode from 'vscode'
import { api } from './api'
import type { AxiosInstance } from 'axios'

export let http: AxiosInstance

export const initHttp = async (appName: AppCollections, data: Record<string, any>) => {
    http = await api({
        appName,
        ...data,
    })
}

export const getProjectList = async () => {
    try {
        const [spaceListRes, projectListRes] = await Promise.all([
            http.get('/user-teams?locale=zh-CN'),
            http.get('/user-projects?locale=zh-CN')
        ]);
        if (spaceListRes.status === 200 && spaceListRes.status === 200) {
            const spaceList = spaceListRes.data.data
            const projectList = projectListRes.data.data
            const projectListTree = spaceList.map((item: any) => {
                item.children = projectList.filter((project: any) => project.teamId === item.id)
                return item
            })
            return projectListTree
        }
        throw new Error('')
    } catch (error: any) {
        console.error('----->getProjectList--error', error)
        vscode.window.showErrorMessage(`获取项目列表失败: ${error?.message || '未知错误'}`)
    }
}

export const getApiDetailList = async () => {
    try {
        const res = await http.get('/api-details?locale=zh-CN')
        return res.data.data
    } catch (error: any) {
        console.error('----->getApiDetailList--error', error)
        vscode.window.showErrorMessage(`获取接口详情失败: ${error?.message || '未知错误'}`)
    }
}

