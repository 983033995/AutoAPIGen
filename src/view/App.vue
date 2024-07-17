<!--
 * @FilePath: /AutoAPIGen/src/view/App.vue
 * @Description: 
-->

<script setup lang="ts">
const { t, locale } = useI18n()

const loading = ref<boolean>(true)

// 配置信息
const configInfo = ref<ConfigurationInformation>()

const apiWorkSpace = ref<string[]>([])

// 获取配置信息校验结果
const checkConfigRes = computed(() => {
  if (!configInfo.value?.haveSetting) {
    return {
      success: false,
      type: 0,
      message: t('tip')
    }
  }
  const { appName, Authorization } = configInfo.value.configInfo || {}

  if (!appName || !Authorization) {
    return {
      success: false,
      type: 1,
      message: t('tip1')
    }
  }

  return {
    success: true,
    type: -1,
    message: ''
  }
})

const getNamesByIds = (treeData: TreeNode[], ids: number[]): string[] => {
  let names: string[] = [];
  const idToName = new Map<number, string>();

  // 首先，填充id到name的映射
  function buildIdToNameMap(nodes: TreeNode[], parentId: number): void {
    nodes.forEach(node => {
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
}

window.addEventListener('message', (event) => {
  const message = event.data

  console.log('----- getWorkspaceState ------', message)
  switch (message.command) {
    case 'getWorkspaceState':
      configInfo.value = message.data
      apiWorkSpace.value = getNamesByIds(configInfo.value?.configInfo.apiProjectList || [], configInfo.value?.configInfo.projectId || [])
      loading.value = false
      console.log('----- configInfo ------', configInfo.value, checkConfigRes.value)
      break
    case 'loadData':
      loading.value = true
      break
    // case 'setCurrentFileExample':
    //   lastFile.value = currentFile.value
    //   currentFile.value = message.text
    //   return
  }
})

vscode.postMessage({ command: 'getWorkspaceState' })

// 监听配置变化
watch(() => configInfo.value?.theme, (value) => {
  if (value && value.kind === 2) {
    document.body.setAttribute('arco-theme', 'dark')
  }
})

/**
 * 打开配置页
 *
 * @returns 无返回值，通过向VS Code发送消息实现功能
 */
const handlerDeployment = () => {
  vscode.postMessage({ command: 'getWorkspaceState' })
  const setting = toRaw(configInfo.value?.configInfo) || {}
  vscode.postMessage({ command: 'openConfigPage', data: { title: t('configPageTitle'), configInfo: setting } })
}

const apiSearchData = ref('')

const apiTreeList = computed(() => {
  return configInfo.value?.configInfo?.apiTreeList || []
})

const expandedKeys = ref<string[]>([])

const searchApiTreeList = (keyword: string) => {
  const loop = (data: ApiTreeListResData[]) => {
    const result: ApiTreeListResData[] = [];
    data.forEach((item: ApiTreeListResData) => {
      if (item.name.toLowerCase().indexOf(keyword.toLowerCase()) > -1 || (item?.api && item.api.path.toLowerCase().indexOf(keyword.toLowerCase()) > -1)) {
        result.push({ ...item });
        expandedKeys.value.push(item.key);
      } else if (item.children) {
        const filterData = loop(item.children);
        if (filterData.length) {
          result.push({
            ...item,
            children: filterData
          })
          expandedKeys.value.push(item.key);
        }
      }
    })
    return result;
  }

  return loop(apiTreeList.value);
}

const apiTreeData = computed<ApiTreeListResData[]>(() => {
  if (!apiSearchData.value) return apiTreeList.value
  return searchApiTreeList(apiSearchData.value)
})

const fieldNames = {
  key: 'key',
  title: 'name',
}

const changeSearchData = (val: string) => {
  if (!val) {
    expandedKeys.value = []
    console.log('clear', expandedKeys.value)
  }
}

const apiType: ApiTypeMap = {
  get: {
    class: 'icon-[tabler--http-get]',
    color: 'green'
  },
  post: {
    class: 'icon-[tabler--http-post]',
    color: 'orange'
  },
  put: {
    class: 'icon-[tabler--http-put]',
    color: 'blue'
  },
  delete: {
    class: 'icon-[tabler--http-delete]',
    color: 'red'
  },
  patch: {
    class: 'icon-[tabler--http-patch]',
    color: 'purple'
  },
  head: {
    class: 'icon-[tabler--http-head]',
    color: 'cyan'
  },
  options: {
    class: 'icon-[tabler--http-options]',
    color: 'geekblue'
  },
  trace: {
    class: 'icon-[tabler--http-trace]',
    color: 'magenta'
  },
}

const onExpand = (expandedKeysValue: string[]) => {
  expandedKeys.value = expandedKeysValue
}

const treeItemRef = ref<Record<string, Element>>({})
const countAllChildren = (treeNode: ApiTreeListResData) => {
  // 初始化计数器为0
  let count = 0;

  // 检查当前节点是否是apiDetail类型
  if (treeNode.type === 'apiDetail') {
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
}
</script>

<template>
  <div class="flex items-center flex-col mx-0 w-full h-full" v-loading="loading">
    <div class="flex w-full items-center">
      <div class="text-[16px]"><span class="icon-[logos--fastapi-icon]"></span></div>
      <div class="flex-1 overflow-hidden mx-[8px]">
        <a-breadcrumb :style="{ fontSize: `12px` }">
          <a-breadcrumb-item v-for="(item, index) in apiWorkSpace" :key="index">{{ item }}</a-breadcrumb-item>
          <template #item-render></template>
        </a-breadcrumb>
      </div>
      <a-button type="text" class="w-[32px]" style="margin: 0; padding: 0;" @click="handlerDeployment" title="更新配置">
        <span class="icon-[hugeicons--system-update-01] text-[18px]"></span>
      </a-button>
    </div>

    <a-divider dashed margin="10px" />

    <div v-if="checkConfigRes.success" class="w-full flex-1 overflow-hidden flex-col flex">
      <div class="w-full flex justify-between">
        <div class="flex-1">
          <a-input-search class="flex-1" v-model="apiSearchData" allow-clear :placeholder="t('apiSearchDataPlaceholder')"
            @input="changeSearchData" />
        </div>
        <div class="ml-2 w-32px">
          <a-button type="primary">
            <span class="icon-[tabler--refresh]"></span>
          </a-button>
        </div>
      </div>

      <div class="w-full flex-1 overflow-y-auto">
        <a-tree :data="apiTreeData" class="w-full" :field-names="fieldNames" block-node :default-expand-all="false"
          :expanded-keys="expandedKeys" @expand="onExpand">
          <template #title="nodeData">
            <div class="w-full flex group" :ref="(el: Element) => treeItemRef[nodeData.key.replace('.', '_')] = el">
              <span v-if="nodeData.type === 'apiDetailFolder'">
                <span class="icon-[noto--file-folder]"></span>
              </span>
              <span v-else :class="apiType[nodeData.api.method as keyof ApiTypeMap].class" class="text-lg font-bold"
                :style="{ color: apiType[nodeData.api.method as keyof ApiTypeMap].color }"></span>
              <div class="ml-2 flex-1 mr-2">{{ nodeData?.name }}<span v-if="nodeData.type === 'apiDetailFolder'"
                  class="opacity-60 text-3 ml-[6px]">({{ countAllChildren(nodeData) }})</span></div>
              <div class="hidden group-hover:block cursor-pointer w-8 h-5">
                <a-dropdown trigger="hover" :popup-container="treeItemRef[nodeData.key.replace('.', '_')]">
                  <span class="icon-[mdi--more-vert]"></span>
                  <template #content>
                    <a-doption>生成接口</a-doption>
                    <a-doption>复制链接</a-doption>
                  </template>
                </a-dropdown>
              </div>
            </div>
          </template>
        </a-tree>
      </div>
    </div>

    <div class="flex-1 flex flex-col items-center justify-center w-full overflow-y-auto" v-else>
      <a-result status="404" class="mt-[-5rem]">
        <template #title>
          <h3 class="empty-tip">{{ checkConfigRes.message }}</h3>
        </template>
        <template #extra>
          <a-space>
            <a-button type='primary' size="small" class="rounded-lg" @click="handlerDeployment">{{ t('tip2') }}</a-button>
            <a-button type="outline" size="small" class="rounded-lg">{{ t('tip3') }}</a-button>
          </a-space>
        </template>
      </a-result>
    </div>
  </div>
</template>
