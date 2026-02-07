export namespace AdminContext {
    let startTime: Date;
    let config: configType | null;
    let pools: Pool[];
    let caches: Array<{
        poolName: string;
        procedureNameCache: Cache<string>;
        argumentCache: Cache<argsType>;
    }>;
    let paused: boolean;
    namespace metrics {
        let requestCount: number;
        let errorCount: number;
        let totalDuration: number;
    }
}
export function createServer(app: Express, ssl?: sslConfig): http.Server | https.Server;
export function startServer(config: configType, ssl?: sslConfig): Promise<webServer>;
export function loadConfig(filename?: string): configType;
export function startServerConfig(filename?: string, ssl?: sslConfig): Promise<webServer>;
export type Socket = import("node:net").Socket;
export type Express = import("express").Express;
export type Request = import("express").Request;
export type Response = import("express").Response;
export type NextFunction = import("express").NextFunction;
export type Pool = import("oracledb").Pool;
export type environmentType = import("../types.js").environmentType;
export type configType = import("../types.js").configType;
export type argsType = import("../handler/plsql/procedureNamed.js").argsType;
export type ExtendedRequestHandler = import("express").RequestHandler & {
    procedureNameCache: Cache<string>;
    argumentCache: Cache<argsType>;
};
/**
 * - Web server interface.
 */
export type webServer = {
    /**
     * - Configuration object.
     */
    config: configType;
    /**
     * - Oracle connection pools.
     */
    connectionPools: Pool[];
    /**
     * - Express app.
     */
    app: Express;
    /**
     * - Native Node http(s) server instance.
     */
    server: http.Server | https.Server;
    /**
     * - Shutdown function.
     */
    shutdown: () => Promise<void>;
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
import { Cache } from '../util/cache.js';
import http from 'node:http';
import https from 'node:https';
