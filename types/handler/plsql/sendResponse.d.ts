import type { Request, Response } from 'express';
import type { pageType } from '../../types.ts';
/**
 *	Send "default" response to the browser
 *	@param _req - The req object represents the HTTP request.
 *	@param res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 *	@param page - The page to send.
 */
export declare const sendResponse: (_req: Request, res: Response, page: pageType) => Promise<void>;
