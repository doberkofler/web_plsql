import type { Request } from 'express';
import type { Connection, BindParameter } from 'oracledb';
import type { argObjType, BindParameterConfig } from '../../types.ts';
import type { ArgumentCache } from './request.ts';
/**
 *	Get the bindling for an argument.
 *	@param argName - The argument name.
 *	@param argValue - The argument value.
 *	@param argType - The argument type.
 *	@returns The binding.
 */
export declare const getBinding: (argName: string, argValue: unknown, argType: string) => BindParameter;
/**
 *	Get the sql statement and bindings for the procedure to execute for a fixed number of arguments
 *	@param req - The req object represents the HTTP request. (only used for debugging)
 *	@param procName - The procedure to execute
 *	@param argObj - The arguments to pass to the procedure
 *	@param databaseConnection - The database connection
 *	@param argumentCache - The argument cache.
 *	@returns The SQL statement and bindings for the procedure to execute
 */
export declare const getProcedureNamed: (req: Request, procName: string, argObj: argObjType, databaseConnection: Connection, argumentCache: ArgumentCache) => Promise<{
    sql: string;
    bind: BindParameterConfig;
}>;
