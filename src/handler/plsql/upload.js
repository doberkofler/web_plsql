/*
 *	Process file uploads
 */

// eslint-disable @typescript-eslint/no-unused-vars

import debugModule from 'debug';
const debug = debugModule('webplsql:fileUpload');

import {readFile, removeFile} from '../../util/file.js';
import {errorToString} from '../../util/errorToString.js';
import oracledb from 'oracledb';
import z from 'zod';

const z$reqFiles = z.array(
	z.looseObject({
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
 * @typedef {import('express').Request} Request
 * @typedef {import('oracledb').Connection} Connection
 * @typedef {import('../../types.js').fileUploadType} fileUploadType
 */

/**
 * Get the files
 *
 * @param {Request} req - The req object represents the HTTP request.
 * @returns {fileUploadType[]} - Promise that resolves with an array of files to be uploaded.
 */
export const getFiles = (req) => {
	if (!('files' in req)) {
		debug('getFiles: no files');
		return [];
	}

	if (typeof req.files === 'object' && req.files !== null && Object.keys(req.files).length === 0) {
		debug('getFiles: no files');
		return [];
	}

	const files = z$reqFiles.parse(req.files);

	for (const file of files) {
		file.filename += `/${file.originalname}`;
	}

	debug('getFiles', files);

	return files;
};

/**
 * Upload the given file and return a promise.
 *
 * @param {fileUploadType} file - The file to upload.
 * @param {string} doctable - The file to upload.
 * @param {Connection} databaseConnection - The file to upload.
 * @returns {Promise<void>} - Promise that resolves when uploaded.
 */
export const uploadFile = async (file, doctable, databaseConnection) => {
	debug(`uploadFile`, file, doctable);

	/* istanbul ignore next */
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
			type: oracledb.BUFFER,
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
