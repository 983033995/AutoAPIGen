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
}
