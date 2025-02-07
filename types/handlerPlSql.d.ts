export function handlerWebPlSql(connectionPool: Pool, config: configPlSqlHandlerType): RequestHandler;
export type RequestHandler = import("express").RequestHandler;
export type Request = import("express").Request;
export type Response = import("express").Response;
export type NextFunction = import("express").NextFunction;
export type Pool = import("oracledb").Pool;
export type environmentType = import("./types.js").environmentType;
export type configPlSqlHandlerType = import("./types.js").configPlSqlHandlerType;
