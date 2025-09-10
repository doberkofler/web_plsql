export function initMetrics(): metricsType;
export function handlerMetrics(metrics: metricsType): RequestHandler;
export type RequestHandler = import("express").RequestHandler;
export type metricsType = {
    /**
     * - When was the server started.
     */
    started: Date;
    /**
     * - Total number of requests.
     */
    totalRequests: number;
    /**
     * - Total amount of time in ms in request.
     */
    totalRequestDuration: number;
    /**
     * - Min amount of time in ms in request.
     */
    minRequestDuration: number;
    /**
     * - Max amount of time in ms in request.
     */
    maxRequestDuration: number;
};
