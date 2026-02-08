/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 */
/**
 * @typedef {import('../util/statsManager.js').Bucket} Bucket
 */
/**
 * @typedef {object} StatsSummary
 * @property {Date} startTime - Server start time.
 * @property {number} totalRequests - Total requests handled.
 * @property {number} totalErrors - Total errors encountered.
 * @property {number} avgResponseTime - Lifetime average response time.
 * @property {number} minResponseTime - Lifetime minimum response time.
 * @property {number} maxResponseTime - Lifetime maximum response time.
 * @property {number} maxRequestsPerSecond - Lifetime maximum requests per second.
 * @property {object} maxMemory - Lifetime memory extremes.
 * @property {number} maxMemory.heapUsedMax - Maximum heap used.
 * @property {number} maxMemory.heapTotalMax - Maximum heap total.
 * @property {number} maxMemory.rssMax - Maximum RSS.
 * @property {number} maxMemory.externalMax - Maximum external memory.
 * @property {object} cpu - Lifetime CPU extremes.
 * @property {number} cpu.max - Max CPU.
 * @property {number} cpu.userMax - Max user CPU.
 * @property {number} cpu.systemMax - Max system CPU.
 */
export const handlerAdmin: import("express-serve-static-core").Router;
export type Request = import("express").Request;
export type Response = import("express").Response;
export type NextFunction = import("express").NextFunction;
export type Bucket = import("../util/statsManager.js").Bucket;
export type StatsSummary = {
    /**
     * - Server start time.
     */
    startTime: Date;
    /**
     * - Total requests handled.
     */
    totalRequests: number;
    /**
     * - Total errors encountered.
     */
    totalErrors: number;
    /**
     * - Lifetime average response time.
     */
    avgResponseTime: number;
    /**
     * - Lifetime minimum response time.
     */
    minResponseTime: number;
    /**
     * - Lifetime maximum response time.
     */
    maxResponseTime: number;
    /**
     * - Lifetime maximum requests per second.
     */
    maxRequestsPerSecond: number;
    /**
     * - Lifetime memory extremes.
     */
    maxMemory: {
        heapUsedMax: number;
        heapTotalMax: number;
        rssMax: number;
        externalMax: number;
    };
    /**
     * - Lifetime CPU extremes.
     */
    cpu: {
        max: number;
        userMax: number;
        systemMax: number;
    };
};
