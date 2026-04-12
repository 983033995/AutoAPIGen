export type ApiType = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options' | 'trace'

export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never

export type AppCollections = 'apifox' | 'postman' | 'apipost'

export type apiModelType = 'vueUse' | 'axios' | 'VueHookPlus' | 'wx' | 'custom'

export type treeItemType = 'apiDetailFolder' | 'apiDetail'

export type GetModelOptionsParams = {
  appName: AppCollections
  branchId?: string
  [key: string]: any
}

export interface ConfigFromModel {
  appName: AppCollections
  Authorization: string
  Cookie: string
  path: string
  projectId: number[]
  model: apiModelType
  prettierSetting: string
  axiosPath?: string
  head?: string
  customReturn?: string
  customExtraFunction?: string
  axiosReturnKey?: string
  alias?: string
  useProjectName: boolean
  useProjectId?: boolean
  useTypeExtension?: boolean
}

export interface ProjectConfigInfo extends Partial<ConfigFromModel> {
  apiDetailList?: ApiDetailListData[]
  apiTreeList?: ApiTreeListResData[]
  apiProjectList?: any[]
  apiDataSchemas?: ApiDataSchemasItem[]
  [key: string]: any
}

export interface FolderItem {
  docId: number
  id: number
  name: string
  type: string
  parentId: number
  projectBranchId: number
}

export interface apiDetailItem {
  folderId: number
  id: number
  name: string
  type: string
  path: string
  method: string
  [key: string]: any
}

export type ApiTreeListResData = {
  children: ApiTreeListResData[]
  folder: FolderItem
  key: string
  name: string
  type: treeItemType
  api?: apiDetailItem
}

export interface ApiDetailParametersQuery {
  id: string
  name: string
  required: boolean
  description: string
  example: string | number
  type: string
  enable: boolean
  schema?: {
    type?: string
    [key: string]: any
  }
  items: {
    [key: string]: any
  }
  enum: any[]
}

export interface ApiDetailParameters {
  query: ApiDetailParametersQuery[]
  path: ApiDetailParametersQuery[]
  cookie: any[]
  header: {
    required: boolean
    description: string
    type: string
    id: string
    example: string
    enable: boolean
    name: string
  }[]
}

export interface ApiDetailListData {
  id: number
  name: string
  creatorName: string
  editorName: string
  type: string
  serverId: string
  preProcessors: any[]
  postProcessors: any[]
  inheritPreProcessors: any
  inheritPostProcessors: any
  description: string
  operationId: string
  sourceUrl: string
  method: string
  path: string
  tags: string[]
  status: string
  requestBody: {
    type: string
    parameters: any[]
    example?: string
    examples?: {
      value: string
      [key: string]: any
    }[]
    jsonSchema: {
      type: string
      required: string[]
      properties: {
        [key: string]: {
          type: string
          items: {
            type: string
            [key: string]: any
          }
          description?: string
        }
      }
      'x-apifox-orders'?: string[]
      [key: string]: any
    }
  }
  parameters: ApiDetailParameters
  commonParameters: {
    query: any[]
    body: any[]
    cookie: any[]
    header: {
      name: string
      enable: boolean
    }[]
  }
  auth: any
  responses: {
    id: number
    name: string
    code: number
    contentType: string
    jsonSchema: any
    defaultEnable: boolean
    ordering: number
    $ref?: string
  }[]
  responseExamples: any[]
  codeSamples: any[]
  projectId: number
  folderId: number
  ordering: number
  responsibleId: number
  commonResponseStatus: {
    [key: string]: boolean
  }
  advancedSettings: {
    disabledSystemHeaders: any
    isDefaultUrlEncoding: number
  }
  customApiFields: any
  mockScript: any
  createdAt: string
  updatedAt: string
  creatorId: number
  editorId: number
  responseChildren: string[]
}

export interface ApiDataSchemasItem {
  id: number
  name: string
  displayName?: string
  jsonSchema: {
    type: 'object'
    properties: Record<string, any>
    [key: string]: any
  }
  folderId: number
  description?: string
  projectId: number
  ordering: number
  creatorId: number
  editorId: number
  createdAt: string
  updatedAt: string
}

export type PathApiDetail = {
  path: string
  keyArr: string[]
  pathArr: string[]
  api: apiDetailItem[]
}

export interface ApiDetailGather extends apiDetailItem {
  apiFunctionName: string
  useApiFunctionName: string
  apiFunctionPath: string
  apiFunctionContext: string
  apiInterfaceContext: string
  interfaceQueryName: string
  interfaceResName: string
}

export type WorkspaceStateKey =
  | 'AutoApiGen.ApiProjectList'
  | 'AutoApiGen.ApiTreeList'
  | 'AutoApiGen.ApiDetailList'
  | 'AutoApiGen.setting'
  | 'AutoApiGen.ApiDataSchemas'
  | 'AutoApiGen.UserProjects'
  | 'AutoApiGen.ProjectMembers'

export type WorkspaceStateData = {
  updateTime: number
  data: any
}

export type WorkspaceState = {
  [key in WorkspaceStateKey]?: WorkspaceStateData
}
