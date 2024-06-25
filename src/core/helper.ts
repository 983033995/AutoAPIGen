/*
 * @FilePath: /AutoAPIGen/src/core/helper.ts
 * @Description: 
 */
import * as vscode from 'vscode'

// 在 VSCode 插件中判断工作区下是否存在某个文件
export const checkFileExists = (fileName: string) => {
	const workspaceFolders = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]
	if (workspaceFolders) {
		const uri = vscode.Uri.file(workspaceFolders.uri.fsPath + '/' + fileName)
		return vscode.workspace.fs.stat(uri).then(
			() => true,
			() => false
		)
	} else {
		return false
	}
}

// 在 VSCode 插件中使用 context.workspaceState 操作持久化数据的增删改查
