import type { Request, Response } from 'express';
import type { Pool } from 'oracledb';
import type { configPlSqlHandlerType, argsType } from '../../types.ts';
import type { Cache } from '../../util/cache.ts';
export type ProcedureNameCache = Cache<string>;
export type ArgumentCache = Cache<argsType>;
/**
 * Execute the request
 *
 * @param req - The req object represents the HTTP request.
 * @param res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param options - the options for the middleware.
 * @param connectionPool - The connection pool.
 * @param procedureNameCache - The procedure name cache.
 * @param argumentCache - The argument cache.
 * @returns Promise resolving to th page
 */
export declare const processRequest: (req: Request, res: Response, options: configPlSqlHandlerType, connectionPool: Pool, procedureNameCache: ProcedureNameCache, argumentCache: ArgumentCache) => Promise<void>;
