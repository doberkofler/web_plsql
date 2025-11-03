import multer from 'multer';

/**
 * @typedef {import('express').RequestHandler} RequestHandler
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 * @typedef {import('oracledb').Pool} Pool
 * @typedef {import('../types.js').environmentType} environmentType
 * @typedef {import('../types.js').configType} configType
 */

/**
 * Create the upload middleware.
 * @param {number} [uploadFileSizeLimit] - Maximum size of each uploaded file in bytes or no limit if omitted.
 * @returns {RequestHandler} - Request handler.
 */
export const handlerUpload = (uploadFileSizeLimit = Infinity) => {
	const upload = multer({
		storage: multer.diskStorage({}),
		limits: {
			fileSize: uploadFileSizeLimit,
		},
	});

	return upload.any();
};
