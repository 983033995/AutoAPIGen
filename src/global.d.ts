/*
 * @FilePath: /AutoAPIGen/src/global.d.ts
 * @Description: 
 */

type VSCode = {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
};

declare const vscode: VSCode;

type ApiType = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options' | 'trace'

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never

type AppCollections = 'apifox' | 'postman' | 'apipost'

type WebviewMessageKey = 'getWorkspaceState' | 'setWorkspaceState' | 'openConfigPage' | 'getFolders' | 'saveConfig' | 'getProjectList'

type WebviewMessageCollection = Record<WebviewMessageKey, (...args: any[]) => any >

type WebviewMessage = {
  command: WebviewMessageKey
  data: Record<string, any>
}


interface ConfigurationInformation {
  language: string
  haveSetting: boolean
  workspaceFolders: readonly vscode.WorkspaceFolder[]
  theme: vscode.ColorTheme
  configInfo:  ProjectConfigInfo
}

type generateConfigPageParams = (currentPanel: vscode.WebviewPanel | undefined, title: string, configInfo: ProjectConfigInfo) => void

interface ConfigFromModel {
  appName: AppCollections
  Authorization: string
  path: string[]
  projectId: number[]
  model: string
  head?: string
  get?: string
  post?: string
  put?: string
  delete?: string
  patch?: string
}

type KeysType = Expand<keyof ConfigFromModel>


interface ProjectConfigInfo extends Partial<ConfigFromModel>{
  apiDetailList?: any[]
  apiTreeList?: ApiTreeListResData[]
  apiProjectList?: any[]
}

type DirectoryItem = {
  name: string
  type: 'file' | 'directory'
  key: string
  children?: DirectoryItem[]
};

type GetModelOptionsParams = {
  appName: AppCollections,
  [key: string]: any
}

type ApifoxResponse<T> = {
  data: T
  success: boolean
}
interface AxiosReturn<T, D = ApifoxResponse<T>> {
  config: AxiosRequestConfig
  data: D
  headers: Record<string, any>
  request: ClientRequest
  status: number
  statusText: string
}

type UserTeamsResData = Partial<{
  description: string
  id: number
  name: string
  organizationId: number
  paymentMode: string
  roleType: number
}[]>

type UserProjectResData = Partial<{
  categoryIds: any
  id: number
  description: string
  icon: string
  name: string
  teamId: number
  type: string
  visibility: string
  [key: string]: any
}[]>

interface FolderItem {
  docId: number
  id: number
  name: string
  type: string
  parentId: number
  projectBranchId: number
}

interface apiDetailItem {
  folderId: number
  id: number
  name: string
  type: string
  path: string
  method: string
  [key: string]: any
}

type ApiTreeListResData = {
  children: ApiTreeListResData[]
  folder: FolderItem
  key: string
  name: string
  type: "apiDetailFolder" | "apiDetail"
  api?: apiDetailItem
}

type WebviewCollectionKey = 'configPageProvider' | 'BaseViewProvider'

type WebviewMessageCommand = 'openConfigPage' | 'getWorkspaceState' | 'setWorkspaceState' | 'getFolders' | 'saveConfig' | 'getProjectList'

interface WebviewMessage {
  command: WebviewMessageCommand
  data: any
}

type ApiTypeMap = {
  [K in ApiType]: { class: string, color: string }
}

interface TreeNode {
  id: number;
  name: string;
  children?: TreeNode[];
  [key: string]: any
}