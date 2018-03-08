// @flow

/*
*	Process file uploads
*/

const path = require('path');
const fs = require('fs');

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
	const files = [];

	// are there any files
	if (typeof req.files !== 'object') {
		return files;
	}

	// process the files
	for (const key in req.files) {
		const file = req.files[key];

		if (typeof file.originalFilename === 'string' && file.originalFilename.length > 0) {
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
	}

	return files;
}

/**
* Upload the given array of files and return a promise that resolves when all uploads have been finished.
*
* @param {Array<string>} files - array of file path's.
* @param {string} docTableName - name of the oracle table holding the uploaded files.
* @param {oracledb$connection} databaseConnection - Database connection.
* @returns {Promise<void>} - Promise that resolves when the request has been fullfilled.
*/
function uploadFiles(files: filesUploadType, docTableName: string, databaseConnection: oracledb$connection) {
	return Promise.all(files.map(file => uploadFile(file, docTableName, databaseConnection)));
}

/*
*	Upload the given file and return a promise.
*/
function uploadFile(file: fileUploadType, docTableName: string, databaseConnection: oracledb$connection): Promise<void> {
	return new Promise((resolve, reject) => {
		if (typeof docTableName !== 'string' || docTableName.length === 0) {
			reject(new Error('The option "docTableName" has not been defined or the name is empty'));
		}

		let blobContent;
		try {
			blobContent = fs.readFileSync(file.physicalFilename);
		} catch (e) {
			reject(new Error(`Unable to read file "${file.physicalFilename}"\n` + e.toString()));
			return;
		}

		const sql = `INSERT INTO ${docTableName} (name, mime_type, doc_size, dad_charset, last_updated, content_type, blob_content) VALUES (:name, :mime_type, :doc_size, 'ascii', SYSDATE, 'BLOB', :blob_content)`;
		const bind = {
			'name': file.fieldValue,
			'mime_type': file.mimetype,
			'doc_size': file.size,
			'blob_content': blobContent
		};

		databaseConnection.execute(sql, bind, {autoCommit: true})
			.then(result => {
				if (result.rowsAffected !== 1) {
					reject(new Error(`Invalid number of affected rows "${result.rowsAffected}"`));
				} else {
					resolve();
				}

			}).catch(e => {
				reject(new Error(`Unable to insert file "${file.physicalFilename}"\n` + e.toString()));
			});
	});
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
