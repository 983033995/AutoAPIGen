<!--
 * @FilePath: /AutoAPIGen/src/view/App.vue
 * @Description: 
-->

<script setup lang="ts">
document.body.setAttribute("arco-theme", "dark");
const { t } = useI18n();

const loading = ref<boolean>(true);

// 配置信息
const configInfo = ref<ConfigurationInformation>();

const apiWorkSpace = ref<string[]>([]);

// 获取配置信息校验结果
const checkConfigRes = computed(() => {
  if (!configInfo.value?.haveSetting) {
    return {
      success: false,
      type: 0,
      message: t("tip"),
    };
  }
  const { appName, Authorization, Cookie } = configInfo.value.configInfo || {};

  if (!appName || (!Authorization && !Cookie)) {
    return {
      success: false,
      type: 1,
      message: t("tip1"),
    };
  }

  return {
    success: true,
    type: -1,
    message: "",
  };
});

/**
 * 根据ID数组获取树形数据中对应节点的名称列表
 *
 * @param treeData 树形数据结构数组
 * @param ids 节点ID数组
 * @returns 返回一个包含对应节点名称的字符串数组
 */
const getNamesByIds = (treeData: TreeNode[], ids: number[]): string[] => {
  let names: string[] = [];
  const idToName = new Map<number, string>();

  // 首先，填充id到name的映射
  function buildIdToNameMap(nodes: TreeNode[], _parentId: number): void {
    nodes.forEach((node) => {
      idToName.set(node.id, node.name);
      if (node.children) {
        buildIdToNameMap(node.children, node.id);
      }
    });
  }

  if (ids.length === 1) {
    // 如果只有一个id，直接从映射中获取name
    const name = idToName.get(ids[0]);
    if (name) {
      names.push(name);
    }
    return names;
  }

  // 从树的第一层开始构建映射
  buildIdToNameMap(treeData, -1); // -1 作为根节点的父id

  // 遍历ids，收集每个id对应的name
  for (let i = 0; i < ids.length; i++) {
    const name = idToName.get(ids[i]);
    if (name) {
      names.push(name);
    } else {
      console.warn(`ID ${ids[i]} not found.`);
    }
  }

  return names;
};

console.log("------>sendTime", new Date().toLocaleTimeString());
vscode.postMessage({
  command: "getWorkspaceState",
  data: {
    init: false,
  },
});

// 监听配置变化
watch(
  () => configInfo.value?.theme,
  (value) => {
    if (value && value.kind === 2) {
      document.body.setAttribute("arco-theme", "dark");
    } else {
      document.body.removeAttribute("arco-theme");
    }
  },
);

/**
 * 打开配置页
 *
 * @returns 无返回值，通过向VS Code发送消息实现功能
 */
const handlerDeployment = () => {
  // vscode.postMessage({ command: 'getWorkspaceState' })
  const setting = toRaw(configInfo.value?.configInfo) || {};
  vscode.postMessage({
    command: "openConfigPage",
    data: { title: t("configPageTitle"), configInfo: setting },
  });
};

const handlerEnableAISupport = () => {
  vscode.postMessage({ command: "enableAISupport", data: {} });
};

const handlerOpenDoc = () => {
  vscode.postMessage({
    command: "openUrl",
    data: { url: "https://doc.du-ai.cn/" },
  });
};

const apiSearchData = ref("");

const clearApiDetailChildren = (
  nodes: ApiTreeListResData[],
): ApiTreeListResData[] => {
  return nodes.map((node) => {
    // 深拷贝 children 以避免直接修改原始数组
    const children = clearApiDetailChildren(node.children);

    if (node.type === "apiDetail") {
      // 如果 type 是 'apiDetail'，则将 children 设置为空数组
      return {
        ...node,
        children: [],
      };
    } else {
      // 否则，保留原有的 children
      return {
        ...node,
        children,
      };
    }
  });
};

const apiTreeList = computed(() => {
  const treeList = configInfo.value?.configInfo?.apiTreeList || [];
  return clearApiDetailChildren(treeList);
});

const expandedKeys = ref<(string | number)[]>([]);

const searchApiTreeList = (keyword: string) => {
  const loop = (data: ApiTreeListResData[]) => {
    const result: ApiTreeListResData[] = [];
    data.forEach((item: ApiTreeListResData) => {
      if (
        item.name.toLowerCase().indexOf(keyword.toLowerCase()) > -1 ||
        (item?.api &&
          item.api.path.toLowerCase().indexOf(keyword.toLowerCase()) > -1)
      ) {
        result.push({ ...item });
        expandedKeys.value.push(item.key);
      } else if (item.children && item.type === "apiDetailFolder") {
        const filterData = loop(item.children);
        if (filterData.length) {
          result.push({
            ...item,
            children: filterData,
          });
          expandedKeys.value.push(item.key);
        }
      }
    });
    return result;
  };

  return loop(apiTreeList.value);
};

const apiTreeData = computed<ApiTreeListResData[]>(() => {
  if (!apiSearchData.value) return apiTreeList.value;
  return searchApiTreeList(apiSearchData.value);
});

const fieldNames = {
  key: "key",
  title: "name",
};

const changeSearchData = (val: string) => {
  if (!val) {
    expandedKeys.value = [];
    console.log("clear", expandedKeys.value);
  }
};

const apiType: ApiTypeMap = {
  get: {
    class: "icon-[tabler--http-get]",
    color: "green",
  },
  post: {
    class: "icon-[tabler--http-post]",
    color: "orange",
  },
  put: {
    class: "icon-[tabler--http-put]",
    color: "blue",
  },
  delete: {
    class: "icon-[tabler--http-delete]",
    color: "red",
  },
  patch: {
    class: "icon-[tabler--http-patch]",
    color: "purple",
  },
  head: {
    class: "icon-[tabler--http-head]",
    color: "cyan",
  },
  options: {
    class: "icon-[tabler--http-options]",
    color: "geekblue",
  },
  trace: {
    class: "icon-[tabler--http-trace]",
    color: "magenta",
  },
};

const onExpand = (expandedKeysValue: (string | number)[]) => {
  expandedKeys.value = expandedKeysValue;
};

const treeItemRef = ref<Record<string, HTMLElement>>({});
const countAllChildren = (treeNode: ApiTreeListResData) => {
  // 初始化计数器为0
  let count = 0;

  // 检查当前节点是否是apiDetail类型
  if (treeNode.type === "apiDetail") {
    count += 1; // 如果是，则增加计数
  }

  // 遍历当前节点的所有子节点
  if (treeNode.children && treeNode.children.length > 0) {
    for (const child of treeNode.children) {
      // 递归调用countApiDetails计算子节点下的apiDetail类型个数，并累加
      count += countAllChildren(child);
    }
  }

  // 返回当前节点及其子节点中apiDetail类型的总数
  return count;
};

const treeListLoading = ref(false);
const treeListTip = ref("数据更新中...");
const updateTree = () => {
  treeListLoading.value = true;
  treeListTip.value = "数据更新中...";
  vscode.postMessage({
    command: "getWorkspaceState",
    data: {
      init: true,
    },
  });
};
const handlerTreeClick = (data: ApiTreeListResData) => {
  console.log("------>handlerTreeClick", data);
  if (data.type === "apiDetail") {
    const treeItemData = {
      key: data.key,
      name: data.name,
      api: toRaw(data.api || {}),
    };
    console.log("------>treeItemData", treeItemData);
    vscode.postMessage({
      command: "showApiDetail",
      data: treeItemData,
    });
  }
};
const handleSelectOperate = (type: string, data: ApiTreeListResData) => {
  console.log("------>handleSelectOperate", type, data);
  treeListLoading.value = true;
  treeListTip.value = "请稍候...";
  vscode.postMessage({
    command: "interfaceOperate",
    data: {
      type,
      itemType: data.type,
      key: data.key,
    },
  });
};
const projectId = ref<number[]>([]);
window.addEventListener("message", (event) => {
  const message = event.data;

  console.log("----- getWorkspaceState ------", message);
  switch (message.command) {
    case "getWorkspaceState":
      console.log("------>getTime", new Date().toLocaleTimeString());
      configInfo.value = message.data;
      apiWorkSpace.value = getNamesByIds(
        configInfo.value?.configInfo.apiProjectList || [],
        configInfo.value?.configInfo.projectId || [],
      );
      projectId.value = configInfo.value?.configInfo.projectId || [];
      loading.value = false;
      treeListLoading.value = false;
      console.log(
        "----- configInfo ------",
        configInfo.value,
        checkConfigRes.value,
      );
      break;
    case "loadData":
      loading.value = true;
      break;
    case "joinEnd":
      treeListLoading.value = false;
      break;
    // case 'setCurrentFileExample':
    //   lastFile.value = currentFile.value
    //   currentFile.value = message.text
    //   return
  }
});
const showProjectCascade = ref(false);
const changeProjectId = (value: number[]) => {
  showProjectCascade.value = false;
  console.log("------>changeProjectId", value);
  treeListLoading.value = true;
  const configData = {
    ...(JSON.parse(JSON.stringify(toRaw(configInfo.value?.configInfo))) || {}),
    projectId: toRaw(value),
  };
  const { ...rest } = configData;
  console.log("------>configData", configData);
  vscode.postMessage({
    command: "saveConfig",
    data: rest,
  });
};
</script>

<template>
  <a-spin
    class="mx-0 w-full h-full bg-[rgba(0,0,0,0)]"
    dot
    tip="配置加载中..."
    :loading="loading"
  >
    <div
      v-if="!loading"
      class="flex items-center flex-col mx-0 w-full h-full"
      style="padding-bottom: 34px"
    >
      <div class="flex w-full items-center">
        <div class="flex-1 mx-[8px] relative">
          <a-trigger
            v-model="showProjectCascade"
            trigger="click"
            :unmount-on-close="false"
            position="tl"
          >
            <a-breadcrumb :style="{ fontSize: `12px` }">
              <a-breadcrumb-item class="cursor-pointer">
                <div class="text-[16px]">
                  <span class="icon-[logos--fastapi-icon]" />
                </div>
              </a-breadcrumb-item>
              <a-breadcrumb-item
                v-for="(item, index) in apiWorkSpace.length
                  ? apiWorkSpace
                  : ['AutoApiGen']"
                :key="index"
                class="cursor-pointer"
              >
                {{ item }}
              </a-breadcrumb-item>
              <template #item-render />
            </a-breadcrumb>
            <template #content>
              <a-cascader-panel
                v-model="projectId"
                :options="configInfo?.configInfo.apiProjectList || []"
                path-mode
                :field-names="{ label: 'name', value: 'id' }"
                :expand-child="true"
                @change="(value: number[]) => changeProjectId(value)"
              />
            </template>
          </a-trigger>
        </div>
        <a-tooltip :content="t('tip7')" mini position="lt">
          <a-button
            type="text"
            class="w-[32px]"
            style="margin: 0; padding: 0"
            @click="handlerDeployment"
          >
            <span class="icon-[hugeicons--system-update-01] text-[18px]" />
          </a-button>
        </a-tooltip>
      </div>

      <a-divider dashed margin="10px" />

      <a-spin
        dot
        :tip="treeListTip"
        :loading="treeListLoading"
        class="w-full flex-1 overflow-hidden"
      >
        <div
          v-if="checkConfigRes.success"
          class="w-full h-full overflow-hidden flex-col flex"
        >
          <div class="w-full flex justify-between">
            <div class="flex-1">
              <a-input-search
                v-model="apiSearchData"
                class="flex-1"
                allow-clear
                :placeholder="t('apiSearchDataPlaceholder')"
                @input="changeSearchData"
              />
            </div>
            <div class="ml-2 w-32px">
              <a-tooltip :content="t('tip6')" mini position="lt">
                <a-button type="primary" @click="updateTree">
                  <span class="icon-[tabler--refresh]" />
                </a-button>
              </a-tooltip>
            </div>
          </div>

          <div class="w-full flex-1 overflow-y-auto">
            <a-tree
              :data="apiTreeData"
              class="w-full"
              :field-names="fieldNames"
              block-node
              :default-expand-all="false"
              :expanded-keys="expandedKeys"
              @expand="onExpand"
            >
              <template #title="nodeData">
                <div
                  :ref="
                    (el: HTMLElement | null) =>
                      el && (treeItemRef[nodeData.key.replace('.', '_')] = el)
                  "
                  class="w-full flex group items-center"
                  :style="{
                    cursor:
                      nodeData.type === 'apiDetailFolder'
                        ? 'default'
                        : 'pointer',
                  }"
                  @click="handlerTreeClick(nodeData)"
                >
                  <span v-if="nodeData.type === 'apiDetailFolder'">
                    <span class="icon-[noto--file-folder]" />
                  </span>
                  <span v-else-if="nodeData.type === 'doc'">
                    <span class="icon-[hugeicons--google-doc]" />
                  </span>
                  <span
                    v-else
                    :class="[
                      apiType[nodeData.api.method as keyof ApiTypeMap].class,
                      'text-lg font-bold',
                    ]"
                    :style="{
                      color:
                        apiType[nodeData.api.method as keyof ApiTypeMap].color,
                    }"
                  />
                  <div class="ml-2 flex-1 mr-2">
                    {{ nodeData?.name }}
                    <span
                      v-if="nodeData.type === 'apiDetailFolder'"
                      class="opacity-60 text-3 ml-[6px]"
                      >({{ countAllChildren(nodeData) }})</span
                    >
                  </div>
                  <div
                    v-if="nodeData.type !== 'doc'"
                    class="cursor-pointer w-8 h-5"
                  >
                    <a-dropdown
                      trigger="hover"
                      :popup-container="
                        treeItemRef[nodeData.key.replace('.', '_')]
                      "
                      @select="
                        (val: string, e: Event) => {
                          e.stopPropagation();
                          handleSelectOperate(val, nodeData);
                        }
                      "
                    >
                      <div class="w-full h-full bg-[rgba(0,0,0,0)]" @click.stop>
                        <span
                          class="icon-[mdi--more-vert] hidden group-hover:block"
                        />
                      </div>
                      <template #content>
                        <a-doption value="generate">
                          {{ t("operate1") }}
                        </a-doption>
                        <div v-if="nodeData.type !== 'apiDetailFolder'">
                          <a-doption value="useQuickly">
                            {{ t("operate5") }}
                          </a-doption>
                          <a-doption value="copy">
                            {{ t("operate2") }}
                          </a-doption>
                          <a-doption value="copyImport">
                            {{ t("operate3") }}
                          </a-doption>
                          <a-doption value="jumpApiFunction">
                            {{ t("operate4") }}
                          </a-doption>
                        </div>
                      </template>
                    </a-dropdown>
                  </div>
                </div>
              </template>
            </a-tree>
          </div>
        </div>

        <div
          v-else
          class="h-full flex flex-col items-center justify-center w-full overflow-y-auto"
        >
          <a-result status="404" class="mt-[-5rem]">
            <template #title>
              <h3 class="empty-tip">
                {{ checkConfigRes.message }}
              </h3>
            </template>
            <template #extra>
              <a-space>
                <a-button
                  type="primary"
                  size="small"
                  class="rounded-lg"
                  @click="handlerDeployment"
                >
                  {{ t("tip2") }}
                </a-button>
                <a-button
                  type="outline"
                  size="small"
                  class="rounded-lg"
                  @click="handlerEnableAISupport"
                >
                  {{ t("tip3") }}
                </a-button>
              </a-space>
            </template>
          </a-result>
        </div>
      </a-spin>
    </div>
    <div
      v-if="!loading"
      class="flex items-center justify-between px-[10px]"
      style="
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 34px;
        border-top: 1px solid var(--color-border-2);
        background: var(--color-bg-1);
      "
    >
      <a-button
        type="text"
        size="mini"
        style="padding: 0 4px; font-size: 11px; color: var(--color-text-3)"
        @click="handlerEnableAISupport"
      >
        <span class="icon-[hugeicons--ai-brain-02] mr-[3px]" />{{ t("tip3") }}
      </a-button>
      <a-button
        type="text"
        size="mini"
        style="padding: 0 4px; font-size: 11px; color: var(--color-text-3)"
        @click="handlerOpenDoc"
      >
        <span class="icon-[hugeicons--book-open-01] mr-[3px]" />{{ t("tip8") }}
      </a-button>
    </div>
  </a-spin>
</template>
