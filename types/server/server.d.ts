export function createServer(app: Express, ssl?: sslConfig): http.Server | https.Server;
export function startServer(config: configType, ssl?: sslConfig): Promise<http.Server | https.Server>;
export function loadConfig(filename?: string): configType;
export function startServerConfig(filename?: string, ssl?: sslConfig): Promise<http.Server | https.Server>;
export type Socket = import("node:net").Socket;
export type Express = import("express").Express;
export type Request = import("express").Request;
export type Response = import("express").Response;
export type NextFunction = import("express").NextFunction;
export type Pool = import("oracledb").Pool;
export type environmentType = import("../types.js").environmentType;
export type configType = import("../types.js").configType;
/**
 * - server interface.
 */
export type Server = {
    /**
     * - native Node http(s) server instance.
     */
    server: http.Server | https.Server;
};
/**
 * - SSL configuration.
 */
export type sslConfig = {
    /**
     * - key filename.
     */
    keyFilename: string;
    /**
     * - cert filename.
     */
    certFilename: string;
};
import http from 'node:http';
import https from 'node:https';
