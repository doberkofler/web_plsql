import { type Connection } from 'oracledb';
import type { Request } from 'express';
import type { fileUploadType } from '../../types.ts';
/**
 * Get the files
 *
 * @param req - The req object represents the HTTP request.
 * @returns Promise that resolves with an array of files to be uploaded.
 */
export declare const getFiles: (req: Request) => fileUploadType[];
/**
 * Upload the given file and return a promise.
 *
 * @param file - The file to upload.
 * @param doctable - The file to upload.
 * @param databaseConnection - The file to upload.
 * @returns Promise that resolves when uploaded.
 */
export declare const uploadFile: (file: fileUploadType, doctable: string, databaseConnection: Connection) => Promise<void>;
