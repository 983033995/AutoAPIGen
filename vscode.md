<!--
 * @FilePath: /AutoAPIGen/vscode.md
 * @Description: 
-->
# vscode插件相关

- webviewView参数（WebviewView）

| 参数 | 说明 | 类型 | 是否必填 |
| --- | --- | --- | --- |
| `viewType` | 标识 webview 视图的类型，如 `'hexEditor.dataView'`。 | `string` | 是 |
| `webview` | 视图底层对应的 webview | `Webview` | 是 |
| `title` | 在 UI 中显示的视图标题。视图标题最初取自扩展的 `package.json` 贡献。 | `string` | 否 |
| `description` | 在标题中以不太显眼的方式呈现的人类可读字符串。 | `string` | 否 |
| `badge` | 要在此 webview 视图中显示的徽章。若要删除徽章，请设置为 undefined。 | `ViewBadge`或`undefined` | 否 |
| `onDidDispose` | 当视图被处理时触发的事件。当用户明确隐藏视图时，会处理视图（当用户右键点击视图并取消选中 webview 视图时会发生这种情况）。尝试在处理后使用该视图将抛出异常。 | `Event<void>` | 否 |
| `visible` | 跟踪 webview 当前是否可见。当视图在屏幕上并展开时，视图是可见的。 | `boolean` | 是 |
| `onDidChangeVisibility` | 视图的可见性发生变化时触发的事件。触发可见性变化的操作： - 视图被折叠或展开。- 用户在侧边栏或面板中切换到不同的视图组。请注意，使用上下文菜单隐藏视图会处理该视图并触发 `onDidDispose`。 | `Event<void>` | 是 |

- WebviewView.webview的参数（Webview）

| 参数 | 说明 | 类型 | 是否必填 |
| --- | --- | --- | --- |
| `options` | 创建 webview 时使用的选项。 | `WebviewOptions` | 是 |
| `html` | [Webview的HTML内容。](#参数说明) | `string` | 是 |
| `onDidReceiveMessage` | 当webview内容发送消息时触发。Webview内容可以向后扩展发送字符串或可序列化为json的对象。它们不能发送`Blob`、`File`、`ImageData`和其他特定于DOM的对象，因为接收消息的扩展不是在浏览器环境中运行的。 | `Event<any>` | 是 |
| `postMessage` | 向webview内容发送消息。只能从扩展的后台进程使用此方法。[onDidReceiveMessage参数说明](#参数说明1) | `(message: any) => Thenable<boolean>` | 是 |
| `asWebviewUri` | 将本地文件系统的uri转换为可以在webviews中使用的uri。Webview不能直接使用`file:` uri从工作区或本地文件系统加载资源。`asWebviewUri`函数采用本地的`file:` uri，并将其转换为可以在webview中加载同一资源的uri：webview.html = `<img src="${webview.asWebviewUri(vscode.Uri.file('/Users/codey/workspace/cat.gif'))}">` | `(uri: Uri) => WebviewUri` | 是 |
| `cspSource` | 用于webview的CSP源。此值将作为`default-src`指令添加到webview的`Content-Security-Policy`中。 默认情况下，webview将加载任何内容。若要限制webview中的内容，请设置此值。 | `string` | 是 |

## 参数说明

### Webview的HTML内容

这应该是一个完整、有效的HTML文档。更改此属性会导致webview重新加载。

Webview与正常的扩展进程隔离，因此与webview的所有通信都必须使用消息传递。
若要从扩展向webview发送消息，请使用{@linkcode Webview.postMessage postMessage}。
若要从webview向扩展发送消息，请在webview内部使用`acquireVsCodeApi`函数获取编辑器API的句柄， 然后调用`.postMessage()`：

```html
<script>
     const vscode = acquireVsCodeApi(); // acquireVsCodeApi只能被调用一次
     vscode.postMessage({ message: 'hello!' });
 </script>
 ```

 若要在webview中加载工作区中的资源，请使用{@linkcode Webview.asWebviewUri asWebviewUri}方法，
 并确保资源的目录已列在{@linkcode WebviewOptions.localResourceRoots}中。

 请记住，尽管webview被隔离，但它们仍然允许运行脚本和加载任意内容，
 因此，在处理webview时，扩展必须遵循所有标准的网络安全最佳实践。
 这包括适当地清理所有不受信任的输入（包括来自工作区的内容）并设置[内容安全策略](https://aka.ms/vscode-api-webview-csp)。

## 参数说明1

### onDidReceiveMessage参数说明

向webview内容发送消息。

只有当webview处于活动状态（可见或在后台使用`retainContextWhenHidden`）时，才会传递消息。

@param message 消息正文。这必须是一个字符串或其他可序列化为json的对象。对于旧版本的vscode，如果`message`中包含`ArrayBuffer`，它将无法正确序列化，并且不会被webview接收。 类似地，任何TypedArray（如`Uint8Array`）都将被低效地序列化，并且不会在webview内部重新创建为类型化数组。但是，如果您的扩展在`package.json`的`engines`字段中针对vscode 1.57+， 则`message`中出现的任何`ArrayBuffer`值都将更有效地传输到webview，
并将在webview内部正确重新创建。

@returns 当消息被发布到webview或因消息无法传递而被删除时，返回一个promise。如果消息被发布到webview，则返回`true`。消息只能发布到活动的webview（即可见的webview或设置了`retainContextWhenHidden`的隐藏webview）。

返回`true`并不意味着消息实际上已被webview接收。例如，webview内部可能没有连接任何消息监听器，或者webview在消息发布后但在接收前被销毁。如果您想确认消息确实已被接收，可以尝试让您的webview发送一个确认消息回您的扩展。
