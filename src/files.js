// @flow

const debug = require('debug')('oracleExpressMiddleware:files');
const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const Database = require('./database');

export type fileUploadType = {
	fieldValue: string,
	filename: string,
	physicalFilename: string,
	encoding: string,
	mimetype: string,
	size: number
};
export type filesUploadType = Array<fileUploadType>;

let sequencialID = 0;

/**
* Get the files
*
* @param {$Request} req - The req object represents the HTTP request.
* @returns {Promise<filesUploadType>} - Promise that resolves with an array of files to be uploaded.
*/
function getFiles(req: $Request): filesUploadType {
	debug('getFiles: start');

	const files = [];

	// are there any files
	if (typeof req.files !== 'object') {
		return files;
	}

	_.forEach(req.files, (file) => {
		if (file.originalFilename && file.originalFilename.length > 0) {
			// get a temporary filename
			const filename = getRandomizedFilename(file.originalFilename);

			// Add the field
			file.filename = filename;

			// Add the file to upload
			files.push({
				fieldValue: filename,
				filename: file.originalFilename,
				physicalFilename: path.normalize(path.resolve(file.path)),
				encoding: '',
				mimetype: file.type,
				size: file.size
			});
		}
	});

	return files;
}

/**
* Upload the given array of files and return a promise that resolves when all uploads have been finished.
*
* @param {Array<string>} files - array of file path's.
* @param {string} docTableName - name of the oracle table holding the uploaded files.
* @param {Database} database - Database instance.
* @returns {Promise<void>} - Promise that resolves when the request has been fullfilled.
*/
function uploadFiles(files: filesUploadType, docTableName: string, database: Database) {
	return Promise.all(files.map((file) => uploadFile(file, docTableName, database)));
}

/*
*	Upload the given file and return a promise.
*/
async function uploadFile(file: fileUploadType, docTableName: string, database: Database): Promise<void> {
	debug('uploadFile', file);

	const sql = `INSERT INTO ${docTableName} (name, mime_type, doc_size, dad_charset, last_updated, content_type, blob_content) VALUES (:name, :mime_type, :doc_size, 'ascii', SYSDATE, 'BLOB', EMPTY_BLOB()) RETURNING blob_content INTO :lobbv`;
	const bind = {
		'name': file.fieldValue,
		'mime_type': file.mimetype,
		'doc_size': file.size,
		'lobbv': {type: Database.BLOB, dir: Database.BIND_OUT}
	};

	const result = await database.execute(sql, bind, {autoCommit: false});

	if (result.rowsAffected !== 1 || result.outBinds.lobbv.length !== 1) {
		throw new Error('Error getting a LOB locator');
	}

	const lob = result.outBinds.lobbv[0];

	lob.on('error', function (err) {
		throw new Error('lob.on "error" event: ' + err.message);
	});

	lob.on('finish', async () => {
		await database.commit();
		Promise.resolve();
	});

	const inStream = fs.createReadStream(file.physicalFilename);
	inStream.on('error', (err) => {
		throw new Error('inStream.on "error" event: ' + err.message);
	});

	inStream.pipe(lob);  // copies the text to the BLOB

	return Promise.resolve();
}

/*
*	get a randomized filename
*/
function getRandomizedFilename(filename: string): string {
	++sequencialID;
	return 'F' + (Date.now() + sequencialID).toString() + '/' + path.basename(filename);
}

module.exports = {
	getFiles: getFiles,
	uploadFiles: uploadFiles
};
