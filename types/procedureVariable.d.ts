export function getProcedureVariable(procedure: string, argObj: argObjType): {
    sql: string;
    bind: BindParameterConfig;
};
export type Result = import("oracledb").Result<unknown>;
export type argObjType = import("./types.js").argObjType;
export type BindParameterConfig = import("./types.js").BindParameterConfig;
