/*
 * @FilePath: /AutoAPIGen/src/view/index.ts
 * @Description: 
 */
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import { messages } from '../locales'
import '@arco-design/web-vue/dist/arco.css'

const i18n = createI18n({
	legacy: false,
	locale: 'zh',
	messages
})

const app = createApp(App)
app.use(i18n).mount('#app')
