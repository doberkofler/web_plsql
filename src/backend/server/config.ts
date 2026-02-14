import {getVersion} from '../version.ts';
import type {configType} from '../types.ts';

const paddedLine = (title: string, value: string | number) => {
	console.log(`${(title + ':').padEnd(30)} ${value}`);
};

/**
 * Show configuration.
 * @param config - The config.
 */
export const showConfig = (config: configType): void => {
	const LINE = '-'.repeat(80);

	console.log(LINE);
	console.log(`NODE PL/SQL SERVER version ${getVersion()}`);
	console.log(LINE);

	paddedLine('Server port', config.port);
	paddedLine('Admin route', `${config.adminRoute ?? '/admin'}${config.adminUser ? ' (authenticated)' : ''}`);
	paddedLine('Access log', config.loggerFilename.length > 0 ? config.loggerFilename : '-');
	paddedLine('Upload file size limit', typeof config.uploadFileSizeLimit === 'number' ? `${config.uploadFileSizeLimit} bytes` : '-');

	if (config.routeStatic.length > 0) {
		config.routeStatic.forEach((e) => {
			paddedLine('Static route', e.route);
			paddedLine('Directory path', e.directoryPath);
		});
	}

	if (config.routePlSql.length > 0) {
		config.routePlSql.forEach((e) => {
			let transactionMode = '';
			if (typeof e.transactionMode === 'string') {
				transactionMode = e.transactionMode;
			} else if (typeof e.transactionMode === 'function') {
				transactionMode = 'custom callback';
			}

			paddedLine('Route', `http://localhost:${config.port}${e.route}`);
			paddedLine('Oracle user', e.user);
			paddedLine('Oracle server', e.connectString);
			paddedLine('Oracle document table', e.documentTable);
			paddedLine('Default page', e.defaultPage.length > 0 ? e.defaultPage : '-');
			paddedLine('Path alias', e.pathAlias ?? '-');
			paddedLine('Path alias procedure', e.pathAliasProcedure ?? '-');
			paddedLine('Exclution list', e.exclusionList ? e.exclusionList.join(', ') : '-');
			paddedLine('Validation function', e.requestValidationFunction ?? '-');
			paddedLine('After request handler', transactionMode.length > 0 ? transactionMode : '-');
			paddedLine('Error style', e.errorStyle);
		});
	}

	console.log(LINE);

	const baseUrl = `http://localhost:${config.port}`;
	paddedLine('🏠 Admin Console', `${baseUrl}${config.adminRoute ?? '/admin'}`);
	if (config.routePlSql.length > 0) {
		console.log('');
		console.log('⚙️  PL/SQL Gateways:');
		config.routePlSql.forEach((e) => {
			console.log('  ' + `${e.route.padEnd(28)} ${baseUrl}${e.route}`);
		});
	}

	console.log(LINE);
};
