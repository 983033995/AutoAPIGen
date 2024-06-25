<!--
 * @FilePath: /AutoAPIGen/src/view/App.vue
 * @Description: 
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IconFastApi from '~icons/logos/fastapi-icon'
import Button from './components/Button.vue'
import { appList } from '../constant/index'

const { t, locale } = useI18n()


let currentFile = ref('')
let lastFile = ref('./README.md')

// Example of handling messages sent from the extension to the webview
window.addEventListener('message', (event) => {
	const message = event.data // The JSON data our extension sent

	switch (message.command) {
	case 'setCurrentFileExample':
		lastFile.value = currentFile.value
		currentFile.value = message.text
		return
	}
})

// Example of sending a message from the webview to the extension
const openLastFile = () => {
	vscode.postMessage({
		command: 'openFileExample',
		text: lastFile.value
	})
}
</script>

<template>
  <div class="flex items-center flex-col mx-0 w-full">
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

    <div class="w-full flex leading-14 justify-between">
      <div class="flex flex-1 items-center">
        <div class="text-[12px]">{{ t('systemTip') }}:</div>
        <div class="w-24 ml-[12px]">
          <a-select :border="false" size="mini">
            <a-option v-for="item in appList" :key="item.value" :value="item.value">{{ item.label }}</a-option>
          </a-select>

        </div>
      </div>
    </div>
    <div class="flex gap-4">
      <label>{{ t('language') }}</label>
      <select
        v-model="locale"
        class="text-black"
      >
        <option value="en">
          en
        </option>
        <option value="zh">
          zh
        </option>
      </select>
    </div>
    <p>Translated Content: {{ t('hello') }}</p>

    <Button />

    <p class="mt-4 mb-2">
      Current File: {{ currentFile }}
    </p>
    <button
      @click="openLastFile"
    >
      Open Last File
    </button>
  </div>
  <a-button type="primary">
    Primary
  </a-button>
  <a-button type="outline">
    Outline
  </a-button>

  <a-select placeholder="Please select ...">
    <a-option>Beijing-Beijing-Beijing</a-option>
    <a-option>Shanghai</a-option>
    <a-option>Guangzhou</a-option>
    <a-option disabled>
      Disabled
    </a-option>
  </a-select>
</template>

