import {defineConfig} from 'tsdown';
import pkg from './package.json' with {type: 'json'};

export default defineConfig({
	entry: 'src/backend/index.ts',
	format: ['esm'],
	target: 'node24',
	clean: true,
	dts: true,
	inlineOnly: false,
	sourcemap: true,
	external: [
		'compression',
		'cookie-parser',
		'debug',
		'express',
		'morgan',
		'multer',
		'oracledb',
		'rotating-file-stream',
		'zod',
		'cors',
		'object-assign',
		'vary',
	],
	define: {
		__VERSION__: JSON.stringify(pkg.version),
	},
});
