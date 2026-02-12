/*
 *	Process file uploads
 */

import debugModule from 'debug';
const debug = debugModule('webplsql:fileUpload');

import {readFile, removeFile} from '../../util/file.ts';
import {errorToString} from '../../util/errorToString.ts';
import {DB, type Connection} from '../../util/db.ts';
import z from 'zod';
import type {Request} from 'express';
import type {fileUploadType} from '../../types.ts';

const z$reqFiles = z.array(
	z.strictObject({
		fieldname: z.string(),
		originalname: z.string(),
		encoding: z.string(),
		mimetype: z.string(),
		destination: z.string(),
		filename: z.string(),
		path: z.string(),
		size: z.number(),
	}),
);

/**
 * Get the files
 *
 * @param req - The req object represents the HTTP request.
 * @returns Promise that resolves with an array of files to be uploaded.
 */
export const getFiles = (req: Request): fileUploadType[] => {
	if (!('files' in req)) {
		debug('getFiles: no files');
		return [];
	}

	if (typeof req.files === 'object' && req.files !== null && Object.keys(req.files as object).length === 0) {
		debug('getFiles: no files');
		return [];
	}

	const files = z$reqFiles.parse(req.files) as fileUploadType[];

	for (const file of files) {
		file.filename += `/${file.originalname}`;
	}

	debug('getFiles', files);

	return files;
};

/**
 * Upload the given file and return a promise.
 *
 * @param file - The file to upload.
 * @param doctable - The file to upload.
 * @param databaseConnection - The file to upload.
 * @returns Promise that resolves when uploaded.
 */
export const uploadFile = async (file: fileUploadType, doctable: string, databaseConnection: Connection): Promise<void> => {
	debug(`uploadFile`, file, doctable);

	/* v8 ignore next - defensive validation */
	if (typeof doctable !== 'string' || doctable.length === 0) {
		throw new Error(`Unable to upload file "${file.filename}" because the option ""doctable" has not been defined`);
	}

	// read file
	let blobContent;
	try {
		blobContent = await readFile(file.path);
	} catch (err) {
		throw new Error(`Unable to load file "${file.path}".\n${errorToString(err)}`);
	}

	// insert file in document table
	const sql = `INSERT INTO ${doctable} (name, mime_type, doc_size, dad_charset, last_updated, content_type, blob_content) VALUES (:name, :mime_type, :doc_size, 'ascii', SYSDATE, 'BLOB', :blob_content)`;
	const bind = {
		name: file.filename,
		mime_type: file.mimetype,
		doc_size: file.size,
		blob_content: {
			val: blobContent,
			type: DB.BUFFER,
		},
	};
	try {
		await databaseConnection.execute(sql, bind, {autoCommit: true});
	} catch (err) {
		throw new Error(`Unable to insert file "${file.filename}".\n${errorToString(err)}`);
	}

	// remove the file
	try {
		await removeFile(file.path);
	} catch (err) {
		throw new Error(`Unable to remove file "${file.filename}".\n${errorToString(err)}`);
	}
};
