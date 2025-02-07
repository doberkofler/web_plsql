export function getProcedureNamed(procName: string, argObj: argObjType, databaseConnection: Connection, options: configPlSqlType): Promise<{
    sql: string;
    bind: BindParameterConfig;
}>;
export type argsType = Record<string, string>;
export type cacheEntryType = {
    hitCount: number;
    args: argsType;
};
export type Connection = import("oracledb").Connection;
export type Result = import("oracledb").Result<unknown>;
export type configPlSqlType = import("./types.js").configPlSqlType;
export type argObjType = import("./types.js").argObjType;
export type BindParameterConfig = import("./types.js").BindParameterConfig;
