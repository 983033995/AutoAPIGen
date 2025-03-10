/*
 * @FilePath: /AutoAPIGen/tailwind.config.js
 * @Description: 
 */

const { addDynamicIconSelectors } = require('@iconify/tailwind')
/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,vue,ts}'],
	theme: {
		extend: {},
	},
	plugins: [
		addDynamicIconSelectors(['fluent', 'tabler', 'logos', 'mdi', 'mdi-light', 'noto', 'hugeicons'])
	],
	safelist: [
		{ pattern: /bg-\[#\w+\]/ }, // 允许所有十六进制背景色
		'bg-[#17b26a]',
		'bg-[#2e90fa]',
		'bg-[#f04438]' // 明确列出可能使用的颜色
	]
}
