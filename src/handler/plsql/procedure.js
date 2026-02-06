/*
 *	Invoke the Oracle procedure and return the raw content of the page
 */

import debugModule from 'debug';
const debug = debugModule('webplsql:procedure');

import oracledb from 'oracledb';
import stream from 'node:stream';
import z from 'zod';

import {uploadFile} from './upload.js';
import {getProcedureVariable} from './procedureVariable.js';
import {getProcedureNamed} from './procedureNamed.js';
import {parsePage} from './parsePage.js';
import {sendResponse} from './sendResponse.js';
import {ProcedureError} from './procedureError.js';
import {inspect, getBlock} from '../../util/trace.js';
import {errorToString} from '../../util/errorToString.js';
import {sanitizeProcName} from './procedureSanitize.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('oracledb').Connection} Connection
 * @typedef {import('oracledb').Result<unknown>} Result
 * @typedef {import('../../types.js').argObjType} argObjType
 * @typedef {import('../../types.js').fileUploadType} fileUploadType
 * @typedef {import('../../types.js').environmentType} environmentType
 * @typedef {import('../../types.js').configPlSqlHandlerType} configPlSqlHandlerType
 * @typedef {import('../../types.js').BindParameterConfig} BindParameterConfig
 */

/**
 *	Get the procedure and arguments to execute
 *	@param {Request} req - The req object represents the HTTP request. (only used for debugging)
 *	@param {string} procName - The procedure to execute
 *	@param {argObjType} argObj - The arguments to pass to the procedure
 *	@param {configPlSqlHandlerType} options - The options for the middleware
 *	@param {Connection} databaseConnection - The database connection
 *	@returns {Promise<{sql: string; bind: BindParameterConfig}>} - The SQL statement and bindings for the procedure to execute
 */
const getProcedure = async (req, procName, argObj, options, databaseConnection) => {
	// path alias
	if (options.pathAlias?.toLowerCase() === procName.toLowerCase()) {
		debug(`getProcedure: path alias "${options.pathAlias}" redirects to "${options.pathAliasProcedure}"`);
		return {
			sql: `${options.pathAliasProcedure}(p_path=>:p_path)`,
			bind: {
				p_path: {dir: oracledb.BIND_IN, type: oracledb.STRING, val: procName},
			},
		};
	}

	// check if we use variable arguments
	const useVariableArguments = procName.startsWith('!');

	// sanitize procedure name
	const sanitizedProcName = await sanitizeProcName(useVariableArguments ? procName.substring(1) : procName, databaseConnection, options);

	// run procedure
	if (useVariableArguments) {
		return getProcedureVariable(req, sanitizedProcName, argObj);
	} else {
		return await getProcedureNamed(req, sanitizedProcName, argObj, databaseConnection);
	}
};

/**
 * Prepare procedure
 *
 * NOTE:
 * 	1) dbms_session.modify_package_state(dbms_session.reinitialize) is used to ensure a stateless environment by resetting package state (dbms_session.reset_package)
 *
 * @param {environmentType} cgiObj - The cgi of the procedure to invoke.
 * @param {Connection} databaseConnection - Database connection.
 * @returns {Promise<void>} Promise resolving to void.
 */
const procedurePrepare = async (cgiObj, databaseConnection) => {
	let sqlStatement = 'BEGIN dbms_session.modify_package_state(dbms_session.reinitialize); END;';
	try {
		await databaseConnection.execute(sqlStatement);
	} catch (err) {
		throw new ProcedureError(`procedurePrepare: error when preparing procedure\n${errorToString(err)}`, cgiObj, sqlStatement, {});
	}

	// htbuf_len: reduce this limit based on your worst-case character size.
	// For most character sets, this will be 2 bytes per character, so the limit would be 127.
	// For UTF8 Unicode, it's 3 bytes per character, meaning the limit should be 85.
	// For the newer AL32UTF8 Unicode, it's 4 bytes per character, and the limit should be 63.
	sqlStatement = 'BEGIN owa.init_cgi_env(:cgicount, :cginames, :cgivalues); htp.init; htp.htbuf_len := 63; END;';
	/** @type {BindParameterConfig} */
	const bindParameter = {
		cgicount: {dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: Object.keys(cgiObj).length},
		cginames: {dir: oracledb.BIND_IN, type: oracledb.STRING, val: Object.keys(cgiObj)},
		cgivalues: {dir: oracledb.BIND_IN, type: oracledb.STRING, val: Object.values(cgiObj)},
	};
	try {
		await databaseConnection.execute(sqlStatement, bindParameter);
	} catch (err) {
		throw new ProcedureError(`procedurePrepare: error when preparing procedure\n${errorToString(err)}`, cgiObj, sqlStatement, bindParameter);
	}
};

/**
 * Execute procedure
 *
 * @param {{sql: string; bind: BindParameterConfig}} para - The statement and binding to use when executing the procedure.
 * @param {Connection} databaseConnection - Database connection.
 * @returns {Promise<void>} Promise resolving to void.
 */
const procedureExecute = async (para, databaseConnection) => {
	const sqlStatement = `BEGIN ${para.sql}; END;`;

	try {
		await databaseConnection.execute(sqlStatement, para.bind);
	} catch (err) {
		throw new ProcedureError(`procedureExecute: error when executing procedure:\n${sqlStatement}\n${errorToString(err)}`, {}, para.sql, para.bind);
	}
};

/**
 * Get page from procedure
 *
 * @param {boolean} test - Test.
 * @param {Connection} databaseConnection - Database connection.
 * @returns {Promise<string>} Promise resolving to the returned page content.
 */
const procedureGetPage = async (test, databaseConnection) => {
	const MAX_IROWS = 100000;

	/** @type {BindParameterConfig} */
	const bindParameter = {
		lines: {dir: oracledb.BIND_OUT, type: oracledb.STRING, maxArraySize: MAX_IROWS},
		irows: {dir: oracledb.BIND_INOUT, type: oracledb.NUMBER, val: MAX_IROWS},
	};

	const sqlStatement = 'BEGIN owa.get_page(thepage=>:lines, irows=>:irows); END;';

	/** @type {Result} */
	let result = {};
	try {
		result = await databaseConnection.execute(sqlStatement, bindParameter);
	} catch (err) {
		if (debug.enabled) {
			debug(getBlock('procedureGetPage: results', inspect(result)));
		}

		throw new ProcedureError(`procedureGetPage: error when getting page returned by procedure\n${errorToString(err)}`, {}, sqlStatement, bindParameter);
	}

	const {lines, irows} = z.object({irows: z.number(), lines: z.array(z.string())}).parse(result.outBinds);

	// Make sure that we have retrieved all the rows
	if (irows > MAX_IROWS) {
		/* v8 ignore next - defensive check for row limit */
		throw new ProcedureError(`procedureGetPage: error when retrieving rows. irows="${irows}"`, {}, sqlStatement, bindParameter);
	}

	return lines.join('');
};

/**
 * Download files from procedure
 *
 * @param {oracledb.Lob} fileBlob - The blob eventually containing the file.
 * @param {Connection} databaseConnection - Database connection.
 * @returns {Promise<{fileType: string, fileSize: number, fileBlob: stream.Readable | null}>} Promise resolving to the result.
 */
const procedureDownloadFiles = async (fileBlob, databaseConnection) => {
	/** @type {BindParameterConfig} */
	const bindParameter = {
		fileType: {dir: oracledb.BIND_OUT, type: oracledb.STRING},
		fileSize: {dir: oracledb.BIND_OUT, type: oracledb.NUMBER},
		fileBlob: {dir: oracledb.BIND_INOUT, type: oracledb.BLOB, val: fileBlob},
	};

	const sqlStatement = `
DECLARE
	l_file_type		VARCHAR2(32767)	:= '';
	l_file_size		INTEGER			:= 0;
BEGIN
	IF (wpg_docload.is_file_download()) THEN
		wpg_docload.get_download_file(l_file_type);
		IF (l_file_type = 'B') THEN
			wpg_docload.get_download_blob(:fileBlob);
			l_file_size := dbms_lob.getlength(:fileBlob);
		END IF;
	END IF;
	:fileType := l_file_type;
	:fileSize := l_file_size;
END;
`;

	/** @type {Result | null} */
	let result = null;
	try {
		result = await databaseConnection.execute(sqlStatement, bindParameter);
	} catch (err) {
		if (debug.enabled) {
			debug(getBlock('procedureDownloadFiles: results', inspect(result)));
		}

		throw new ProcedureError(`procedureDownloadFiles: error when downloading files\n${errorToString(err)}`, {}, sqlStatement, bindParameter);
	}

	return z
		.object({
			fileType: z
				.string()
				.nullable()
				.transform((val) => val ?? ''),
			fileSize: z
				.number()
				.nullable()
				.transform((val) => val ?? 0),
			fileBlob: z.instanceof(stream.Readable).nullable(),
		})
		.parse(result.outBinds);
};

/**
 * Invoke the Oracle procedure and return the page content
 *
 * @param {Request} req - The req object represents the HTTP request.
 * @param {Response} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {argObjType} argObj - - The arguments of the procedure to invoke.
 * @param {environmentType} cgiObj - The cgi of the procedure to invoke.
 * @param {fileUploadType[]} filesToUpload - Array of files to be uploaded
 * @param {configPlSqlHandlerType} options - the options for the middleware.
 * @param {Connection} databaseConnection - Database connection.
 * @returns {Promise<void>} Promise resolving to the page content generated by the executed procedure
 */
export const invokeProcedure = async (req, res, argObj, cgiObj, filesToUpload, options, databaseConnection) => {
	debug('invokeProcedure: begin');

	// 1) upload files
	debug(`invokeProcedure: upload "${filesToUpload.length}" files`);
	if (filesToUpload.length > 0) {
		if (typeof options.documentTable === 'string' && options.documentTable.length > 0) {
			const {documentTable} = options;

			await Promise.all(filesToUpload.map((file) => uploadFile(file, documentTable, databaseConnection)));
		} else {
			console.warn(`Unable to upload "${filesToUpload.length}" files because the option ""doctable" has not been defined`);
		}
	}

	// 2) get procedure to execute and the arguments

	debug('invokeProcedure: get procedure to execute and the arguments');
	const para = await getProcedure(req, Array.isArray(req.params.name) ? req.params.name[0] : req.params.name, argObj, options, databaseConnection);

	// 3) prepare the session

	debug('invokeProcedure: prepare the session');
	await procedurePrepare(cgiObj, databaseConnection);

	// 4) execute the procedure

	debug('invokeProcedure: execute the session');
	await procedureExecute(para, databaseConnection);

	// 5) get the page returned from the procedure

	debug('invokeProcedure: get the page returned from the procedure');
	const lines = await procedureGetPage(true, databaseConnection);
	if (debug.enabled) {
		debug(getBlock('data', lines));
	}

	// 6) download files

	debug('invokeProcedure: download files');
	const fileBlob = await databaseConnection.createLob(oracledb.BLOB);

	try {
		const fileDownload = await procedureDownloadFiles(fileBlob, databaseConnection);
		if (debug.enabled) {
			debug(getBlock('fileDownload', inspect({fileType: fileDownload.fileType, fileSize: fileDownload.fileSize})));
		}

		// 7) parse the page

		debug('invokeProcedure: parse the page');
		const pageComponents = parsePage(lines);

		// add "Server" header
		pageComponents.head.server = cgiObj.SERVER_SOFTWARE;

		// add file download information
		if (fileDownload.fileType !== '' && fileDownload.fileSize > 0 && fileDownload.fileBlob !== null) {
			pageComponents.file.fileType = fileDownload.fileType;
			pageComponents.file.fileSize = fileDownload.fileSize;
			pageComponents.file.fileBlob = fileDownload.fileBlob;
		}

		// 8) send the page to browser

		debug('invokeProcedure: send the page to browser');
		await sendResponse(req, res, pageComponents);
	} finally {
		// 9) cleanup

		debug('invokeProcedure: cleanup');
		fileBlob.destroy();
	}

	debug('invokeProcedure: end');
};
