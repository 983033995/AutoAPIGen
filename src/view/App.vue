<!--
 * @FilePath: /AutoAPIGen/src/view/App.vue
 * @Description: 
-->

<script setup lang="ts">
import IconFastApi from '~icons/logos/fastapi-icon'

const { t, locale } = useI18n()


const currentFile = ref('')
const lastFile = ref('./README.md')

// 配置信息
const configInfo = ref<ConfigurationInformation>()

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

// Example of handling messages sent from the extension to the webview
window.addEventListener('message', (event) => {
	const message = event.data

  console.log('----- getWorkspaceState ------', message)
	switch (message.command) {
	case 'getWorkspaceState':
    configInfo.value = message.data
    console.log('----- configInfo ------', configInfo.value, checkConfigRes.value)
		return
  case 'setCurrentFileExample':
		lastFile.value = currentFile.value
		currentFile.value = message.text
		return
	}
})

vscode.postMessage({ command: 'getWorkspaceState' })

watch(() => configInfo.value?.theme, (value) => {
  if (value && value.kind === 2) {
    document.body.setAttribute('arco-theme', 'dark')
  }
})

const handlerDeployment = () => {
  vscode.postMessage({ command: 'getWorkspaceState' })
  const setting = toRaw(configInfo.value?.configInfo) || {}
  console.log('----- setting ------', setting)
  vscode.postMessage({ command: 'openConfigPage', data: { title: t('configPageTitle'), configInfo: setting } })
}
</script>

<template>
  <div class="flex items-center flex-col mx-0 w-full h-full">
    <div class="flex justify-between w-full items-center">
      <IconFastApi
        style="font-size: 2em;"
        class="my-2"
      />
      <h1 class="text-lg flex-1 text-1 ml-4">
        AutoApiGen
      </h1>
    </div>

    <hr class="border-white w-full mt-2 mb-4">

    <div v-if="checkConfigRes.success" class="w-full flex-1 overflow-hidden overflow-y-auto">
      接口内容
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
