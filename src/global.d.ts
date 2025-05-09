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

// Monaco编辑器配置和加载方法
interface Window {
  monaco?: any;
  monacoConfig?: {
    cdnPath: string;
    localPath?: string;
    useLocalWhenCdnFails: boolean;
  };
  loadMonacoEditor?: () => Promise<any>;
}

type ApiType = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options' | 'trace'

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never

type AppCollections = 'apifox' | 'postman' | 'apipost'

type WebviewMessageKey = 'getWorkspaceState' | 'setWorkspaceState' | 'openConfigPage' | 'getFolders' | 'saveConfig' | 'getProjectList' | 'interfaceOperate' | 'joinEnd' | 'showApiDetail' | 'getApiDetail' | 'copyToClipboard'

type WebviewMessageCollection = Record<WebviewMessageKey, (...args: any[]) => any>

type WebviewMessage = {
  command: WebviewMessageKey
  data: Record<string, any>
}


interface ConfigurationInformation {
  language: string
  haveSetting: boolean
  workspaceFolders: readonly vscode.WorkspaceFolder[]
  theme: vscode.ColorTheme
  configInfo: ProjectConfigInfo
}

type generateConfigPageParams = (currentPanel: vscode.WebviewPanel | undefined, title: string, configInfo: ProjectConfigInfo) => void

type apiModelType = 'vueUse' | 'axios' | 'VueHookPlus' | 'wx' | 'custom'

interface ConfigFromModel {
  appName: AppCollections
  Authorization: string
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
}

type KeysType = Expand<keyof ConfigFromModel>


interface ProjectConfigInfo extends Partial<ConfigFromModel> {
  apiDetailList?: ApiDetailListData[]
  apiTreeList?: ApiTreeListResData[]
  apiProjectList?: any[]
  apiDataSchemas?: ApiDataSchemasItem[]
  [key: string]: any
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

type treeItemType = "apiDetailFolder" | "apiDetail"

type ApiTreeListResData = {
  children: ApiTreeListResData[]
  folder: FolderItem
  key: string
  name: string
  type: treeItemType
  api?: apiDetailItem
}

type WebviewCollectionKey = 'configPageProvider' | 'BaseViewProvider' | 'apiDetailPageProvider'

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

// 全部的空间缓存数据
type WorkspaceStateKey = 'AutoApiGen.ApiProjectList' | 'AutoApiGen.ApiTreeList' | 'AutoApiGen.ApiDetailList' | 'AutoApiGen.setting' | 'AutoApiGen.ApiDataSchemas' | 'AutoApiGen.UserProjects' | 'AutoApiGen.ProjectMembers'
type WorkspaceStateData = {
  updateTime: number,
  data: any
}
type WorkspaceState = {
  [key in WorkspaceStateKey]?: WorkspaceStateData
}

type InterfaceHandlerType = 'generate' | 'copy'

type PathApiDetail = {
  path: string
  keyArr: string[]
  pathArr: string[]
  api: apiDetailItem[]
}

interface InterfaceOperateData {
  type: InterfaceHandlerType
  itemType: treeItemType,
  key: string
}

interface ApiDetailResponseData {
  current_page: number;
  data: {
    intention_id: number;
    intention_name: string;
    module_id: number;
    business_scope: null[];
    keywords: string;
    standard_question: string;
    similar_question_total: number;
    similar_question: {
      id: null;
      similar_question_name: string;
    }[];
    standard_answer_text: string;
    standard_answer_rich: null;
    answer_rich_bot_intent_ids: string[];
    answer_rich_question_total: number;
    answer_rich_question: string[];
    mac_detect_similar: null;
    intention_status: number;
    creator_name: string;
    created_at: string;
    updator_name: string;
    updated_at: string;
    synchronized_bot: string[];
    module_name?: string;
    has_insert_question?: number;
    synchronized_bot_id?: number;
  }[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: {
    url: string | null;
    label: string;
    active: boolean;
  }[];
  next_page_url: null;
  path: string;
  per_page: number;
  prev_page_url: null;
  to: number;
  total: number;
}

interface ApiDetailResponse {
  code: number;
  message: string;
  data: ApiDetailResponseData;
  $ref?: string;
}

interface ApiDetailParametersQuery {
  id: string;
  name: string;
  required: boolean;
  description: string;
  example: string | number;
  type: string;
  enable: boolean;
  schema?: {
    type?: string;
    [key: string]: any
  }
  items: {
    [key: string]: any
  }
  enum: any[];
}
interface ApiDetailParameters {
  query: ApiDetailParametersQuery[];
  path: ApiDetailParametersQuery[]; // Replace with specific type if needed
  cookie: any[]; // Replace with specific type if needed
  header: {
    required: boolean;
    description: string;
    type: string;
    id: string;
    example: string;
    enable: boolean;
    name: string;
  }[];
}
interface ApiDetailListData {
  id: number;
  name: string;
  creatorName: string
  editorName: string
  type: string;
  serverId: string;
  preProcessors: any[]; // Replace with specific type if needed
  postProcessors: any[]; // Replace with specific type if needed
  inheritPreProcessors: any; // Replace with specific type if needed
  inheritPostProcessors: any; // Replace with specific type if needed
  description: string;
  operationId: string;
  sourceUrl: string;
  method: string;
  path: string;
  tags: string[];
  status: string;
  requestBody: {
    type: string;
    parameters: any[]; // Replace with specific type if needed
    example?: string;
    examples?: {
      value: string;
      [key: string]: any
    }[];
    jsonSchema: {
      type: string;
      required: string[];
      properties: {
        [key: string]: {
          type: string;
          items: {
            type: string;
            [key: string]: any
          }
          description?: string;
        };
      }
      "x-apifox-orders"?: string[];
      [key: string]: any
    };
  };
  parameters: ApiDetailParameters
  commonParameters: {
    query: any[]; // Replace with specific type if needed
    body: any[]; // Replace with specific type if needed
    cookie: any[]; // Replace with specific type if needed
    header: {
      name: string;
      enable: boolean;
    }[];
  };
  auth: any; // Replace with specific type if needed
  responses: {
    id: number;
    name: string;
    code: number;
    contentType: string;
    jsonSchema: ApiDetailResponse; // Assuming response structure is consistent
    defaultEnable: boolean;
    ordering: number;
    $ref?: string;
  }[];
  responseExamples: any[]; // Replace with specific type if needed
  codeSamples: any[]; // Replace with specific type if needed
  projectId: number;
  folderId: number;
  ordering: number;
  responsibleId: number;
  commonResponseStatus: {
    [key: string]: boolean;
  };
  advancedSettings: {
    disabledSystemHeaders: any; // Replace with specific type if needed
    isDefaultUrlEncoding: number;
  };
  customApiFields: any; // Replace with specific type if needed
  mockScript: any; // Replace with specific type if needed
  createdAt: string;
  updatedAt: string;
  creatorId: number;
  editorId: number;
  responseChildren: string[];
}

interface ApiDataSchemasItem {
  id: number;
  name: string;
  displayName?: string; // displayName 可能为空，因此使用可选属性
  jsonSchema: {
    type: "object";
    properties: {
      code: {
        type: "integer";
        enum: number[];
        "x-apifox": {
          enumDescriptions: Record<number, string>;
        };
        title: string;
      };
      message: {
        type: "string";
        title: string;
      };
      invalid_fields: {
        type: "array";
        items: {
          field: {
            type: "string";
            title: string;
          };
          error: {
            type: "string";
            title: string;
          };
        };
        title: string;
        description?: string; // description 可能为空，因此使用可选属性
        "x-apifox-orders": string[];
        required: string[];
      };
      data: {
        type: "object";
        properties: Record<string, unknown>; // 使用 Record 允许任意属性
        title: string;
        "x-apifox-orders": string[];
      };
    };
    "x-apifox-orders": string[];
    required: string[];
  };
  folderId: number;
  description?: string; // description 可能为空，因此使用可选属性
  projectId: number;
  ordering: number;
  creatorId: number;
  editorId: number;
  createdAt: string;
  updatedAt: string;
}

interface ApiDetailGather extends apiDetailItem {
  apiFunctionName: string
  useApiFunctionName: string
  apiFunctionPath: vscode.Uri
  apiFunctionContext: string
  apiInterfaceContext: string
  interfaceQueryName: string
  interfaceResName: string
}
declare module 'prettier-plugin-organize-imports';

interface ProjectMemberUser {
  id: number
  deletedAt: any
  name: string
  username: string
  email: string
  employeeNumber: any
  bio: string
  tokenRefreshVersion: number
  deviceIds: any[]
  webDeviceIds: any[]
  allowDeviceCount: number
  status: number
  mobile: any
  features: Record<string, any>
  accessedAt: any
  createdAt: string
  updatedAt: string
  avatar: string
}

interface ProjectMember {
  id: number
  createdAt: string
  updatedAt: string
  teamId: number
  userId: number
  projectId: number
  roleType: number
  lastActiveTime: string
  user: ProjectMemberUser
  nickname: string
  roleName: string
}