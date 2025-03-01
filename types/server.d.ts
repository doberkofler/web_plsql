export function createServer(app: Express, useSSL: boolean, sslKeyFilename: string, sslCertFilename: string, port: number, connectionPool: Pool): void;
export function startServer(config: configType): Promise<void>;
export type Express = import("express").Express;
export type Request = import("express").Request;
export type Response = import("express").Response;
export type NextFunction = import("express").NextFunction;
export type Pool = import("oracledb").Pool;
export type environmentType = import("./types.js").environmentType;
export type configType = import("./types.js").configType;
