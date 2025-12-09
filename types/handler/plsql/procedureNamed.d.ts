export function getBinding(argName: string, argValue: unknown, argType: string): BindParameter;
export function getProcedureNamed(req: Request, procName: string, argObj: argObjType, databaseConnection: Connection): Promise<{
    sql: string;
    bind: BindParameterConfig;
}>;
export type Request = import("express").Request;
export type Connection = import("oracledb").Connection;
export type Result = import("oracledb").Result<unknown>;
export type configPlSqlHandlerType = import("../../types.js").configPlSqlHandlerType;
export type argObjType = import("../../types.js").argObjType;
export type BindParameterConfig = import("../../types.js").BindParameterConfig;
export type BindParameter = import("../../types.js").BindParameter;
export type argsType = Record<string, string>;
export type cacheEntryType = {
    hitCount: number;
    args: argsType;
};
