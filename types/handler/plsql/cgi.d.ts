import type { Request } from 'express';
import type { environmentType } from '../../types.ts';
/**
 * Create a CGI object
 *
 * @param req - The req object represents the HTTP request.
 * @param doctable - The document table.
 * @param cgi - The additional cgi.
 * @returns CGI object
 */
export declare const getCGI: (req: Request, doctable: string, cgi: environmentType) => environmentType;
