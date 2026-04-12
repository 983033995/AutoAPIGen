import fs from "fs";
import path from "path";
import type { ConfigFromModel } from "@zhangheteng/aag-core";

export const CONFIG_FILE = ".vscode/autoApiGen.json";

export function loadConfig(cwd: string = process.cwd()): ConfigFromModel {
  const configPath = path.join(cwd, CONFIG_FILE);
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `找不到配置文件：${configPath}\n请先通过 AutoAPIGen VSCode 插件完成项目配置`,
    );
  }
  const raw = fs.readFileSync(configPath, "utf-8");
  const config: ConfigFromModel = JSON.parse(raw);

  if (!config.appName) throw new Error("配置文件缺少 appName 字段");
  if (!config.projectId || !config.projectId.length)
    throw new Error("配置文件缺少 projectId 字段");

  return config;
}
