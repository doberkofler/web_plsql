import {defineConfig} from 'vite';
import path from 'node:path';

export default defineConfig({
	build: {
		outDir: path.resolve(import.meta.dirname, 'src/admin/lib'),
		emptyOutDir: true,
		rollupOptions: {
			input: {
				main: path.resolve(import.meta.dirname, 'src/admin/client/main.js'),
			},
			output: {
				entryFileNames: 'chart.bundle.js',
			},
		},
	},
	define: {
		'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
	},
});
