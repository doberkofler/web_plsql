import type { Connection, configPlSqlHandlerType } from '../../types.ts';
import type { ProcedureNameCache } from './request.ts';
/**
 * Sanitize the procedure name.
 *
 * @param procName - The procedure name.
 * @param databaseConnection - The database connection
 * @param options - the options for the middleware.
 * @param procedureNameCache - The procedure name cache.
 * @returns Promise resolving to final procedure name.
 */
export declare const sanitizeProcName: (procName: string, databaseConnection: Connection, options: configPlSqlHandlerType, procedureNameCache: ProcedureNameCache) => Promise<string>;
