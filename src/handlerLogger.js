import debugModule from 'debug';
const debug = debugModule('webplsql:handlerLogger');

import fs from 'node:fs';
import path from 'node:path';
import morgan from 'morgan';

/**
 * @typedef {import('express').RequestHandler} RequestHandler
 */

/**
 * Create the upload middleware.
 * @param {string} filename - Output filename.
 * @returns {RequestHandler} - Request handler.
 */
export const handlerLogger = (filename) => {
	debug('register');

	return morgan('combined', {stream: fs.createWriteStream(path.join(process.cwd(), filename), {flags: 'a'})});
};
