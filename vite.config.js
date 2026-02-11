import {defineConfig} from 'vite';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import {compression} from 'vite-plugin-compression2';

export default defineConfig({
	root: 'src/frontend',
	// CRITICAL: This base path MUST match the adminRoute default in server configuration.
	// The admin console is hardcoded to be served at '/admin/'.
	// Changing this requires updating src/backend/server/server.ts adminRoute mounting logic.
	// Mismatch causes 404s for CSS/JS assets (href="/assets/..." vs "/admin/assets/...").
	base: '/admin/',
	plugins: [
		tailwindcss(),
		compression({
			algorithms: ['gzip', 'brotliCompress'],
			threshold: 1024,
		}),
	],
	build: {
		outDir: '../../dist/frontend',
		emptyOutDir: true,
		rollupOptions: {
			input: {
				main: path.resolve(import.meta.dirname, 'src/frontend/index.html'),
			},
		},
	},
	server: {
		// Development server configuration
		port: 5173,
		proxy: {
			// Proxy admin API requests to dev backend server
			'/admin/api': {
				target: 'http://localhost:3001',
				changeOrigin: true,
			},
			// Proxy PL/SQL routes to dev backend server
			'/sample': {
				target: 'http://localhost:3001',
				changeOrigin: true,
			},
			// Proxy static assets to dev backend server
			'/static': {
				target: 'http://localhost:3001',
				changeOrigin: true,
			},
		},
	},
	define: {
		'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
		__BUILD_TIME__: JSON.stringify(new Date().toLocaleString()),
	},
});
