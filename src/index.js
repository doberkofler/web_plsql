// @flow

/*
*	Express middleware for Oracle PL/SQL
*/

const debug = require('debug')('web_plsql:index');
const url = require('url');
const oracledb = require('oracledb');
const processRequest = require('./request');
const validate = require('./config');
const RequestError = require('./requestError');
const errorPage = require('./errorPage');

import type {oracleExpressMiddleware$options} from './config';
type $NextFunction = () => void;

process.on('unhandledRejection', (reason, p) => {
	console.error('Unhandled promise rejection', reason, p);

	process.exit(1);
});

/**
* Express middleware.
*
* @param {Object} options - The configuration options.
* @returns {Function} - The request handler.
*/
module.exports = function (options: oracleExpressMiddleware$options) {
	debug('oracleExpressMiddleware: initialized');

	// validate the configuration options
	validate(options);

	// create a database pool
	const databasePool = oracledb.createPool({
		user: options.oracleUser,
		password: options.oraclePassword,
		connectString: options.oracleConnection,
		poolMin: 10,			// The minimum number of connections a connection pool maintains, even when there is no activity to the target database.
		poolMax: 1000,			// The maximum number of connections to which a connection pool can grow.
		poolIncrement: 10,		// The number of connections that are opened whenever a connection request exceeds the number of currently open connections.
		queueRequests: false,	// If this property is false and a request for a connection is made from a pool where the number of “checked out” connections has reached poolMax, then an ORA-24418 error indicating that further sessions cannot be opened will be returned.
		queueTimeout: 1000		// The number of milliseconds after which connection requests waiting in the connection request queue are terminated. If queueTimeout is 0, then queued connection requests are never terminated.
	});

	// if allocating the database pool fails, exit already here
	databasePool.catch(e => {
		console.error(`Unable to create database pool.\n${e.message}`);
		process.exit(1);
	});

	// unique request id
	let uniqueRequestID = 0;

	return function (req: $Request, res: $Response, next: $NextFunction) { // eslint-disable-line no-unused-vars
		// add a unique request id to the request object
		req.uniqueRequestID = ++uniqueRequestID;

		// should we switch to the default page if there is one defined
		if (typeof req.params.name !== 'string' || req.params.name.length === 0) {
			if (typeof options.defaultPage === 'string' && options.defaultPage.length > 0) {
				res.redirect(url.resolve(req.originalUrl + '/' + options.defaultPage, ''));
			} else {
				errorPage(req, res, options, new RequestError('No procedure name given and no default page has been specified'));
			}
		} else {
			processRequest(req, res, options, databasePool)
				//.then(next)
				.catch(e => {
					errorPage(req, res, options, e);
				});
		}
	};
};
