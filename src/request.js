'use strict';

/**
* Module dependencies.
*/

const debug = require('debug')('node_plsql:database');
const util = require('util');
const fs = require('fs');
const _ = require('underscore');
const Promise = require('es6-promise').Promise;
const oracle = require('./oracle');
const log = require('./log');

/**
* Module variables.
*/

/**
* Create an Oracle connection
*
* @param {Object} application - node_plsql application
* @return {Object} Promise
*/
function createConnectionPools(application) {
	let arrayOfPromises = [],
		i;

	// debug
	debug('createConnectionPools');

	// Set some values for the statistics
	application.statistics.oracleDbVersion = oracle.getNodeDriverVersion();
	application.statistics.oracleClientVersion = oracle.getClientVersion();

	// Create a pool for the individual services
	if (_.isArray(application.options.services)) {
		for (i = 0; i < application.options.services.length; i++) {
			if (application.options.services[i].authenticationMode === 'anonymous') {
				arrayOfPromises.push(_createConnectionPool(application.options.services[i]));
			}
		}
	}

	// Wait until all promises returned
	return Promise.all(arrayOfPromises);
}

/**
* Destroy an Oracle connection
*
* @param {Object} application - node_plsql application
* @return {Object} Promise
*/
function destroyConnectionPools(application) {
	let arrayOfPromises = [],
		i;

	debug('destroyConnectionPools');

	if (_.isArray(application.options.services)) {
		for (i = 0; i < application.options.services.length; i++) {
			if (application.options.services[i].authenticationMode === 'anonymous') {
				arrayOfPromises.push(oracle.destroyConnectionPool(application.options.services[i].database.connectionPool));
			}
		}
	}

	// Wait until all promises returned
	return Promise.all(arrayOfPromises);
}

/**
* Invoke the PL/SQL code and execute the callback when done
*
* @param {Object} service - Service object.
* @param {String} procedure - Name of the PL/SQL procedure to execute.
* @param {Object} args - Object with the arguments for the PL/SQL procedure as properties.
* @param {Object} cgi - Array of cgi variables to send for the PL/SQL code.
* @param {Array} files - Array of files to upload.
* @param {String} doctablename - Document table name.
* @param {Function} callback - Callback function (function cb(err, page)) to invoke when done.
* @api public
*/
function invoke(service, procedure, args, cgi, files, doctablename, callback) {
	// debug
	debug('invoke: START procedure="' + procedure + '"');

	// validate
	if (arguments.length !== 7 || !_.isObject(service) || !_.isString(procedure) || !_.isObject(args) || !_.isObject(cgi) || !_.isArray(files) || (!_.isUndefined(doctablename) && !_.isString(doctablename)) || !_.isFunction(callback)) {
		log.exit(new Error('Invalid arguments for database.invoke\n' + util.inspect(arguments, {showHidden: false, depth: null, colors: true})));
	}

	// trace
	log.trace('B) A STORED PROCEDURE WILL BE INVOKED (database.invoke)', {username: service.databaseUsername, procedure: procedure, args: args, cgi: cgi, files: files, doctablename: doctablename});

	// Is there an event callback we should invoke
	if (_.isFunction(service.invokeCallback)) {
		service.invokeCallback(service, procedure, args, cgi, files, doctablename, callback);
		return;
	}

	// open the connection
	let connectionPromise = (service.authenticationMode === 'anonymous') ? oracle.openPooledConnection(service.database.connectionPool) : oracle.openConnection(service.databaseUsername, service.databasePassword, service.databaseConnectString);

	// process request
	connectionPromise.then(function (connection) {
		// process the request
		_processRequest(connection, procedure, args, cgi, files, doctablename)
			// request has been processsed successfully
			.then(function (page) {
				oracle.closeConnection(connection);
				debug('invoke: got the following page\n----------\n' + page + '\n----------');
				callback(null, page);
			})
			// error when trying to process request
			.catch(/* istanbul ignore next */
				function (err) {
					oracle.closeConnection(connection);
					log.error(err);
					callback(err, '');
				});
	}).catch(/* istanbul ignore next */
		function (err) {
			log.error(err);
			callback(err, '');
		});
}

/*
 * Create a connection pool and connect to the database
 */
function _createConnectionPool(service) {
	let text;

	// debug
	debug('_createConnectionPool');

	service.database = {};

	// Show connect message
	text = 'Connect with Oracle as ' + service.databaseUsername;
	/* istanbul ignore else */
	if (service.databaseConnectString.length > 0) {
		text += '@' + service.databaseConnectString;
	}
	log.log(text);

	// Prepare the database
	return new Promise(function (resolve, reject) {
		let promise;

		// Create the connection pool
		promise = oracle.createConnectionPool(service.databaseUsername, service.databasePassword, service.databaseConnectString);
		promise.catch(/* istanbul ignore next */
			function (err) {
				debug('Error when trying to create connection pool');
				return reject(err);
			});

		// Open the connection
		promise = promise.then(function (pool) {
			service.database.connectionPool = pool;

			// Eventually register an execute callback function
			if (_.isFunction(service.oracleExecuteCallback)) {
				service.database.connectionPool.registerExecuteCallback(service.oracleExecuteCallback);
			}

			return oracle.openPooledConnection(service.database.connectionPool);
		});
		promise.catch(/* istanbul ignore next */
			function (err) {
				debug('Error when trying to get a new connection');
				return reject(err);
			});

		// Close the connection
		promise = promise.then(function (connection) {
			service.database.oracleServerVersion = oracle.versionAsString(connection.oracleServerVersion);
			return oracle.closeConnection(connection);
		});
		promise.catch(/* istanbul ignore next */
			function (err) {
				debug('Error when trying to close connection');
				return reject(err);
			});

		// We have successfully finished
		promise.then(function () {
			resolve();
		});

	});
}

/*
 *	Process the request
 */
function _processRequest(connection, proc, args, cgi, files, doctable) {
	debug('_processRequest "' + proc + '"');

	return new Promise(function (resolve, reject) {
		// Upload all files
		_uploadFiles(connection, doctable, files).then(function () {
			// Execute the request type
			_processRequestType(connection, proc, args, cgi, files, doctable).then(function (page) {
				resolve(page);
			}).catch(/* istanbul ignore next */
				function (err) {
					reject(err);
				});
		});
	});
}

/*
 *	Process the request type
 */
function _processRequestType(connection, proc, args, cgi, files, doctable) {
	debug('_processRequestType "' + proc + '"');

	// Execute the procedure with variable arguments
	if (proc.substring(0, 1) === '!') {
		return _processRequestVariableArguments(connection, proc, args, cgi, files, doctable);
	}

	// Execute the procedure with fixed arguments
	return new Promise(function (resolve, reject) {
		_getArguments(connection, proc).then(function (argTypes) {
			_processRequestFixedArguments(connection, proc, args, argTypes, cgi, files, doctable).then(function (page) {
				resolve(page);
			}).catch(/* istanbul ignore next */
				function (err) {
					reject(err);
				});
		}).catch(/* istanbul ignore next */
			function (err) {
				reject(err);
			});
	});
}

/*
 *	Execute procedure with a variable number of arguments
 */
function _processRequestVariableArguments(connection, proc, args, cgi, files, doctable) {
	let procStatement,
		procBindings = {
			argnames: {dir: oracle.BIND_IN, type: oracle.STRING, val: []},
			argvalues: {dir: oracle.BIND_IN, type: oracle.STRING, val: []}
		};

	// debug
	debug('_processRequestVariableArguments');

	// validate
	/* istanbul ignore if */
	if (arguments.length !== 6 || !_.isObject(connection) || !_.isString(proc) || !_.isObject(args) || !_.isObject(cgi) || !_.isArray(files) || !_.isString(doctable)) {
		log.exit(new Error('invalid arguments'));
	}

	// bindings for the statement
	_.each(args, function (value, key) {
		let i;

		if (typeof value === 'string') {
			procBindings.argnames.val.push(key);
			procBindings.argvalues.val.push(value);
		} else /* istanbul ignore else */ if (_.isArray(value)) {
			for (i = 0; i < value.length; i++) {
				procBindings.argnames.val.push(key);
				procBindings.argvalues.val.push(value[i]);
			}
		}
	});

	// sql command for the statement
	procStatement = proc.substring(1) + '(:argnames, :argvalues);';

	// run the procedure
	return _runProcedure(connection, cgi, files, doctable, procStatement, procBindings);
}

/*
 *	Execute procedure with a fixed number of arguments
 */
function _processRequestFixedArguments(connection, proc, args, argTypes, cgi, files, doctable) {
	let procStatement = '',
		procBindings = {},
		index = 0;

	// debug
	debug('_processRequestFixedArguments');

	// validate
	/* istanbul ignore if */
	if (arguments.length !== 7 || !_.isObject(connection) || !_.isString(proc) || !_.isObject(args) || !_.isObject(argTypes) || !_.isObject(cgi) || !_.isArray(files) || !_.isString(doctable)) {
		log.exit(new Error('invalid arguments'));
	}

	// bindings for the statement
	procStatement = proc + '(';
	_.each(args, function (value, key) {
		let para = 'p' + (index + 1).toString(),
			isArray = false,
			i;

		// prepend the separator, if this is not the first argument
		if (index > 0) {
			procStatement += ',';
		}

		key = key.toLowerCase();

		// add the argument
		procStatement += key + '=>:' + para;

		// determine, if the argument is a scalar or an array
		isArray = _.isArray(value) || (_.has(argTypes, key) && argTypes[key] === 'PL/SQL TABLE');

		// add the binding
		procBindings[para] = {dir: oracle.BIND_IN, type: oracle.STRING};

		// set the value or array of values
		if (isArray) {
			procBindings[para].val = [];
			if (typeof value === 'string') {
				procBindings[para].val.push(value);
			} else {
				for (i = 0; i < value.length; i++) {
					procBindings[para].val.push(value[i]);
				}
			}
		} else /* istanbul ignore else */ if (typeof value === 'string') {
			procBindings[para].val = value;
		}

		++index;
	});
	procStatement += ');';

	// run the procedure
	return _runProcedure(connection, cgi, files, doctable, procStatement, procBindings);
}

/*
 *	Run the procedure where "procStatement" is the sql statement to execute and "procBindings"
 *	are the additional bindings to be added.
 */
function _runProcedure(connection, cgi, files, doctable, procStatement, procBindings) {
	const HTBUF_LEN = 63;
	const MAX_IROWS = 100000;

	let irows = MAX_IROWS;
	let sql = [],
		bind = {
			cgicount: {dir: oracle.BIND_IN, type: oracle.NUMBER, val: 0},
			cginames: {dir: oracle.BIND_IN, type: oracle.STRING, val: []},
			cgivalues: {dir: oracle.BIND_IN, type: oracle.STRING, val: []},
			htbuflen: {dir: oracle.BIND_IN, type: oracle.NUMBER, val: HTBUF_LEN},
			page: {dir: oracle.BIND_OUT, type: oracle.STRING, maxSize: 100, maxArraySize: irows},
			irows: {dir: oracle.BIND_INOUT, type: oracle.NUMBER, val: irows}
		};

	// debug
	debug('_runProcedure');

	// validate
	/* istanbul ignore if */
	if (arguments.length !== 6 || !_.isObject(connection) || !_.isObject(cgi) || !_.isArray(files) || !_.isString(doctable) || !_.isString(procStatement) || !_.isObject(procBindings)) {
		log.exit(new Error('invalid arguments'));
	}

	// BEGIN
	sql.push('BEGIN');

	// Ensure a stateless environment by resetting package state (dbms_session.reset_package)
	sql.push('dbms_session.modify_package_state(dbms_session.reinitialize);');

	// initialize the cgi
	sql.push('owa.init_cgi_env(:cgicount, :cginames, :cgivalues);');
	_.each(cgi, function (value, key) {
		bind.cgicount.val++;
		bind.cginames.val.push(key);
		bind.cgivalues.val.push(value);
	});

	// initialize the htp package
	sql.push('htp.init;');

	// set the HTBUF_LEN
	sql.push('htp.HTBUF_LEN := :htbuflen;');

	// execute the procedure
	sql.push('BEGIN');
	sql.push('   ' + procStatement);
	sql.push('EXCEPTION');
	sql.push('   WHEN OTHERS THEN');
	sql.push('      raise_application_error(-20000, \'Error executing ' + procStatement + '\'||CHR(10)||SUBSTR(dbms_utility.format_error_stack()||CHR(10)||dbms_utility.format_error_backtrace(), 1, 2000));');
	sql.push('END;');

	// bindings of the procedure
	bind = _.extend(bind, procBindings);

	// retrieve the page
	sql.push('owa.get_page(thepage=>:page, irows=>:irows);');

	// END
	sql.push('END;');

	// trace
	log.trace('B) A STORED PROCEDURE WILL BE INVOKED (database._runProcedure)', {sql: sql, bind: bind});

	return new Promise(function (resolve, reject) {
		// Execute the PL/SQL block
		oracle.execute(connection, sql.join('\n'), bind).then(function (result) {
			let err;

			// Make sure that we have retrieved all the rows
			/* istanbul ignore else */
			if (result.outBinds.irows <= MAX_IROWS) {
				resolve(_getPage(result));
			} else {
				err = new Error('Unable to retrieve all rows. irows=' + result.outBinds.irows);
				reject(err);
			}
		}).catch(/* istanbul ignore next */
			function (err) {
				reject(err);
			});
	});
}

/*
 *	Get the page as string from the bind result
 */
function _getPage(result) {
	debug('_getPage');

	let page = null;
	/* istanbul ignore else */
	if (_.isObject(result) && _.isObject(result.outBinds) && _.isArray(result.outBinds.page)) {
		page = result.outBinds.page.join('');
	}

	return page;
}

/*
 *	Retrieve the argument types for a given procedure to be executed.
 *	This is important because if the procedure is defined to take a PL/SQL indexed table,
 *	we must provise a table, even if there is only one argument to be submitted.
 */
function _getArguments(connection, proc) {
	const SQL = [
		'DECLARE',
		'	schemaName		VARCHAR2(32767);',
		'	part1			VARCHAR2(32767);',
		'	part2			VARCHAR2(32767);',
		'	dblink			VARCHAR2(32767);',
		'	objectType		NUMBER;',
		'	objectID		NUMBER;',
		'BEGIN',
		'	dbms_utility.name_resolve(name=>UPPER(:name), context=>1, schema=>schemaName, part1=>part1, part2=>part2, dblink=>dblink, part1_type=>objectType, object_number=>objectID);',
		'	IF (part1 IS NOT NULL) THEN',
		'		SELECT argument_name, data_type BULK COLLECT INTO :names, :types FROM all_arguments WHERE owner = schemaName AND package_name = part1 AND object_name = part2 AND argument_name IS NOT NULL ORDER BY overload, sequence;',
		'	ELSE',
		'		SELECT argument_name, data_type BULK COLLECT INTO :names, :types FROM all_arguments WHERE owner = schemaName AND package_name IS NULL AND object_name = part2 AND argument_name IS NOT NULL ORDER BY overload, sequence;',
		'	END IF;',
		'END;'
	];
	const MAX_PARAMETER_NUMBER = 1000;

	let bind = {
		name: {dir: oracle.BIND_IN, type: oracle.STRING, val: proc},
		names: {dir: oracle.BIND_OUT, type: oracle.STRING, maxSize: 60, maxArraySize: MAX_PARAMETER_NUMBER},
		types: {dir: oracle.BIND_OUT, type: oracle.STRING, maxSize: 60, maxArraySize: MAX_PARAMETER_NUMBER}
	};

	// debug
	debug('_getArguments');

	// validate
	/* istanbul ignore if */
	if (arguments.length !== 2 || !_.isObject(connection) || !_.isString(proc)) {
		log.exit(new Error('invalid arguments'));
	}

	return new Promise(function (resolve, reject) {
		oracle.execute(connection, SQL.join('\n'), bind).then(function (result) {
			let argTypes = [],
				i;

			if (_.isObject(result) && _.isObject(result.outBinds) && _.isArray(result.outBinds.names) && _.isArray(result.outBinds.types)) {
				for (i = 0; i < result.outBinds.names.length; i++) {
					argTypes[result.outBinds.names[i].toLowerCase()] = result.outBinds.types[i];
				}
			}

			//debug('_getArguments: argTypes for "' + proc + '"\n' + util.inspect(argTypes, {showHidden: false, depth: null, colors: true}));

			resolve(argTypes);
		}).catch(/* istanbul ignore next */
			function (err) {
				//debug('_getArguments: ERROR\n' + util.inspect(err, {showHidden: false, depth: null, colors: true}));
				log.error(err);
				reject(err);
			});
	});
}

/*
 *	Upload the given array of files and return a promise that resolves
 *	when all uploads have been finished.
 */
/* istanbul ignore next */
function _uploadFiles(connection, docTableName, files) {
	let promises = [];

	// If there are no files, just resolve the promise
	if (files.length === 0) {
		return Promise.resolve();
	}

	// Process the files
	_.each(files, function (file) {
		promises.push(_uploadFile(connection, docTableName, file));
	});

	// Return "combined" promise
	return Promise.all(promises);
}

/*
 *	Upload the given file and return a promise.
 */
/* istanbul ignore next */
function _uploadFile(connection, docTableName, file) {
	const SQL = 'INSERT INTO ' + docTableName + ' (name, mime_type, doc_size, dad_charset, last_updated, content_type, blob_content) VALUES (:name, :mime_type, :doc_size, \'ascii\', SYSDATE, \'BLOB\', EMPTY_BLOB()) RETURNING blob_content INTO :lobbv';
	const BIND = {
		'name': file.fieldValue,
		'mime_type': file.mimetype,
		'doc_size': file.size,
		'lobbv': {type: oracle.BLOB, dir: oracle.BIND_OUT}
	};
	const OPTIONS = {autoCommit: false};	// a transaction needs to span the INSERT and pipe()

	debug('_uploadFile "' + file.filename + '"');

	return new Promise(function (resolve, reject) {
		oracle.execute(connection, SQL, BIND, OPTIONS).then(function (result) {
			let lob,
				inStream;

			if (result.rowsAffected !== 1 || result.outBinds.lobbv.length !== 1) {
				reject('Error getting a LOB locator');
				return;
			}

			lob = result.outBinds.lobbv[0];

			lob.on('error', function (err) {
				reject('lob.on "error" event: ' + err.message);
			});

			lob.on('finish', function () {
				debug('lob.on "finish" event');
				connection.commit(function (err) {
					if (err) {
						reject('commit error: ' + err.message);
					} else {
						debug('file "' + file.filename + '"uploaded successfully.');
						resolve();
					}
				});
			});

			debug('Reading from ' + file.physicalFilename);
			inStream = fs.createReadStream(file.physicalFilename);
			inStream.on('error', function (err) {
				reject('inStream.on "error" event: ' + err.message);
			});
			inStream.pipe(lob);  // copies the text to the BLOB
		});
	});
}

module.exports = {
	createConnectionPools: createConnectionPools,
	destroyConnectionPools: destroyConnectionPools,
	invoke: invoke
};
