<!--
 * @FilePath: /AutoAPIGen/src/view/App.vue
 * @Description: 
-->

<script setup lang="ts">
document.body.setAttribute('arco-theme', 'dark')
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

console.log('------>sendTime', new Date().toLocaleTimeString())
vscode.postMessage({
  command: 'getWorkspaceState', data: {
    init: false
  }
})

// 监听配置变化
watch(() => configInfo.value?.theme, (value) => {
  if (value && value.kind === 2) {
    document.body.setAttribute('arco-theme', 'dark')
  } else {
    document.body.removeAttribute('arco-theme');
  }
})

/**
 * 打开配置页
 *
 * @returns 无返回值，通过向VS Code发送消息实现功能
 */
const handlerDeployment = () => {
  // vscode.postMessage({ command: 'getWorkspaceState' })
  const setting = toRaw(configInfo.value?.configInfo) || {}
  vscode.postMessage({ command: 'openConfigPage', data: { title: t('configPageTitle'), configInfo: setting } })
}

const apiSearchData = ref('')

const clearApiDetailChildren = (nodes: ApiTreeListResData[]): ApiTreeListResData[] => {
  return nodes.map(node => {
    // 深拷贝 children 以避免直接修改原始数组
    const children = clearApiDetailChildren(node.children);

    if (node.type === 'apiDetail') {
      // 如果 type 是 'apiDetail'，则将 children 设置为空数组
      return {
        ...node,
        children: []
      };
    } else {
      // 否则，保留原有的 children
      return {
        ...node,
        children
      };
    }
  });
}

const apiTreeList = computed(() => {
  const treeList = configInfo.value?.configInfo?.apiTreeList || []
  return clearApiDetailChildren(treeList)
})

const expandedKeys = ref<string[]>([])

const searchApiTreeList = (keyword: string) => {
  const loop = (data: ApiTreeListResData[]) => {
    const result: ApiTreeListResData[] = [];
    data.forEach((item: ApiTreeListResData) => {
      if (item.name.toLowerCase().indexOf(keyword.toLowerCase()) > -1 || (item?.api && item.api.path.toLowerCase().indexOf(keyword.toLowerCase()) > -1)) {
        result.push({ ...item });
        expandedKeys.value.push(item.key);
      } else if (item.children && item.type === 'apiDetailFolder') {
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

const treeListLoading = ref(false)
const updateTree = () => {
  treeListLoading.value = true
  vscode.postMessage({
    command: 'getWorkspaceState', data: {
      init: true,
    }
  })
}

const handleSelectOperate = (type: string, data: ApiTreeListResData) => {
  console.log('------>handleSelectOperate', type, data)
  vscode.postMessage({
    command: 'interfaceOperate', data: {
      type,
      itemType: data.type,
      key: data.key,
    }
  })
}

window.addEventListener('message', (event) => {
  const message = event.data

  console.log('----- getWorkspaceState ------', message)
  switch (message.command) {
    case 'getWorkspaceState':
      console.log('------>getTime', new Date().toLocaleTimeString())
      configInfo.value = message.data
      apiWorkSpace.value = getNamesByIds(configInfo.value?.configInfo.apiProjectList || [], configInfo.value?.configInfo.projectId || [])
      loading.value = false
      treeListLoading.value = false
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

</script>

<template>
  <a-spin class="mx-0 w-full h-full bg-[rgba(0,0,0,0)]" dot tip="配置加载中..." :loading="loading">
    <div class="flex items-center flex-col mx-0 w-full h-full" v-show="!loading">
      <div class="flex w-full items-center">
        <div class="text-[16px]"><span class="icon-[logos--fastapi-icon]"></span></div>
        <div class="flex-1 overflow-hidden mx-[8px]">
          <a-breadcrumb :style="{ fontSize: `12px` }">
            <a-breadcrumb-item v-for="(item, index) in apiWorkSpace" :key="index">{{ item }}</a-breadcrumb-item>
            <template #item-render></template>
          </a-breadcrumb>
        </div>
        <a-tooltip :content="t('tip7')" mini position="lt">
          <a-button type="text" class="w-[32px]" style="margin: 0; padding: 0;" @click="handlerDeployment">
            <span class="icon-[hugeicons--system-update-01] text-[18px]"></span>
          </a-button>
        </a-tooltip>
      </div>

      <a-divider dashed margin="10px" />

      <a-spin dot tip="数据更新中..." :loading="treeListLoading" class="w-full flex-1 overflow-hidden">
        <div v-if="checkConfigRes.success" class="w-full h-full overflow-hidden flex-col flex">
          <div class="w-full flex justify-between">
            <div class="flex-1">
              <a-input-search class="flex-1" v-model="apiSearchData" allow-clear
                :placeholder="t('apiSearchDataPlaceholder')" @input="changeSearchData" />
            </div>
            <div class="ml-2 w-32px">
              <a-tooltip :content="t('tip6')" mini position="lt">
                <a-button type="primary" @click="updateTree">
                  <span class="icon-[tabler--refresh]"></span>
                </a-button>
              </a-tooltip>
            </div>
          </div>
  
          <div class="w-full flex-1 overflow-y-auto">
            <a-tree :data="apiTreeData" class="w-full" :field-names="fieldNames" block-node :default-expand-all="false"
              :expanded-keys="expandedKeys" @expand="onExpand">
              <template #title="nodeData">
                <div class="w-full flex group items-center" :style="{ cursor: nodeData.type === 'apiDetailFolder' ? 'default' : 'pointer' }" :ref="(el: Element) => treeItemRef[nodeData.key.replace('.', '_')] = el">
                  <span v-if="nodeData.type === 'apiDetailFolder'">
                    <span class="icon-[noto--file-folder]"></span>
                  </span>
                  <span v-else :class="apiType[nodeData.api.method as keyof ApiTypeMap].class" class="text-lg font-bold"
                    :style="{ color: apiType[nodeData.api.method as keyof ApiTypeMap].color }"></span>
                  <div class="ml-2 flex-1 mr-2">
                    {{ nodeData?.name }}
                    <span v-if="nodeData.type === 'apiDetailFolder'" class="opacity-60 text-3 ml-[6px]">({{ countAllChildren(nodeData) }})</span>
                  </div>
                  <div class="cursor-pointer w-8 h-5">
                    <a-dropdown trigger="hover" :popup-container="treeItemRef[nodeData.key.replace('.', '_')]" @select="(val: string) => handleSelectOperate(val, nodeData)">
                      <span class="icon-[mdi--more-vert] hidden group-hover:block "></span>
                      <template #content>
                        <a-doption value="generate">{{ t('operate1') }}</a-doption>
                        <a-doption value="copy">{{ t('operate2') }}</a-doption>
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
                <a-button type='primary' size="small" class="rounded-lg" @click="handlerDeployment">{{ t('tip2')
                }}</a-button>
                <a-button type="outline" size="small" class="rounded-lg">{{ t('tip3') }}</a-button>
              </a-space>
            </template>
          </a-result>
        </div>
      </a-spin>
    </div>
</a-spin></template>
