import * as vscode from 'vscode'

export class PageViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'base-view-sidebar'

	private _view?: vscode.WebviewView
}