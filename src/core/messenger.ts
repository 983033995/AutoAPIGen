/*
 * @FilePath: /AutoAPIGen/src/core/messenger.ts
 * @Description: 
 */
/// <reference path="../global.d.ts" />
import * as vscode from "vscode";
import {
  checkFolderOrFileExists,
  getText,
  getCurrentWorkspaceStructure,
  updateFileContent,
  withProgressWrapper,
  findSubtreePath,
  getPathsAndApiDetails,
  replacePathAlias,
  revealSymbol,
  addImportSymbol,
  cnToPinyin
} from "./helpers/helper";
import { SETTING_FILE_URL } from "../constant/index";
import {
  initHttp,
  getProjectList,
  getApiDetailList,
  getApiTreeList,
  getDataSchemas,
  getProjectMembers
} from "./http/data";
import { getWorkspaceStateUtil } from "./workspace/stateManager";
import { generateFile } from "../core/create/index";
import { FeedbackHelper } from "./helpers/feedbackHelper";
import * as utils from './create/utils'
import nodePath from 'path'

const workspaceFolders = vscode.workspace.workspaceFolders || [];

const webviewCollection: Record<
  WebviewCollectionKey,
  vscode.Webview | undefined
> = {
  configPageProvider: undefined,
  BaseViewProvider: undefined,
  apiDetailPageProvider: undefined,
};

const setProjectMembers = async () => {
  const projectIds = getWorkspaceStateUtil().get('AutoApiGen.setting')?.data.configInfo.projectId
  const UserProjects = getWorkspaceStateUtil().get('AutoApiGen.UserProjects')?.data || []
  const project = UserProjects.find((item: Record<string, any>) => item.id === projectIds[projectIds.length - 1])
  let projectMembers: ProjectMember[] | [] = []
  if (project) {
    try {
      projectMembers = await getProjectMembers(project.teamId)
    } catch (error) {
      console.error('获取项目成员失败', error)
    }
  }
  getWorkspaceStateUtil().set('AutoApiGen.ProjectMembers', {
    updateTime: Date.now(),
    data: projectMembers || []
  })
}

const getApiInfo = (key: string) => {
  const apiTreeList =
    getWorkspaceStateUtil().get("AutoApiGen.ApiTreeList")?.data ||
    [];
  const treeNode = findSubtreePath(apiTreeList, key);
  const configInfo =
    getWorkspaceStateUtil().get("AutoApiGen.setting")?.data
      ?.configInfo || {};
  const filePathList = getPathsAndApiDetails(
    treeNode,
    key,
    configInfo.appName
  );
  const setting: ConfigurationInformation = getWorkspaceStateUtil().get('AutoApiGen.setting')?.data || {}
  const workspaceFoldersPath = setting.workspaceFolders[0].uri.fsPath
  const { path: relativePath, api } = filePathList[0]
  let projectName = ''
  if (setting.configInfo?.useProjectName) {
    const projectList = getWorkspaceStateUtil().get('AutoApiGen.UserProjects')?.data || []
    console.log('------>projectList', projectList)
    const projectIds = setting.configInfo.projectId || []
    projectName = projectList.find((project: Record<string, any>) => project.id === projectIds[projectIds.length - 1])?.name || ''
  }
  // `${workspaceFoldersPath}${setting.configInfo.path}/${projectName ? relativePath.replace(setting.configInfo.appName || '', `${setting.configInfo.appName || ''}/${utils.convertPathToPascalCase(cnToPinyin(projectName)).trim()}`) : relativePath}`
  const commonPath = nodePath.join(workspaceFoldersPath, setting.configInfo.path || '', `${projectName ? relativePath.replace(setting.configInfo.appName || '', `${setting.configInfo.appName || ''}/${utils.convertPathToPascalCase(cnToPinyin(projectName)).trim()}`) : relativePath}`)
  const apiFunctionPath = vscode.Uri.file(nodePath.join(commonPath, `${setting.configInfo.appName}.ts`))
  const apiFunctionName = `${api[0].method}${utils.convertPathToPascalCase(api[0].path)}`
  const apiInterfacePath = vscode.Uri.file(nodePath.join(commonPath, `interface.ts`))
  let importFunctionPath = apiFunctionPath.path
  let importInterfacePath = apiInterfacePath.path
  if (configInfo.alias) {
    const target = configInfo.alias.split(/[:：]/).map((item: string) => item.trim())
    importFunctionPath = replacePathAlias(apiFunctionPath.path, target)
    importInterfacePath = replacePathAlias(apiInterfacePath.path, target)
  } else {
    const editor = vscode.window.activeTextEditor;

    if (editor) {
      const filePath = editor.document.uri.fsPath;
      importFunctionPath = utils.getRelativeImportPath(filePath, apiFunctionPath.path);
      importInterfacePath = utils.getRelativeImportPath(filePath, apiInterfacePath.path);
    }
  }
  const importFunctionStr = `import { ${apiFunctionName} } from '${importFunctionPath}';`
  
  return {
    apiFunctionPath,
    apiFunctionName,
    apiInterfacePath,
    importFunctionPath,
    importFunctionStr,
    importInterfacePath,
    interfaceQueryName: `${apiFunctionName}Query`,
    interfaceBodyQueryName: `${apiFunctionName}Body`,
    interfaceResName: `${apiFunctionName}Res`,
  }
}

/**
 * 接收来自webview的消息
 *
 * @param webview vscode的Webview实例
 */
const receiveMessages = (
  webview: vscode.Webview,
  context: vscode.ExtensionContext,
  key: WebviewCollectionKey
) => {
  webview.onDidReceiveMessage(async (message: WebviewMessage) => {
    try {
      const { command, data } = message;
      console.log("---->data", data);
      const handler: WebviewMessageCollection = {
        // 复制到剪贴板
        copyToClipboard: () => {
          vscode.commands.executeCommand('AutoAPIGen.copyToClipboard', data.text || '');
        },
        // 打开插件配置页
        openConfigPage: () => {
          const { title, configInfo } = data;
          vscode.commands.executeCommand(
            "AutoAPIGen.showConfigPagePanel",
            title,
            configInfo
          );
        },
        // 初始化配置信息
        getWorkspaceState: async () => {
          await getWorkspaceState(webview, context, command, key, data.init);
          setProjectMembers()
        },
        setWorkspaceState: () => { },
        // 获取当前工作区目录
        getFolders: async () => {
          const folders = await getCurrentWorkspaceStructure(10);
          webview.postMessage({
            command,
            data: folders,
          });
        },
        // 获取接口详情
        getApiDetail: async () => {
          const apiDetailList: ApiDetailListData[] = getWorkspaceStateUtil().get('AutoApiGen.ApiDetailList')?.data || []
          const apiID = data?.id || ''
          const apiDetail = apiDetailList.find(item => item.id === apiID)
          const projectMembers: ProjectMember[] | [] = getWorkspaceStateUtil().get('AutoApiGen.ProjectMembers')?.data || []
          if (projectMembers.length && apiDetail) {
            apiDetail.creatorName = projectMembers.find(item => item.userId === apiDetail.creatorId)?.nickname || ''
            apiDetail.editorName = projectMembers.find(item => item.userId === apiDetail.editorId)?.nickname || ''
          }
          const apiDataSchemas = getWorkspaceStateUtil().get('AutoApiGen.ApiDataSchemas')?.data || []
          webview.postMessage({
            command: "setApiDetail",
            data: {
              ...apiDetail,
              generateInfo: getApiInfo(`apiDetail.${apiDetail?.id || ''}`),
              apiDataSchemas
            }
          });
        },
        // 保存配置信息
        saveConfig: async () => {
          try {
            await updateFileContent(SETTING_FILE_URL, data);
            vscode.commands.executeCommand("AutoAPIGen.closeConfigPagePanel");
            webview.postMessage({
              command,
              data: {
                success: true,
                message: "保存成功",
              },
            });
            webviewCollection.BaseViewProvider?.postMessage({
              command: "loadData",
            });
            getWorkspaceState(
              webviewCollection.BaseViewProvider as vscode.Webview,
              context,
              "getWorkspaceState",
              "BaseViewProvider",
              true
            );
          } catch (error) {
            webview.postMessage({
              command,
              data: {
                success: false,
                message: "保存失败",
              },
            });
          }
          setProjectMembers()
        },
        // 获取项目列表树形结构
        getProjectList: async () => {
          await initHttp(data.appName, {
            projectId: data?.projectId || "",
            Authorization: data?.Authorization,
          });
          const projectList = await getProjectList();
          getWorkspaceStateUtil().set("AutoApiGen.ApiProjectList", {
            updateTime: Date.now(),
            data: projectList || [],
          });
          webview.postMessage({
            command,
            data: projectList,
          });
        },
        // 操作接口
        interfaceOperate: async () => {
          console.log("----->interfaceOperate", data);
          const { type, itemType, key } = data as InterfaceOperateData;
          const apiTreeList =
            getWorkspaceStateUtil().get("AutoApiGen.ApiTreeList")?.data ||
            [];
          const treeNode = findSubtreePath(apiTreeList, key);
          const configInfo =
            getWorkspaceStateUtil().get("AutoApiGen.setting")?.data
              ?.configInfo || {};
          const filePathList = getPathsAndApiDetails(
            treeNode,
            key,
            configInfo.appName
          );
          console.log("----->treeNode", treeNode);
          console.log("----->filePathList", filePathList);

          const handler = {
            generate: async () => {
              FeedbackHelper.showProgress(
                "正在生成文件...",
                async (progress) => {
                  let process = 0;
                  progress.report({
                    increment: 10,
                    message: `已完成 ${process}%`,
                  });
                  await generateFile(filePathList, itemType, progress);
                }
              );
            },
            copy: () => {
              vscode.commands.executeCommand('AutoAPIGen.copyToClipboard', getApiInfo(key).apiFunctionName);
            },
            copyImport: () => {
              const { importFunctionStr } = getApiInfo(key)
              vscode.commands.executeCommand('AutoAPIGen.copyToClipboard', importFunctionStr);
            },
            jumpApiFunction: () => {
              const { apiFunctionPath, apiFunctionName } = getApiInfo(key)
              revealSymbol(apiFunctionPath.fsPath, apiFunctionName)
            },
            useQuickly: () => {
              const { importFunctionPath, apiFunctionName } = getApiInfo(key)
              addImportSymbol(apiFunctionName, importFunctionPath)
            }
          };
          handler[type] && (await handler[type]());
        },
        joinEnd: () => {
          webview.postMessage({
            command: "joinEnd",
            data: true,
          });
        },
        // 显示接口详情
        showApiDetail: () => {
          console.log('------->showApiDetail', data)
          const { name: title, api } = data;
          vscode.commands.executeCommand(
            "AutoAPIGen.showApiDetailPanel",
            title,
            {
              ...api,
              key: data.key,
            }
          );
        }
      };

      handler[command] && (await handler[command]());
      handler.joinEnd();
    } catch (error) {
      console.error(`Error handling ${message.command}:`, error);
      webview.postMessage({
        command: "error",
        data: { message: "处理消息时出错" },
      });
    }
  });
};

/**
 * 发送消息给 webview
 *
 * @param webview vscode 的 Webview 对象
 */
const sendMessages = (webview: vscode.Webview, key: WebviewCollectionKey) => {
  console.log('------>sendMessages', key)
  // 监听当前激活的文本编辑器变化，并发送消息到 webview
  vscode.window.onDidChangeActiveTextEditor(async (editor) => {
    console.log('------>onDidChangeActiveTextEditor', key, editor)
    if (!editor) return;

    const currentFile = editor.document.fileName;

    await webview.postMessage({
      command: "setCurrentFileExample",
      text: currentFile,
    });
  });

};

/**
 * 处理Webview的消息
 *
 * @param webview vscode的Webview实例
 * @param context vscode的ExtensionContext实例
 * @param key webviewCollection的键
 */
export const handleMessages = (
  webview: vscode.Webview,
  context: vscode.ExtensionContext,
  key: WebviewCollectionKey,
) => {
  receiveMessages(webview, context, key);
  sendMessages(webview, key);
  webviewCollection[key] = webview;
};

interface WorkspaceStateResult {
  haveSetting: boolean;
  theme: vscode.ColorTheme;
  configInfo?: ProjectConfigInfo;
}

/**
 * 获取工作区状态
 *
 * @param webview webview 对象
 * @param context 扩展上下文
 * @param command 命令字符串
 * @param key webview 集合键
 * @param isInit 是否为初始化调用
 * @returns Promise<void>
 */
async function getWorkspaceState(
  webview: vscode.Webview,
  context: vscode.ExtensionContext,
  command: string,
  key: WebviewCollectionKey,
  isInit = false
): Promise<void> {
  const sendStateToWebview = (result: WorkspaceStateResult): void => {
    webview.postMessage({
      command,
      data: result
    });
  };

  try {
    const defaultSetting = getWorkspaceStateUtil().getWithDefault("AutoApiGen.setting", {
      updateTime: Date.now(),
      data: { language: "zh" }
    })?.data;

    let haveSetting = await checkFolderOrFileExists(SETTING_FILE_URL);
    let settingObj: ProjectConfigInfo = {};

    if (haveSetting) {
      const settingFileUrl = vscode.Uri.joinPath(
        workspaceFolders[0].uri,
        SETTING_FILE_URL
      );
      const settingFile = await getText(settingFileUrl);
      settingObj = settingFile ? JSON.parse(settingFile) : {};

      const isValidConfig = (
        settingObj.Authorization &&
        settingObj.appName &&
        Array.isArray(settingObj?.projectId) &&
        (settingObj?.projectId?.length ?? 0) > 0
      );

      if (isValidConfig) {
        const projectId = settingObj?.projectId?.[settingObj?.projectId?.length - 1] ?? "";
        const appName = settingObj.appName as AppCollections;
        if (!appName) {
          throw new Error("appName is required");
        }
        await initHttp(appName, {
          projectId,
          Authorization: settingObj.Authorization
        });

        const state = getWorkspaceStateUtil().getAll();

        if (key === "BaseViewProvider") {
          await handleBaseViewProviderState(settingObj, state, +projectId, isInit);
        }

        await handleProjectListState(settingObj, state, isInit);
      } else {
        haveSetting = false;
      }
    }

    const { apiDetailList, apiProjectList, apiTreeList, ...rest } = settingObj;
    const result: ConfigurationInformation = {
      ...defaultSetting,
      workspaceFolders,
      haveSetting,
      configInfo: settingObj,
      theme: vscode.window.activeColorTheme
    };

    getWorkspaceStateUtil().set("AutoApiGen.setting", {
      updateTime: Date.now(),
      data: {
        ...defaultSetting,
        workspaceFolders,
        haveSetting,
        theme: vscode.window.activeColorTheme,
        configInfo: rest
      }
    });

    sendStateToWebview(result);
  } catch (error) {
    console.error("getWorkspaceState:", error);
    sendStateToWebview({
      haveSetting: false,
      theme: vscode.window.activeColorTheme
    });
    vscode.window.showErrorMessage("获取工作区状态失败");
  }
}

async function handleBaseViewProviderState(
  settingObj: ProjectConfigInfo,
  state: WorkspaceState,
  projectId: number,
  isInit: boolean
): Promise<void> {
  const detailListHas = getWorkspaceStateUtil().hasActive("AutoApiGen.ApiDetailList");
  const treeListHas = getWorkspaceStateUtil().hasActive("AutoApiGen.ApiTreeList");
  const dataSchemasHas = getWorkspaceStateUtil().hasActive("AutoApiGen.ApiDataSchemas");

  if (!isInit && detailListHas && treeListHas && dataSchemasHas) {
    settingObj.apiDetailList = state["AutoApiGen.ApiDetailList"]?.data;
    settingObj.apiTreeList = state["AutoApiGen.ApiTreeList"]?.data;
  } else {
    const [apiTreeList, apiDetail, apiDataSchemas] = await Promise.all([
      getApiTreeList(projectId),
      getApiDetailList(),
      getDataSchemas(projectId)
    ]);

    getWorkspaceStateUtil().set("AutoApiGen.ApiTreeList", {
      updateTime: Date.now(),
      data: apiTreeList || []
    });
    settingObj.apiTreeList = apiTreeList;

    getWorkspaceStateUtil().set("AutoApiGen.ApiDetailList", {
      updateTime: Date.now(),
      data: apiDetail || []
    });
    settingObj.apiDetailList = apiDetail;

    getWorkspaceStateUtil().set("AutoApiGen.ApiDataSchemas", {
      updateTime: Date.now(),
      data: apiDataSchemas || []
    });
    // settingObj.apiDataSchemas = apiDataSchemas;
  }
}

async function handleProjectListState(
  settingObj: ProjectConfigInfo,
  state: WorkspaceState,
  isInit: boolean
): Promise<void> {
  if (!isInit && getWorkspaceStateUtil().hasActive("AutoApiGen.ApiProjectList")) {
    settingObj.apiProjectList = state["AutoApiGen.ApiProjectList"]?.data;
  } else {
    const projectList = await getProjectList();
    settingObj.apiProjectList = projectList;
    getWorkspaceStateUtil().set("AutoApiGen.ApiProjectList", {
      updateTime: Date.now(),
      data: projectList || []
    });
  }
}
