import http from 'node:http';
import https from 'node:https';
import { type Express } from 'express';
import { type configType } from '../types.ts';
import { type Pool } from '../util/oracle.ts';
export type webServer = {
    config: configType;
    connectionPools: Pool[];
    app: Express;
    server: http.Server | https.Server;
    shutdown: () => Promise<void>;
};
export type sslConfig = {
    keyFilename: string;
    certFilename: string;
};
/**
 * Create HTTPS server.
 * @param app - express application
 * @param ssl - ssl configuration.
 * @returns server
 */
export declare const createServer: (app: Express, ssl?: sslConfig) => http.Server | https.Server;
/**
 * Start server.
 * @param config - The config.
 * @param ssl - ssl configuration.
 * @returns Promise resolving to the web server object.
 */
export declare const startServer: (config: configType, ssl?: sslConfig) => Promise<webServer>;
/**
 * Load configuration.
 * @param filename - The configuration filename.
 * @returns Promise.
 */
export declare const loadConfig: (filename?: string) => configType;
/**
 * Start server from config file.
 * @param filename - The configuration filename.
 * @param ssl - ssl configuration.
 * @returns Promise resolving to the web server object.
 */
export declare const startServerConfig: (filename?: string, ssl?: sslConfig) => Promise<webServer>;
