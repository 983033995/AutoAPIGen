/*
 * @FilePath: /AutoAPIGen/vite.config.ts
 * @Description: 
 */
import path from 'path'
import vue from '@vitejs/plugin-vue'
import Icons from 'unplugin-icons/vite'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import { defineConfig } from 'vite'

import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ArcoResolver } from 'unplugin-vue-components/resolvers'
import { vitePluginForArco } from '@arco-plugins/vite-vue'

import type { InlineConfig } from 'vitest'
import type { UserConfig } from 'vite'

interface VitestConfigExport extends UserConfig {
	test: InlineConfig;
}

module.exports = defineConfig({
	publicDir: 'public',
	resolve: {
		alias: {
			'@/': `${path.resolve(__dirname, 'src')}/`,
		  },
	},
	plugins: [
		vue({ customElement: true }),
		Icons({
			autoInstall: true,
		}),
		VueI18nPlugin({}),
		AutoImport({
			imports: [
				'vue',
				'vue-i18n',
				{
					'@vueuse/core': ['useStorage'],
				}
			],
			resolvers: [ArcoResolver()],
		}),
		vitePluginForArco({
			style: 'css',
		}),
		Components({
			resolvers: [
				ArcoResolver({
					sideEffect: true,
				})
			]
		})
	],
	build: {
		lib: {
			entry: './src/view/index.ts',
			formats: ['es', 'cjs'],
			fileName: (format) => `index.${format}.js`
		},
		rollupOptions: {
			output: {
				entryFileNames: '[name].[format].js',
				chunkFileNames: 'chunks/[name].[format].js',
				assetFileNames: (assetInfo) => {
					if (assetInfo.name?.endsWith('.css')) {
						return 'style.css';
					}
					return 'assets/[name]-[hash][extname]';
				},
				manualChunks: {
					// 将大型依赖分离到单独的chunk中
					'vendor': ['vue', 'vue-i18n', '@vueuse/core'],
					'arco': ['@arco-design/web-vue'],
					// 将编辑器相关代码单独分离
					'editor': ['monaco-editor', '@monaco-editor/loader']
				},
				// 减小chunk大小
				chunkSizeWarningLimit: 1000,
			},
			input: {
				index: './src/view/index.ts',
				config: './src/view/config/index.ts',
				api: './src/view/apiDetail/index.ts',
			},
		},
		// 使用terser进行更强的压缩
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: true,
				drop_debugger: true
			}
		},
		// 禁用CSS代码分割，确保生成单一CSS文件
		cssCodeSplit: false,
		// 启用CSS压缩
		cssMinify: true,
		emptyOutDir: false,
		outDir: 'dist/compiled'
	},
	test: {
		globals: true,
		include: ['**/*.spec.ts'],
		setupFiles: [
			'./setupTests.ts',
		],
		environment: 'jsdom',
	},
} as VitestConfigExport)
