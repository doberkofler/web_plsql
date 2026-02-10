import type { RequestHandler } from 'express';
/**
 * Create the upload middleware.
 * @param filename - Output filename.
 * @returns Request handler.
 */
export declare const handlerLogger: (filename: string) => RequestHandler;
