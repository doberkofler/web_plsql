/*
 *	Invoke the Oracle procedure and return the raw content of the page
 */

import debugModule from 'debug';
const debug = debugModule('webplsql:procedure');

import {DB} from '../../util/db.ts';
import stream from 'node:stream';
import z from 'zod';

import {uploadFile} from './upload.ts';
import {getProcedureVariable} from './procedureVariable.ts';
import {getProcedureNamed} from './procedureNamed.ts';
import {parsePage} from './parsePage.ts';
import {sendResponse} from './sendResponse.ts';
import {ProcedureError} from './procedureError.ts';
import {RequestError} from './requestError.ts';
import {inspect, getBlock} from '../../util/trace.ts';
import {errorToString} from '../../util/errorToString.ts';
import {sanitizeProcName} from './procedureSanitize.ts';
import {OWAPageStream} from './owaPageStream.ts';
import {traceManager} from '../../util/traceManager.ts';
import type {procedureTraceEntry} from '../../../frontend/types.ts';
import type {Request, Response} from 'express';
import type {Connection, Result, Lob} from '../../util/db.ts';
import type {argObjType, fileUploadType, environmentType, configPlSqlHandlerType, BindParameterConfig, ProcedureNameCache, ArgumentCache} from '../../types.ts';

/**
 *	Get the procedure and arguments to execute
 *	@param req - The req object represents the HTTP request. (only used for debugging)
 *	@param procName - The procedure to execute
 *	@param argObj - The arguments to pass to the procedure
 *	@param options - The options for the middleware
 *	@param databaseConnection - The database connection
 *	@param procedureNameCache - The procedure name cache.
 *	@param argumentCache - The argument cache.
 *	@returns The SQL statement and bindings for the procedure to execute
 */
const getProcedure = async (
	req: Request,
	procName: string,
	argObj: argObjType,
	options: configPlSqlHandlerType,
	databaseConnection: Connection,
	procedureNameCache: ProcedureNameCache,
	argumentCache: ArgumentCache,
): Promise<{sql: string; bind: BindParameterConfig; resolvedName?: string}> => {
	// path alias
	if (options.pathAlias?.toLowerCase() === procName.toLowerCase()) {
		/* v8 ignore start */
		debug(`getProcedure: path alias "${options.pathAlias}" redirects to "${options.pathAliasProcedure}"`);
		/* v8 ignore stop */
		return {
			sql: `${options.pathAliasProcedure}(p_path=>:p_path)`,
			bind: {
				p_path: {dir: DB.BIND_IN, type: DB.STRING, val: procName},
			},
		};
	}

	// check if we use variable arguments
	const useVariableArguments = procName.startsWith('!');

	// sanitize procedure name
	const rawName = useVariableArguments ? procName.substring(1) : procName;
	const sanitizedProcName = await sanitizeProcName(rawName, databaseConnection, options, procedureNameCache);

	// run procedure
	if (useVariableArguments) {
		return {
			...getProcedureVariable(req, sanitizedProcName, argObj),
			resolvedName: sanitizedProcName,
		};
	} else {
		return {
			...(await getProcedureNamed(req, sanitizedProcName, argObj, databaseConnection, argumentCache)),
			resolvedName: sanitizedProcName,
		};
	}
};

/**
 * Prepare procedure
 *
 * NOTE:
 * 	1) dbms_session.modify_package_state(dbms_session.reinitialize) is used to ensure a stateless environment by resetting package state (dbms_session.reset_package)
 *
 * @param cgiObj - The cgi of the procedure to invoke.
 * @param databaseConnection - Database connection.
 * @returns Promise resolving to void.
 */
const procedurePrepare = async (cgiObj: environmentType, databaseConnection: Connection): Promise<void> => {
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
	const bindParameter: BindParameterConfig = {
		cgicount: {dir: DB.BIND_IN, type: DB.NUMBER, val: Object.keys(cgiObj).length},
		cginames: {dir: DB.BIND_IN, type: DB.STRING, val: Object.keys(cgiObj)},
		cgivalues: {dir: DB.BIND_IN, type: DB.STRING, val: Object.values(cgiObj)},
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
 * @param para - The statement and binding to use when executing the procedure.
 * @param para.sql - The SQL statement.
 * @param para.bind - The bind parameters.
 * @param databaseConnection - Database connection.
 * @returns Promise resolving to void.
 */
const procedureExecute = async (para: {sql: string; bind: BindParameterConfig}, databaseConnection: Connection): Promise<void> => {
	const sqlStatement = `BEGIN ${para.sql}; END;`;

	try {
		await databaseConnection.execute(sqlStatement, para.bind);
	} catch (err) {
		throw new ProcedureError(`procedureExecute: error when executing procedure:\n${sqlStatement}\n${errorToString(err)}`, {}, para.sql, para.bind);
	}
};

/**
 * Download files from procedure
 *
 * @param fileBlob - The blob eventually containing the file.
 * @param databaseConnection - Database connection.
 * @returns Promise resolving to the result.
 */
const procedureDownloadFiles = async (
	fileBlob: Lob,
	databaseConnection: Connection,
): Promise<{fileType: string; fileSize: number; fileBlob: stream.Readable | null}> => {
	const bindParameter: BindParameterConfig = {
		fileType: {dir: DB.BIND_OUT, type: DB.STRING},
		fileSize: {dir: DB.BIND_OUT, type: DB.NUMBER},
		fileBlob: {dir: DB.BIND_INOUT, type: DB.BLOB, val: fileBlob},
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

	let result: Result | null = null;
	try {
		result = await databaseConnection.execute(sqlStatement, bindParameter);
	} catch (err) {
		/* v8 ignore start */
		if (debug.enabled) {
			debug(getBlock('procedureDownloadFiles: results', inspect(result)));
		}
		/* v8 ignore stop */

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
 * @param req - The req object represents the HTTP request.
 * @param res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param argObj - - The arguments of the procedure to invoke.
 * @param cgiObj - The cgi of the procedure to invoke.
 * @param filesToUpload - Array of files to be uploaded
 * @param options - the options for the middleware.
 * @param databaseConnection - Database connection.
 * @param procedureNameCache - The procedure name cache.
 * @param argumentCache - The argument cache.
 * @returns Promise resolving to the page content generated by the executed procedure
 */
export const invokeProcedure = async (
	req: Request,
	res: Response,
	argObj: argObjType,
	cgiObj: environmentType,
	filesToUpload: fileUploadType[],
	options: configPlSqlHandlerType,
	databaseConnection: Connection,
	procedureNameCache: ProcedureNameCache,
	argumentCache: ArgumentCache,
): Promise<void> => {
	debug('invokeProcedure: begin');

	const startTime = Date.now();
	let traceData: procedureTraceEntry | null = null;

	if (traceManager.isEnabled()) {
		traceData = {
			id: Math.random().toString(36).substring(2, 15),
			timestamp: new Date().toISOString(),
			source: cgiObj.REMOTE_ADDR ?? '',
			url: req.originalUrl,
			method: req.method,
			status: 'pending',
			duration: 0,
			cgi: cgiObj,
			headers: req.headers as Record<string, string>,
			cookies: req.cookies,
			uploads: filesToUpload.map((f) => ({
				originalname: f.originalname,
				mimetype: f.mimetype,
				size: f.size,
			})),
		};
	}

	try {
		// 1) upload files
		debug(`invokeProcedure: upload "${filesToUpload.length}" files`);
		if (filesToUpload.length > 0) {
			if (typeof options.documentTable === 'string' && options.documentTable.length > 0) {
				const {documentTable} = options;

				await Promise.all(filesToUpload.map((file) => uploadFile(file, documentTable, databaseConnection)));
			} else {
				// FIXME: this should be standartized
				console.warn(`Unable to upload "${filesToUpload.length}" files because the option ""doctable" has not been defined`);
			}
		}

		// 2) get procedure to execute and the arguments

		debug('invokeProcedure: get procedure to execute and the arguments');
		// Extract the raw procedure name from params
		const rawProcName = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
		if (!rawProcName) {
			throw new RequestError('No procedure name provided');
		}
		const para = await getProcedure(req, rawProcName, argObj, options, databaseConnection, procedureNameCache, argumentCache);

		if (traceData) {
			traceData.procedure = para.resolvedName;
			traceData.parameters = para.bind as Record<string, unknown> | unknown[];
		}

		// 3) prepare the session

		debug('invokeProcedure: prepare the session');
		await procedurePrepare(cgiObj, databaseConnection);

		// 4) execute the procedure

		debug('invokeProcedure: execute the session');
		try {
			await procedureExecute(para, databaseConnection);
		} catch (err) {
			// Invalidation Logic
			if (err instanceof ProcedureError) {
				const errorString = err.toString();
				// Check for ORA-04068, ORA-04061, ORA-04065, ORA-06550
				if (
					errorString.includes('ORA-04068') ||
					errorString.includes('ORA-04061') ||
					errorString.includes('ORA-04065') ||
					errorString.includes('ORA-06550')
				) {
					debug(`invokeProcedure: detected invalidation error (${errorString}). Clearing caches.`);

					// Clear name resolution cache for the input name
					if (rawProcName) {
						procedureNameCache.delete(rawProcName);
					}

					// Clear argument cache for the resolved name
					if (para.resolvedName) {
						argumentCache.delete(para.resolvedName.toUpperCase());
					}
				}
			}
			throw err;
		}

		// 5) get the page returned from the procedure
		debug('invokeProcedure: get the page returned from the procedure');

		const streamInstance = new OWAPageStream(databaseConnection);
		const lines = await streamInstance.fetchChunk();

		/* v8 ignore start */
		if (debug.enabled) {
			debug(getBlock('data', lines.join('')));
		}
		/* v8 ignore stop */

		// 6) download files

		debug('invokeProcedure: download files');
		const fileBlob = await databaseConnection.createLob(DB.BLOB);

		try {
			const fileDownload = await procedureDownloadFiles(fileBlob, databaseConnection);
			/* v8 ignore start */
			if (debug.enabled) {
				debug(getBlock('fileDownload', inspect({fileType: fileDownload.fileType, fileSize: fileDownload.fileSize})));
			}
			/* v8 ignore stop */

			// 7) parse the page

			debug('invokeProcedure: parse the page');
			// We parse the headers from the first chunk
			const pageComponents = parsePage(lines.join(''));

			// add "Server" header
			pageComponents.head.server = cgiObj.SERVER_SOFTWARE ?? '';

			// add file download information
			if (fileDownload.fileType !== '' && fileDownload.fileSize > 0 && fileDownload.fileBlob !== null) {
				pageComponents.file.fileType = fileDownload.fileType;
				pageComponents.file.fileSize = fileDownload.fileSize;
				pageComponents.file.fileBlob = fileDownload.fileBlob;

				if (traceData) {
					traceData.downloads = {
						fileType: fileDownload.fileType,
						fileSize: fileDownload.fileSize,
					};
				}
			} else {
				// For normal pages, we use the stream.
				// Prepend the initial body (parsed by parsePage) to the stream
				if (typeof pageComponents.body === 'string' && pageComponents.body.length > 0) {
					streamInstance.addBody(pageComponents.body);
				}
				// Use the stream as the body
				pageComponents.body = streamInstance;

				if (traceData) {
					// Buffer HTML if tracing enabled
					let htmlBuffer = typeof pageComponents.body === 'string' ? pageComponents.body : lines.join('');
					const MAX_HTML_SIZE = 1024 * 1024; // 1MB

					const originalPush = streamInstance.push.bind(streamInstance);
					streamInstance.push = (chunk) => {
						if (chunk !== null && htmlBuffer.length < MAX_HTML_SIZE) {
							const str = String(chunk);
							htmlBuffer += str;
							if (htmlBuffer.length > MAX_HTML_SIZE) {
								htmlBuffer = htmlBuffer.substring(0, MAX_HTML_SIZE) + '... [truncated]';
							}
						}
						return originalPush(chunk);
					};

					// Since we can't easily wait for the stream to finish here without blocking,
					// we'll have to finalize traceData when the stream ends.
					const currentTrace = traceData;
					streamInstance.on('end', () => {
						currentTrace.html = htmlBuffer;
						currentTrace.status = 'success';
						currentTrace.duration = Date.now() - startTime;
						traceManager.addTrace(currentTrace);
					});
					streamInstance.on('error', (err) => {
						currentTrace.status = 'fail';
						currentTrace.error = err instanceof Error ? err.message : String(err);
						currentTrace.duration = Date.now() - startTime;
						traceManager.addTrace(currentTrace);
					});
				}
			}

			// 8) send the page to browser

			debug('invokeProcedure: send the page to browser');
			await sendResponse(req, res, pageComponents);

			if (traceData?.downloads) {
				traceData.status = 'success';
				traceData.duration = Date.now() - startTime;
				traceManager.addTrace(traceData);
			}
		} finally {
			// 9) cleanup

			debug('invokeProcedure: cleanup');
			fileBlob.destroy();
		}
	} catch (err) {
		if (traceData) {
			traceData.status = err instanceof ProcedureError ? 'error' : 'fail';
			traceData.error = err instanceof Error ? err.message : String(err);
			traceData.duration = Date.now() - startTime;
			traceManager.addTrace(traceData);
		}
		throw err;
	}

	debug('invokeProcedure: end');
};
