export function handlerUpload(): RequestHandler;
export type RequestHandler = import("express").RequestHandler;
export type Response = import("express").Response;
export type NextFunction = import("express").NextFunction;
export type Pool = import("oracledb").Pool;
export type environmentType = import("../types.js").environmentType;
export type configType = import("../types.js").configType;
