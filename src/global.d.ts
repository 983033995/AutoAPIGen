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