export function initMetrics(): metricsType;
export function handlerMetrics(metrics: metricsType): RequestHandler;
export type RequestHandler = import("express").RequestHandler;
export type metricsType = import("./types.js").metricsType;
