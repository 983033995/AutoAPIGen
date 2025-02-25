<script setup lang="ts">
const { t } = useI18n()

// 接口详情数据
const apiDetail = ref<{
  api: ApiDetailInfo
  name: string
  key: string
}>()

// 监听来自插件主进程的消息
window.addEventListener('message', (event) => {
  const message = event.data
  console.log('----- 接口详情数据 -----', message)
  switch (message.command) {
    case 'setApiDetail':
      apiDetail.value = message.data
      break
  }
})
</script>

<template>
  <div class="w-full h-full flex flex-col p-4" v-if="apiDetail">
    <div class="text-lg font-bold mb-4">{{ apiDetail.name }}</div>
    
    <!-- 接口基本信息 -->
    <div class="mb-4">
      <div class="text-sm font-medium mb-2">{{ t('apiBasicInfo') }}</div>
      <a-descriptions :data="[
        { label: t('apiPath'), value: apiDetail.api.path },
        { label: t('apiMethod'), value: apiDetail.api.method.toUpperCase() },
        { label: t('apiStatus'), value: apiDetail.api.status },
      ]" layout="inline-horizontal" />
    </div>

    <!-- 请求参数 -->
    <div class="mb-4" v-if="apiDetail.api.requestBody">
      <div class="text-sm font-medium mb-2">{{ t('apiRequestParams') }}</div>
      <a-descriptions :data="Object.entries(apiDetail.api.requestBody).map(([key, value]) => ({
        label: key,
        value: JSON.stringify(value)
      }))" layout="inline-horizontal" />
    </div>

    <!-- 响应数据 -->
    <div class="mb-4" v-if="apiDetail.api.response">
      <div class="text-sm font-medium mb-2">{{ t('apiResponse') }}</div>
      <pre class="bg-gray-100 p-2 rounded">{{ JSON.stringify(apiDetail.api.response, null, 2) }}</pre>
    </div>
  </div>
</template>