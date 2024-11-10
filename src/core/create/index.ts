/// <reference path="../../global.d.ts" />
import * as vscode from 'vscode';
import { getWorkspaceStateUtil } from '../workspace/stateManager';
import { FeedbackHelper } from '../helpers/feedbackHelper'
const fsExtra = require('fs-extra');
import * as utils from './utils'
import { cnToPinyin, firstToLocaleUpperCase } from '../helpers/helper'

/**
 * 创建一个文件，包含api方法和接口定义
 *
 * @param commonPath 公共路径
 * @param apiUri api文件Uri
 * @param InterfaceUri 接口文件Uri
 * @param type 树节点类型
 * @param apiDetailGather api详细信息的数组
 * @param axiosQuote axios引用
 * @returns Promise<void>
 */
export async function createFile(
  commonPath: string,
  apiUri: vscode.Uri,
  InterfaceUri: vscode.Uri,
  type: treeItemType,
  apiDetailGather: ApiDetailGather[],
  axiosQuote: string
): Promise<void> {
  try {
    // 检查文件是否存在
    const apiFileExists = await fsExtra.pathExists(apiUri.fsPath);
    const interfaceFileExists = await fsExtra.pathExists(InterfaceUri.fsPath);

    // 加载配置
    const setting: ConfigurationInformation = getWorkspaceStateUtil().get('AutoApiGen.setting')?.data || {};
    const petterSetting = utils.getPrettierSetting(setting);

    // 获取所有接口名称和函数字符串
    const apiFunctionStr = apiDetailGather.map((cur) => cur.apiFunctionContext).join('');
    const allInterfaceName = utils.getAllInterfaceNames(apiDetailGather, apiFunctionStr);
    const isNeedQs = apiFunctionStr.includes('${qs.stringify(');

    // 构建 API 文件头部和完整内容
    const apiFunctionHead = utils.buildApiFunctionHead(allInterfaceName, axiosQuote, isNeedQs);
    const allFunctionContext = apiFunctionHead + apiFunctionStr;

    // 构建接口类型内容
    const allInterfaceContext = apiDetailGather.map((cur) => cur.apiInterfaceContext).join('');

    // 格式化代码
    const formattedFunCode = await utils.formatCode(allFunctionContext, petterSetting, '函数代码');
    const formattedInterfaceCode = await utils.formatCode(allInterfaceContext, petterSetting, '接口定义代码');

    // 如果文件已存在，执行备份、写入和恢复逻辑
    if (apiFileExists) {
      if (type === 'apiDetailFolder') {
        await utils.backupAndReplace(apiUri, formattedFunCode);
        if (interfaceFileExists) {
          await utils.backupAndReplace(InterfaceUri, formattedInterfaceCode);
        }
      } else {
        apiDetailGather.forEach(async (item) => {
          await utils.updateExistingFiles(apiUri, item, petterSetting);
          await utils.updateExistingFiles(InterfaceUri, item, petterSetting, true);
        });
        // await utils.updateExistingFiles(apiUri, InterfaceUri, interfaceFileExists, apiDetailGather, petterSetting);
      }
    } else {
      // 文件不存在则直接写入
      await utils.createNewFiles(apiUri, InterfaceUri, formattedFunCode, formattedInterfaceCode);
    }
  } catch (error) {
    FeedbackHelper.logErrorToOutput(`创建文件失败 ${apiUri.path}: ${error || '未知错误'}`);
    throw new Error(`创建文件失败: ${error || '未知错误'}`);
  }
}

/**
 * 生成文件
 *
 * @param filePathList 文件路径列表
 * @param type 树项类型
 * @param progress 进度
 */
export async function generateFile(filePathList: PathApiDetail[], type: treeItemType, progress: vscode.Progress<{ message?: string, increment?: number }>) {
  const apiDetailList: ApiDetailListData[] = getWorkspaceStateUtil().get('AutoApiGen.ApiDetailList')?.data || []
  const setting: ConfigurationInformation = getWorkspaceStateUtil().get('AutoApiGen.setting')?.data || {}

  const createSuccessFiles = []

  const workspaceFoldersPath = setting.workspaceFolders[0].uri.path

  const apiModel: apiModelType = setting.configInfo.model || 'axios'
  const axiosQuote: string = setting.configInfo?.axiosPath || 'import axios from "axios"'
  console.log('---->generateFile--', filePathList, apiDetailList)

  console.log('------>workspaceFoldersPath', workspaceFoldersPath)
  // 1. 确定文件路径
  const { workspaceFolders } = vscode.workspace;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('没有打开的工作区');
    return;
  }
  for (let i = 0, len = filePathList.length; i < len; i++) {
    try {
      const { path, api, pathArr } = filePathList[i];
      let relativePath = path;
      if (setting.configInfo?.useProjectName) {
        const projectList = getWorkspaceStateUtil().get('AutoApiGen.UserProjects')?.data || []
        console.log('------>projectList', projectList)
        const projectIds = setting.configInfo.projectId || []
        const projectName = projectList.find((project: Record<string, any>) => project.id === projectIds[projectIds.length - 1])?.name || ''
        pathArr.splice(1, 0, utils.convertPathToPascalCase(cnToPinyin(projectName)).trim())
        relativePath = pathArr.join('/');
      }
      const commonPath = `${workspaceFoldersPath}${setting.configInfo.path}/${relativePath}`
      const apiFunctionPath = vscode.Uri.file(`${commonPath}/${setting.configInfo.appName}.ts`)
      const funInterfacePath = vscode.Uri.file(`${commonPath}/interface.ts`)
      const apiDetailGather = api.map(item => {
        const apiFunctionName = `${item.method}${utils.convertPathToPascalCase(item.path)}`
        const useApiFunctionName = `use${item.method.charAt(0).toUpperCase() + item.method.slice(1)}${utils.convertPathToPascalCase(item.path)}}`
        const apiDetailItem: Partial<ApiDetailListData> = apiDetailList.find(detail => detail.id === item.id) || {}
        const { fun: apiFunctionContext, interFace: apiInterfaceContext } = buildMethodTemplate(apiFunctionName, useApiFunctionName, apiModel, apiDetailItem, axiosQuote)
        return {
          ...item,
          apiFunctionName,
          useApiFunctionName,
          apiFunctionPath,
          apiFunctionContext,
          apiInterfaceContext,
          interfaceQueryName: (apiDetailItem?.parameters?.query || []).length ? `${apiFunctionName}Query` : '',
          interfaceResName: `${apiFunctionName}Res`,
          interfacePathQueryName: (apiDetailItem?.parameters?.path || []).length > 1 ? `${apiFunctionName}PathQuery` : '',
          interfaceBodyQueryName: (apiDetailItem?.requestBody?.parameters || []).length || apiDetailItem?.requestBody?.jsonSchema ? `${apiFunctionName}Body` : '',
        }
      })

      await createFile(commonPath, apiFunctionPath, funInterfacePath, type, apiDetailGather, axiosQuote)
      createSuccessFiles.push(apiFunctionPath.path)
      createSuccessFiles.push(funInterfacePath.path)
      const process = (i / filePathList.length) * 100
      progress.report({ increment: process, message: `已完成 ${Math.round(process)}%` });
    } catch (error) {
      FeedbackHelper.showError(`文件生成失败: ${error || 'Unknown error'}`)
      FeedbackHelper.logErrorToOutput(`文件生成失败: ${error || 'Unknown error'}`)
      continue
    }
  }

  createSuccessFiles.length && FeedbackHelper.showFileCreationResults(createSuccessFiles)
}

/**
 * 构建方法模板
 *
 * @param apiFunctionName API 函数名称
 * @param useApiFunctionName 使用的 API 函数名称
 * @param apiModel API 模型类型
 * @param apiDetailItem API 详细列表数据
 * @param axiosQuote axios 引用
 * @returns 包含函数和接口的对象
 */
function buildMethodTemplate(
  apiFunctionName: string,
  useApiFunctionName: string,
  apiModel: apiModelType,
  apiDetailItem: Partial<ApiDetailListData>,
  axiosQuote: string
): { fun: string, interFace: string } {
  // 提取参数信息
  const pathParams = apiDetailItem?.parameters?.path || [];
  const queryParams = apiDetailItem?.parameters?.query || [];
  const apiDetailParams: ApiDetailParametersQuery[] = [...pathParams, ...queryParams];
  const haveReqBody = Boolean((apiDetailItem?.requestBody?.parameters || []).length || apiDetailItem?.requestBody?.jsonSchema);
  const axiosAlias = utils.extractVariableName(axiosQuote) || '';
  const apiPath = utils.convertToTemplateString(apiDetailItem.path || '', pathParams);
  const apiMethod = apiDetailItem.method || 'get';
  const responses = apiDetailItem?.responses?.find(res => +res.code === 200) || {};

  // 构建接口
  const exportInterfaceQuery = utils.buildInterfaceQuery(apiFunctionName, apiDetailItem, queryParams);
  const exportInterfaceBody = utils.buildInterfaceBody(apiFunctionName, apiDetailItem, haveReqBody);
  const exportInterfacePathQuery = utils.buildInterfacePathQuery(apiFunctionName, apiDetailItem, pathParams);
  const exportInterfaceRes = utils.buildInterfaceResponse(apiFunctionName, apiDetailItem, responses);

  const exportInterface = `${exportInterfaceQuery}${exportInterfacePathQuery}${exportInterfaceBody}${exportInterfaceRes}`;

  // 构造函数描述和请求主体
  const description = utils.buildDescription(apiFunctionName, apiDetailItem);
  const apiFunctionSignature = utils.buildApiFunctionSignature(apiFunctionName, pathParams, queryParams, haveReqBody, apiMethod);
  const apiFunctionBody = utils.buildApiFunctionBody(apiMethod, axiosAlias, apiPath, apiDetailParams, haveReqBody, queryParams, apiDetailItem);

  // 定义请求方式处理器
  const handler = {
    axios: () => ({
      fun: `\n  \n${description}\n${apiFunctionSignature}\n  ${apiFunctionBody}\n}`,
    }),
    vueUse: () => ({ fun: '' }),
    VueHookPlus: () => ({ fun: '' }),
    wx: () => ({ fun: '' }),
    custom: () => {
      const options = {
        pathParams,
        pathParamsType: `${apiFunctionName}PathQuery`,
        queryParams,
        queryParamsType: `${apiFunctionName}Query`,
        apiMethod,
        apiReturnType: `${apiFunctionName}Res`,
        haveReqBody,
        dataParamsType: `${apiFunctionName}Body`,
        apiFunctionName,
        extraFunctionName: `use${firstToLocaleUpperCase(apiFunctionName)}`,
        apiPath,
        log: FeedbackHelper.logErrorToOutput
      }
      const defaultFunction = `${apiFunctionSignature}\n  ${apiFunctionBody}\n}`
      const customFunction = utils.customFunctionReturn(options, description, defaultFunction) || ''
      return {
        fun: customFunction,
      }
    },
  };

  return { ...handler[apiModel](), interFace: exportInterface };
}
