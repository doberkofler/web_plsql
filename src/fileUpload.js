/*
 *	Process file uploads
 */

// eslint-disable @typescript-eslint/no-unused-vars

import debugModule from 'debug';
const debug = debugModule('webplsql:fileUpload');

import {readFile, unlink} from 'fs/promises';
import oracledb from 'oracledb';
import z from 'zod';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('oracledb').Connection} Connection
 * @typedef {import('./types.js').fileUploadType} fileUploadType
 */

/**
 * Get the files
 *
 * @param {Request} req - The req object represents the HTTP request.
 * @returns {fileUploadType[]} - Promise that resolves with an array of files to be uploaded.
 */
export const getFiles = (req) => {
	/** @type {fileUploadType[]} */
	const files = [];

	if (!('files' in req)) {
		return files;
	}

	if (typeof req.files === 'object' && req.files !== null && Object.keys(req.files).length === 0) {
		return files;
	}

	debug('req.files=', req.files);

	// validate
	const reqFiles = z
		.object({
			fieldname: z.string(),
			originalname: z.string(),
			encoding: z.string(),
			mimetype: z.string(),
			destination: z.string(),
			filename: z.string(),
			path: z.string(),
			size: z.number(),
		})
		.array()
		.parse(req.files);

	return reqFiles;
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
	/* istanbul ignore next */
	if (typeof doctable !== 'string' || doctable.length === 0) {
		console.warn(`Unable to upload file "${file.filename}" because the option ""doctable" has not been defined`);
		return;
	}

	let blobContent;
	try {
		blobContent = await readFile(file.path);
	} catch (err) {
		/* istanbul ignore next */
		throw new Error(`Unable to read file "${file.path}"\n${err instanceof Error ? err.toString() : ''}`);
	}

	const sql = `INSERT INTO ${doctable} (name, mime_type, doc_size, dad_charset, last_updated, content_type, blob_content) VALUES (:name, :mime_type, :doc_size, 'ascii', SYSDATE, 'BLOB', :blob_content)`;
	const bind = {
		name: file.fieldname,
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
		throw new Error(`Unable to insert file "${file.filename}"\n${err instanceof Error ? err.toString() : ''}`);
	}

	// remove the file
	try {
		await unlink(file.path);
	} catch (err) {
		/* istanbul ignore next */
		throw new Error(`Unable to remove file "${file.path}"\n${err instanceof Error ? err.toString() : ''}`);
	}
};
