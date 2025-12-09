export function getProcedureVariable(req: Request, procName: string, argObj: argObjType): {
    sql: string;
    bind: BindParameterConfig;
};
export type Request = import("express").Request;
export type Connection = import("oracledb").Connection;
export type Result = import("oracledb").Result<unknown>;
export type configPlSqlHandlerType = import("../../types.js").configPlSqlHandlerType;
export type argObjType = import("../../types.js").argObjType;
export type BindParameterConfig = import("../../types.js").BindParameterConfig;
