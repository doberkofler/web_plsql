/**
 * @typedef {import('../types.js').configType} configType
 */

/**
 * Show configuration.
 * @param {configType} config - The config.
 * @returns {void}
 */
export const showConfig = (config) => {
	const LINE = '-'.repeat(80);

	console.log(LINE);
	console.log('NODE PL/SQL SERVER');
	console.log(LINE);

	console.log(`Server port:           ${config.port}`);
	console.log(`Access log:            ${config.loggerFilename.length > 0 ? config.loggerFilename : ''}`);

	if (config.routeStatic.length > 0) {
		console.log(LINE);
		config.routeStatic.forEach((e) => {
			console.log(`Static route:          ${e.route}`);
			console.log(`Directory path:        ${e.directoryPath}`);
		});
	}

	if (config.routePlSql.length > 0) {
		console.log(LINE);
		config.routePlSql.forEach((e) => {
			console.log(`Route:                 http://localhost:${config.port}${e.route}`);
			console.log(`Oracle user:           ${e.user}`);
			console.log(`Oracle server:         ${e.connectString}`);
			console.log(`Oracle document table: ${e.documentTable}`);
			console.log(`Default page:          ${e.defaultPage}`);
			console.log(`Path alias:            ${e.pathAlias}`);
			console.log(`Path alias procedure:  ${e.pathAliasProcedure}`);
			console.log(`Exclution list:        ${e.exclusionList?.join(', ')}`);
			console.log(`Validation function:   ${e.requestValidationFunction}`);
			console.log(`Error style:           ${e.errorStyle}`);
		});
	}

	console.log(LINE);
};
