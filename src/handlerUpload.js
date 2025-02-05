import path from 'node:path';
import multer from 'multer';

/**
 * @typedef {import('express').RequestHandler} RequestHandler
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 * @typedef {import('oracledb').Pool} Pool
 * @typedef {import('./types.js').environmentType} environmentType
 * @typedef {import('./types.js').configType} configType
 */

/**
 * Create the upload middleware.
 * @returns {RequestHandler} - Request handler.
 */
export const handlerUpload = () => {
	const upload = multer({
		storage: multer.diskStorage({
			destination: '/tmp/uploads',
			filename: (req, file, cb) => {
				const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
				cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
			},
		}),
		limits: {
			fileSize: 50 * 1024 * 1024, // 50MB limit
		},
	});

	return upload.any();
};
