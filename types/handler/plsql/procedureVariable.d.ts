import type { Request } from 'express';
import type { argObjType, BindParameterConfig } from '../../types.ts';
/**
 *	Get the sql statement and bindings for the procedure to execute for a variable number of arguments
 *	@param _req - The req object represents the HTTP request. (only used for debugging)
 *	@param procName - The procedure to execute
 *	@param argObj - The arguments to pass to the procedure
 *	@returns The SQL statement and bindings for the procedure to execute
 */
export declare const getProcedureVariable: (_req: Request, procName: string, argObj: argObjType) => {
    sql: string;
    bind: BindParameterConfig;
};
