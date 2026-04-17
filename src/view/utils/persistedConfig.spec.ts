import {
  buildPersistedConfig,
  buildPersistedConfigCleanup,
} from "@/shared/persistedConfig";

describe("buildPersistedConfig", () => {
  it("只保留允许持久化的配置字段", () => {
    const config = {
      appName: "apifox",
      Authorization: "token",
      Cookie: "cookie",
      path: "/src/api",
      projectId: [1, 2, 3],
      model: "axios",
      prettierSetting: "{}",
      head: "head",
      customReturn: "return",
      customExtraFunction: "extra",
      axiosPath: "axios",
      axiosReturnKey: "data",
      useProjectName: true,
      alias: "@:src",
      useProjectId: true,
      useTypeExtension: true,
      apiProjectList: [{ id: 1 }],
      apiTreeList: [{ key: "folder.1" }],
      apiDetailList: [{ id: 99 }],
      workspaceFolders: [{ name: "workspace" }],
      haveSetting: true,
    };

    expect(buildPersistedConfig(config)).toEqual({
      appName: "apifox",
      Authorization: "token",
      Cookie: "cookie",
      path: "/src/api",
      projectId: [1, 2, 3],
      model: "axios",
      prettierSetting: "{}",
      head: "head",
      customReturn: "return",
      customExtraFunction: "extra",
      axiosPath: "axios",
      axiosReturnKey: "data",
      useProjectName: true,
      alias: "@:src",
      useProjectId: true,
      useTypeExtension: true,
    });
  });

  it("清理运行态字段，避免历史脏数据残留在本地 json 中", () => {
    const config = {
      appName: "apifox",
      projectId: [7],
      apiProjectList: [{ id: 1 }],
      apiTreeList: [{ key: "folder.1" }],
      apiDetailList: [{ id: 99 }],
      apiDataSchemas: [{ id: "schema-1" }],
      workspaceFolders: [{ name: "workspace" }],
      haveSetting: true,
      theme: { kind: 2 },
      language: "zh",
    };

    expect(buildPersistedConfigCleanup(config)).toEqual({
      appName: "apifox",
      projectId: [7],
      apiProjectList: undefined,
      apiTreeList: undefined,
      apiDetailList: undefined,
      apiDataSchemas: undefined,
      workspaceFolders: undefined,
      haveSetting: undefined,
      theme: undefined,
      language: undefined,
    });
  });
});
