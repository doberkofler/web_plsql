// @flow

/*
*	Express middleware for Oracle PL/SQL
*/

const debug = require('debug')('web_plsql:index');
const Database = require('./database');
const processRequest = require('./request');
const config = require('./config');
const error = require('./error');

type $NextFunction = () => void;
export type oracleExpressMiddleware$options = {
	oracleUser: string,
	oraclePassword: string,
	oracleConnection: string,
	doctable: string
};

process.on('unhandledRejection', (reason, p) => {
	debug('Unhandled Rejection: ', reason);
	error(p);
});

module.exports = function (options: oracleExpressMiddleware$options) {
	debug('oracleExpressMiddleware: initialized');

	// validate the cinfiguration options
	config.validate(options);

	// instanciate the database object
	const database = new Database();

	return function (req: $Request, res: $Response, next: $NextFunction) {
		processRequest(req, res, options, database).then(() => {
			next();
		}).catch(() => {
			next();
		});
	};
};
