/*
 *	Process file uploads
 */

// eslint-disable @typescript-eslint/no-unused-vars

import debugModule from 'debug';
const debug = debugModule('webplsql:fileUpload');

import path from 'node:path';
import fs from 'node:fs';
import oracledb from 'oracledb';
import z from 'zod';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('oracledb').Connection} Connection
 * @typedef {import('./types.js').fileUploadType} fileUploadType
 */

//let sequencialID = 1;

/**
 * Get a randomized filename
 * @param {string} filename - The filename to randomize.
 * @returns {string} - The randomized filename.
 */
//const getRandomizedFilename = (filename) => `F${(Date.now() + sequencialID++).toString()}/${path.basename(filename)}`;

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
			fieldName: z.string(),
			originalFilename: z.string(),
			path: z.string(),
			type: z.string(),
			size: z.number(),
		})
		.array()
		.parse(req.files);

	return reqFiles.map((e) => {
		/*
		// get a temporary filename
		const filename = getRandomizedFilename(e.originalFilename);

		// Add the field
		e.filename = filename;
		*/

		return {
			fieldValue: e.fieldName,
			filename: e.originalFilename,
			physicalFilename: path.normalize(path.resolve(e.path)),
			encoding: '',
			mimetype: e.type,
			size: e.size,
		};
	});
};

/**
 *	Upload the given file and return a promise.
 * @param {fileUploadType} file - The file to upload.
 * @param {string} docTableName - The file to upload.
 * @param {Connection} databaseConnection - The file to upload.
 * @returns {Promise<void>} - Promise that resolves when uploaded.
 */
export const uploadFile = async (file, docTableName, databaseConnection) => {
	/* istanbul ignore next */
	if (typeof docTableName !== 'string' || docTableName.length === 0) {
		throw new Error('The option "docTableName" has not been defined or the name is empty');
	}

	let blobContent;
	try {
		blobContent = fs.readFileSync(file.physicalFilename);
	} catch (err) {
		/* istanbul ignore next */
		throw new Error(`Unable to read file "${file.physicalFilename}"\n${err instanceof Error ? err.toString() : ''}`);
	}

	const sql = `INSERT INTO ${docTableName} (name, mime_type, doc_size, dad_charset, last_updated, content_type, blob_content) VALUES (:name, :mime_type, :doc_size, 'ascii', SYSDATE, 'BLOB', :blob_content)`;
	const bind = {
		name: file.fieldValue,
		mime_type: file.mimetype,
		doc_size: file.size,
		blob_content: {
			val: blobContent,
			type: oracledb.BUFFER,
		},
	};

	try {
		await databaseConnection.execute(sql, bind, {autoCommit: true});
	} catch (e) {
		throw new Error(`Unable to insert file "${file.physicalFilename}"\n${e instanceof Error ? e.toString() : ''}`);
	}
};

/**
 * Upload the given array of files and return a promise that resolves when all uploads have been finished.
 *
 * @param {fileUploadType[]} files - array of file path's.
 * @param {string} docTableName - name of the oracle table holding the uploaded files.
 * @param {Connection} databaseConnection - Database connection.
 * @returns {Promise<void>} - Promise that resolves when the request has been fullfilled.
 */
export const uploadFiles = async (files, docTableName, databaseConnection) => {
	await Promise.all(files.map((file) => uploadFile(file, docTableName, databaseConnection)));
};
