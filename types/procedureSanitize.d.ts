export function sanitizeProcName(procName: string, databaseConnection: Connection, options: configPlSqlHandlerType): Promise<string>;
export type Request = import("express").Request;
export type Response = import("express").Response;
export type Connection = import("oracledb").Connection;
export type Result = import("oracledb").Result<unknown>;
export type argObjType = import("./types.js").argObjType;
export type fileUploadType = import("./types.js").fileUploadType;
export type environmentType = import("./types.js").environmentType;
export type configPlSqlHandlerType = import("./types.js").configPlSqlHandlerType;
export type BindParameterConfig = import("./types.js").BindParameterConfig;
export type cacheEntryType = {
    hitCount: number;
    valid: boolean;
};
