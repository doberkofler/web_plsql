import {getVersion} from '../version.ts';
import type {configType} from '../types.ts';

/**
 * Show configuration.
 * @param config - The config.
 */
export const showConfig = (config: configType): void => {
	const LINE = '-'.repeat(80);

	console.log(LINE);
	console.log(`NODE PL/SQL SERVER version ${getVersion()}`);
	console.log(LINE);

	console.log(`Server port:            ${config.port}`);
	console.log(`Admin route:            ${config.adminRoute ?? '/admin'}${config.adminUser ? ' (authenticated)' : ''}`);
	console.log(`Access log:             ${config.loggerFilename.length > 0 ? config.loggerFilename : ''}`);
	console.log(`Upload file size limit: ${typeof config.uploadFileSizeLimit === 'number' ? `${config.uploadFileSizeLimit} bytes` : 'any'}`);

	if (config.routeStatic.length > 0) {
		console.log(LINE);
		config.routeStatic.forEach((e) => {
			console.log(`Static route:           ${e.route}`);
			console.log(`Directory path:         ${e.directoryPath}`);
		});
	}

	if (config.routePlSql.length > 0) {
		console.log(LINE);
		config.routePlSql.forEach((e) => {
			let transactionMode = '';
			if (typeof e.transactionMode === 'string') {
				transactionMode = e.transactionMode;
			} else if (typeof e.transactionMode === 'function') {
				transactionMode = 'custom callback';
			}

			console.log(`Route:                  http://localhost:${config.port}${e.route}`);
			console.log(`Oracle user:            ${e.user}`);
			console.log(`Oracle server:          ${e.connectString}`);
			console.log(`Oracle document table:  ${e.documentTable}`);
			console.log(`Default page:           ${e.defaultPage}`);
			console.log(`Path alias:             ${e.pathAlias}`);
			console.log(`Path alias procedure:   ${e.pathAliasProcedure}`);
			console.log(`Exclution list:         ${e.exclusionList?.join(', ')}`);
			console.log(`Validation function:    ${e.requestValidationFunction}`);
			console.log(`After request handler:  ${transactionMode}`);
			console.log(`Error style:            ${e.errorStyle}`);
		});
	}

	console.log(LINE);
};
