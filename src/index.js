// @flow

/*
*	Express middleware for Oracle PL/SQL
*/

const debug = require('debug')('web_plsql:index');
const Database = require('./database');
const processRequest = require('./request');
const config = require('./config');
const trace = require('./trace');
const error = require('./error');

import type {oracleExpressMiddleware$options} from './config';
type $NextFunction = () => void;

process.on('unhandledRejection', (reason, p) => {
	error.exit(reason, p);
});

module.exports = function (options: oracleExpressMiddleware$options) {
	debug('oracleExpressMiddleware: initialized');

	// validate the cinfiguration options
	config.validate(options);

	// instanciate the database object
	const database = new Database();

	return function (req: $Request, res: $Response, next: $NextFunction) {
		trace.trace('web_plsql middleware request\n' + trace.reqToString(req));
		processRequest(req, res, options, database).then(next).catch(next);
	};
};
