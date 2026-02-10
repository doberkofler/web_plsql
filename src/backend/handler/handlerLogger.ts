import debugModule from 'debug';
const debug = debugModule('webplsql:handlerLogger');

import fs from 'node:fs';
import path from 'node:path';
import morgan from 'morgan';
import type {RequestHandler} from 'express';

/**
 * Create the upload middleware.
 * @param filename - Output filename.
 * @returns Request handler.
 */
export const handlerLogger = (filename: string): RequestHandler => {
	debug('register');

	return morgan('combined', {stream: fs.createWriteStream(path.join(process.cwd(), filename), {flags: 'a'})});
};
