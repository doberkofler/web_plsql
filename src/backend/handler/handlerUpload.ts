import multer from 'multer';
import type {RequestHandler} from 'express';

/**
 * Create the upload middleware.
 * @param uploadFileSizeLimit - Maximum size of each uploaded file in bytes or no limit if omitted.
 * @returns Request handler.
 */
export const handlerUpload = (uploadFileSizeLimit?: number): RequestHandler => {
	const upload = multer({
		storage: multer.diskStorage({}),
		limits: {
			fileSize: uploadFileSizeLimit,
		},
	});

	return upload.any();
};
