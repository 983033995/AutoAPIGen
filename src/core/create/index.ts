/*
 * @FilePath: /AutoAPIGen/src/core/create/index.ts
 * @Description: 
 */
import { getWorkspaceStateUtil } from '../workspace/stateManager'

export async function generateFile(filePathList: PathApiDetail[]) {
  const apiDetailList = getWorkspaceStateUtil().get('AutoApiGen.ApiDetailList')?.data || []
  const apiDataSchemas = getWorkspaceStateUtil().get('AutoApiGen.ApiDataSchemas')?.data || []
  const setting: ConfigurationInformation = getWorkspaceStateUtil().get('AutoApiGen.setting')?.data || {}

  const workspaceFoldersPath = setting.workspaceFolders[0].uri.path + setting.configInfo.path

  console.log('---->generateFile--', filePathList, apiDetailList, apiDataSchemas)

  console.log('------>workspaceFoldersPath', workspaceFoldersPath)
  for (let i = 0, len = filePathList.length; i < len; i++) {
    const { path, api } = filePathList[i];
  }
}
