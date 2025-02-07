export function getProcedureVariable(procName: string, argObj: argObjType, databaseConnection: Connection, options: configPlSqlType): Promise<{
    sql: string;
    bind: BindParameterConfig;
}>;
export type Connection = import("oracledb").Connection;
export type Result = import("oracledb").Result<unknown>;
export type configPlSqlType = import("./types.js").configPlSqlType;
export type argObjType = import("./types.js").argObjType;
export type BindParameterConfig = import("./types.js").BindParameterConfig;
