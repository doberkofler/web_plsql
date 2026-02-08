import {defineConfig} from 'vite';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss()],
	build: {
		outDir: path.resolve(import.meta.dirname, 'src/admin/lib'),
		emptyOutDir: true,
		rollupOptions: {
			input: {
				main: path.resolve(import.meta.dirname, 'src/admin/client/main.js'),
			},
			output: {
				entryFileNames: 'chart.bundle.js',
				assetFileNames: (assetInfo) => {
					const info = /** @type {{name?: string, names?: string[]}} */ (assetInfo);
					if (info.name?.endsWith('.css') || info.names?.some((n) => n.endsWith('.css'))) {
						return 'chart.bundle.css';
					}
					return 'assets/[name]-[hash][extname]';
				},
			},
		},
	},
	define: {
		'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
		__BUILD_TIME__: JSON.stringify(new Date().toLocaleString()),
	},
});
