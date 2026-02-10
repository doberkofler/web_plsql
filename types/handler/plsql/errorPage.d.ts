import type { Request, Response } from 'express';
import type { configPlSqlHandlerType } from '../../types.ts';
/**
 * Show an error page
 *
 * @param req - The req object represents the HTTP request.
 * @param res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param options - The configuration options.
 * @param error - The error.
 */
export declare const errorPage: (req: Request, res: Response, options: configPlSqlHandlerType, error: unknown) => void;
