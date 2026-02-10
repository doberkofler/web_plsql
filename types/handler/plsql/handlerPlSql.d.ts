import { Cache } from '../../util/cache.ts';
import type { RequestHandler } from 'express';
import type { Pool } from 'oracledb';
import type { configPlSqlHandlerType, argsType } from '../../types.ts';
export type WebPlSqlRequestHandler = RequestHandler & {
    procedureNameCache: Cache<string>;
    argumentCache: Cache<argsType>;
};
/**
 * Express middleware.
 *
 * @param connectionPool - The connection pool.
 * @param config - The configuration options.
 * @returns The handler.
 */
export declare const handlerWebPlSql: (connectionPool: Pool, config: configPlSqlHandlerType) => WebPlSqlRequestHandler;
