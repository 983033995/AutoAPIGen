<!--
 * @FilePath: /Vue3BaseExtension/vsc-extension-quickstart.md
 * @Description:
-->

# 欢迎来到你的 VS Code 扩展

## 文件夹内容

- 这个文件夹包含你扩展所需的所有文件。

- `package.json` - 这是你声明扩展和命令的清单文件。

  - 这个示例插件注册了一个命令并定义了其标题和命令名。有了这些信息，VS Code 就可以在命令面板中显示这个命令。它还不需要加载插件。

- `src/extension.ts` - 这是你将提供命令实现的主要文件。
  - 这个文件导出一个函数`activate`，它在你的扩展第一次被激活时被调用（在这种情况下，通过执行命令）。在`activate`函数内部，我们调用`registerCommand`。
  - 我们将包含命令实现的函数作为第二个参数传递给`registerCommand`。

## 立即启动和运行

- 按`F5`打开一个新窗口，其中加载了你的扩展。

- 通过按（`Ctrl+Shift+P` 或 Mac 上的 `Cmd+Shift+P`）并输入`Hello World`来从命令面板运行你的命令。

- 在`src/extension.ts`中的代码中设置断点以调试你的扩展。

- 在调试控制台中找到你扩展的输出。

## 做出更改

- 在更改`src/extension.ts`中的代码后，你可以从调试工具栏重新启动扩展。

- 你还可以（`Ctrl+R` 或 Mac 上的 `Cmd+R`）重新加载带有你扩展的 VS Code 窗口以加载你的更改。

## 探索 API

- 当你打开文件`node_modules/@types/vscode/index.d.ts`时，你可以查看我们完整的 API 集。

## 运行测试

- 打开调试视图（`Ctrl+Shift+D` 或 Mac 上的 `Cmd+Shift+D`），并从启动配置下拉菜单中选择`Extension Tests`。

- 按`F5`在一个新窗口中加载你的扩展并运行测试。

- 在调试控制台中查看测试结果输出。

- 对`src/test/suite/extension.test.ts`进行更改或`test/suite`文件夹中创建新的测试文件。
  - 提供的测试运行器只会考虑与名称模式`**.test.ts`匹配的文件。
  - 你可以在`test`文件夹中创建文件夹，以你想要的任何方式组织你的测试。

## 更进一步

- 遵循[UX 指南](https://code.visualstudio.com/api/ux-guidelines/overview)以创建与 VS Code 原生界面和模式无缝集成的扩展。

- 通过[捆绑你的扩展](https://code.visualstudio.com/api/working-with-extensions/bundling-extension)来减小扩展大小并提高启动时间。

- 在 VS Code 扩展市场[发布你的扩展](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)。

- 通过设置[持续集成](https://code.visualstudio.com/api/working-with-extensions/continuous-integration)来自动化构建。
