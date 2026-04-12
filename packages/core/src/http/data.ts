import { AxiosInstance } from 'axios'
import { createApiClient } from './api'
import type { AppCollections, ApiTreeListResData, ApiDetailListData, ApiDataSchemasItem } from '../types'

export let http: AxiosInstance

export interface InitHttpOptions {
  projectId: string | number
  Authorization?: string
  Cookie?: string
  [key: string]: any
}

export const initHttp = async (appName: AppCollections, data: InitHttpOptions): Promise<void> => {
  let configData = { ...data }

  if (data.Cookie && data.projectId) {
    try {
      const tempHttp = createApiClient({ appName, ...data })
      const branchRes = await tempHttp.get(`/projects/${data.projectId}/sprint-branches?locale=zh-CN`)
      const branches = branchRes.data.data
      const mainBranch = branches.find((branch: any) => branch.name === 'main') || branches[0]
      if (mainBranch) {
        configData.branchId = mainBranch.id.toString()
      }
    } catch {
      // ignore branch fetch error
    }
  }

  http = createApiClient({ appName, ...configData })
}

export const getProjectList = async (): Promise<any[]> => {
  const [spaceListRes, projectListRes] = await Promise.all([
    http.get('/user-teams?locale=zh-CN'),
    http.get('/user-projects?locale=zh-CN'),
  ])

  const spaceList = spaceListRes.data.data
  const projectList = projectListRes.data.data

  return spaceList.map((item: any) => {
    item.children = projectList.filter((project: any) => project.teamId === item.id)
    return item
  })
}

export const getUserProjects = async (): Promise<any[]> => {
  const res = await http.get('/user-projects?locale=zh-CN')
  return res.data.data || []
}

export const getApiDetailList = async (): Promise<ApiDetailListData[]> => {
  const res = await http.get('/api-details?locale=zh-CN')
  return res.data.data
}

export const getApiTreeList = async (projectId: number): Promise<ApiTreeListResData[]> => {
  const res = await http.get(`/projects/${projectId}/api-tree-list?locale=zh-CN`)
  return res.data.data
}

export const getDataSchemas = async (projectId: number): Promise<ApiDataSchemasItem[]> => {
  const res = await http.get(`/projects/${projectId}/data-schemas?locale=zh-CN`)
  return res.data.data
}

export const getProjectMembers = async (teamId: number): Promise<any[]> => {
  const res = await http.get(`project-members?locale=zh-CN&teamId=${teamId}`)
  return res.data.data
}
