import type { RequestHandler } from 'express';
/**
 * Create the upload middleware.
 * @param uploadFileSizeLimit - Maximum size of each uploaded file in bytes or no limit if omitted.
 * @returns Request handler.
 */
export declare const handlerUpload: (uploadFileSizeLimit?: number) => RequestHandler;
