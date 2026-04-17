const persistedConfigKeys = [
  "appName",
  "Authorization",
  "Cookie",
  "path",
  "projectId",
  "model",
  "prettierSetting",
  "head",
  "customReturn",
  "customExtraFunction",
  "axiosPath",
  "axiosReturnKey",
  "useProjectName",
  "alias",
  "useProjectId",
  "useTypeExtension",
] as const;

const transientConfigKeys = [
  "apiDetailList",
  "apiTreeList",
  "apiProjectList",
  "apiDataSchemas",
  "workspaceFolders",
  "haveSetting",
  "theme",
  "language",
] as const;

type PersistedConfigKey = (typeof persistedConfigKeys)[number];
type TransientConfigKey = (typeof transientConfigKeys)[number];

export function buildPersistedConfig(
  config: Partial<ProjectConfigInfo>,
): Partial<ConfigFromModel> {
  const persistedConfig = {} as Partial<Record<PersistedConfigKey, unknown>>;

  for (const key of persistedConfigKeys) {
    if (key in config) {
      persistedConfig[key] = config[key];
    }
  }

  return persistedConfig as Partial<ConfigFromModel>;
}

export function buildPersistedConfigCleanup(
  config: Partial<ProjectConfigInfo>,
): Partial<ProjectConfigInfo> {
  const sanitizedConfig = {
    ...buildPersistedConfig(config),
  } as Partial<ProjectConfigInfo> &
    Partial<Record<TransientConfigKey, undefined>>;

  for (const key of transientConfigKeys) {
    sanitizedConfig[key] = undefined;
  }

  return sanitizedConfig;
}
