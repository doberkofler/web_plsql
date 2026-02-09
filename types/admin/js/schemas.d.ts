import { z } from 'zod';
/**
 * Cache statistics schema.
 */
export declare const cacheStatsSchema: z.ZodObject<{
    size: z.ZodNumber;
    hits: z.ZodNumber;
    misses: z.ZodNumber;
}, z.core.$strip>;
/**
 * Pool cache snapshot schema.
 */
export declare const poolCacheSnapshotSchema: z.ZodObject<{
    procedureName: z.ZodObject<{
        size: z.ZodNumber;
        hits: z.ZodNumber;
        misses: z.ZodNumber;
    }, z.core.$strip>;
    argument: z.ZodObject<{
        size: z.ZodNumber;
        hits: z.ZodNumber;
        misses: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Pool statistics schema.
 */
export declare const poolStatsSchema: z.ZodObject<{
    totalRequests: z.ZodNumber;
    totalTimeouts: z.ZodNumber;
    totalRequestsEnqueued: z.ZodOptional<z.ZodNumber>;
    totalRequestsDequeued: z.ZodOptional<z.ZodNumber>;
    totalRequestsFailed: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Pool information schema.
 */
export declare const poolInfoSchema: z.ZodObject<{
    name: z.ZodString;
    connectionsInUse: z.ZodNumber;
    connectionsOpen: z.ZodNumber;
    stats: z.ZodNullable<z.ZodObject<{
        totalRequests: z.ZodNumber;
        totalTimeouts: z.ZodNumber;
        totalRequestsEnqueued: z.ZodOptional<z.ZodNumber>;
        totalRequestsDequeued: z.ZodOptional<z.ZodNumber>;
        totalRequestsFailed: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    cache: z.ZodOptional<z.ZodObject<{
        procedureName: z.ZodObject<{
            size: z.ZodNumber;
            hits: z.ZodNumber;
            misses: z.ZodNumber;
        }, z.core.$strip>;
        argument: z.ZodObject<{
            size: z.ZodNumber;
            hits: z.ZodNumber;
            misses: z.ZodNumber;
        }, z.core.$strip>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Server metrics schema.
 */
export declare const metricsSchema: z.ZodObject<{
    requestCount: z.ZodNumber;
    errorCount: z.ZodNumber;
    avgResponseTime: z.ZodNumber;
    minResponseTime: z.ZodNumber;
    maxResponseTime: z.ZodNumber;
    maxRequestsPerSecond: z.ZodNumber;
}, z.core.$strip>;
/**
 * Historical bucket schema.
 */
export declare const bucketSchema: z.ZodObject<{
    timestamp: z.ZodNumber;
    requests: z.ZodNumber;
    errors: z.ZodNumber;
    durationMin: z.ZodNumber;
    durationMax: z.ZodNumber;
    durationAvg: z.ZodNumber;
    durationP95: z.ZodNumber;
    durationP99: z.ZodNumber;
    system: z.ZodObject<{
        cpu: z.ZodNumber;
        heapUsed: z.ZodNumber;
        heapTotal: z.ZodNumber;
        rss: z.ZodNumber;
        external: z.ZodNumber;
    }, z.core.$strip>;
    pools: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        connectionsInUse: z.ZodNumber;
        connectionsOpen: z.ZodNumber;
        cache: z.ZodOptional<z.ZodObject<{
            procedureName: z.ZodObject<{
                size: z.ZodNumber;
                hits: z.ZodNumber;
                misses: z.ZodNumber;
            }, z.core.$strip>;
            argument: z.ZodObject<{
                size: z.ZodNumber;
                hits: z.ZodNumber;
                misses: z.ZodNumber;
            }, z.core.$strip>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Route configuration schema.
 */
export declare const routeConfigSchema: z.ZodObject<{
    route: z.ZodString;
    user: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    connectString: z.ZodOptional<z.ZodString>;
    defaultPage: z.ZodOptional<z.ZodString>;
    pathAlias: z.ZodOptional<z.ZodString>;
    pathAliasProcedure: z.ZodOptional<z.ZodString>;
    documentTable: z.ZodOptional<z.ZodString>;
    exclusionList: z.ZodOptional<z.ZodArray<z.ZodString>>;
    requestValidationFunction: z.ZodOptional<z.ZodString>;
    transactionMode: z.ZodOptional<z.ZodUnknown>;
    errorStyle: z.ZodOptional<z.ZodString>;
    directoryPath: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Server configuration schema.
 */
export declare const serverConfigSchema: z.ZodObject<{
    port: z.ZodNumber;
    adminRoute: z.ZodOptional<z.ZodString>;
    adminUser: z.ZodOptional<z.ZodString>;
    adminPassword: z.ZodOptional<z.ZodString>;
    loggerFilename: z.ZodString;
    uploadFileSizeLimit: z.ZodOptional<z.ZodNumber>;
    routePlSql: z.ZodArray<z.ZodObject<{
        route: z.ZodString;
        user: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        connectString: z.ZodOptional<z.ZodString>;
        defaultPage: z.ZodOptional<z.ZodString>;
        pathAlias: z.ZodOptional<z.ZodString>;
        pathAliasProcedure: z.ZodOptional<z.ZodString>;
        documentTable: z.ZodOptional<z.ZodString>;
        exclusionList: z.ZodOptional<z.ZodArray<z.ZodString>>;
        requestValidationFunction: z.ZodOptional<z.ZodString>;
        transactionMode: z.ZodOptional<z.ZodUnknown>;
        errorStyle: z.ZodOptional<z.ZodString>;
        directoryPath: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    routeStatic: z.ZodArray<z.ZodObject<{
        route: z.ZodString;
        user: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        connectString: z.ZodOptional<z.ZodString>;
        defaultPage: z.ZodOptional<z.ZodString>;
        pathAlias: z.ZodOptional<z.ZodString>;
        pathAliasProcedure: z.ZodOptional<z.ZodString>;
        documentTable: z.ZodOptional<z.ZodString>;
        exclusionList: z.ZodOptional<z.ZodArray<z.ZodString>>;
        requestValidationFunction: z.ZodOptional<z.ZodString>;
        transactionMode: z.ZodOptional<z.ZodUnknown>;
        errorStyle: z.ZodOptional<z.ZodString>;
        directoryPath: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * System information schema.
 */
export declare const systemInfoSchema: z.ZodObject<{
    nodeVersion: z.ZodString;
    platform: z.ZodString;
    arch: z.ZodString;
    cpuCores: z.ZodOptional<z.ZodNumber>;
    memory: z.ZodObject<{
        rss: z.ZodNumber;
        heapTotal: z.ZodNumber;
        heapUsed: z.ZodNumber;
        external: z.ZodNumber;
        totalMemory: z.ZodOptional<z.ZodNumber>;
        rssMax: z.ZodOptional<z.ZodNumber>;
        heapTotalMax: z.ZodOptional<z.ZodNumber>;
        heapUsedMax: z.ZodOptional<z.ZodNumber>;
        externalMax: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    cpu: z.ZodObject<{
        user: z.ZodNumber;
        system: z.ZodNumber;
        max: z.ZodOptional<z.ZodNumber>;
        userMax: z.ZodOptional<z.ZodNumber>;
        systemMax: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Server status response schema.
 */
export declare const statusSchema: z.ZodObject<{
    version: z.ZodString;
    status: z.ZodEnum<{
        stopped: "stopped";
        paused: "paused";
        running: "running";
    }>;
    uptime: z.ZodNumber;
    startTime: z.ZodString;
    intervalMs: z.ZodOptional<z.ZodNumber>;
    metrics: z.ZodObject<{
        requestCount: z.ZodNumber;
        errorCount: z.ZodNumber;
        avgResponseTime: z.ZodNumber;
        minResponseTime: z.ZodNumber;
        maxResponseTime: z.ZodNumber;
        maxRequestsPerSecond: z.ZodNumber;
    }, z.core.$strip>;
    history: z.ZodOptional<z.ZodArray<z.ZodObject<{
        timestamp: z.ZodNumber;
        requests: z.ZodNumber;
        errors: z.ZodNumber;
        durationMin: z.ZodNumber;
        durationMax: z.ZodNumber;
        durationAvg: z.ZodNumber;
        durationP95: z.ZodNumber;
        durationP99: z.ZodNumber;
        system: z.ZodObject<{
            cpu: z.ZodNumber;
            heapUsed: z.ZodNumber;
            heapTotal: z.ZodNumber;
            rss: z.ZodNumber;
            external: z.ZodNumber;
        }, z.core.$strip>;
        pools: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            connectionsInUse: z.ZodNumber;
            connectionsOpen: z.ZodNumber;
            cache: z.ZodOptional<z.ZodObject<{
                procedureName: z.ZodObject<{
                    size: z.ZodNumber;
                    hits: z.ZodNumber;
                    misses: z.ZodNumber;
                }, z.core.$strip>;
                argument: z.ZodObject<{
                    size: z.ZodNumber;
                    hits: z.ZodNumber;
                    misses: z.ZodNumber;
                }, z.core.$strip>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    pools: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        connectionsInUse: z.ZodNumber;
        connectionsOpen: z.ZodNumber;
        stats: z.ZodNullable<z.ZodObject<{
            totalRequests: z.ZodNumber;
            totalTimeouts: z.ZodNumber;
            totalRequestsEnqueued: z.ZodOptional<z.ZodNumber>;
            totalRequestsDequeued: z.ZodOptional<z.ZodNumber>;
            totalRequestsFailed: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        cache: z.ZodOptional<z.ZodObject<{
            procedureName: z.ZodObject<{
                size: z.ZodNumber;
                hits: z.ZodNumber;
                misses: z.ZodNumber;
            }, z.core.$strip>;
            argument: z.ZodObject<{
                size: z.ZodNumber;
                hits: z.ZodNumber;
                misses: z.ZodNumber;
            }, z.core.$strip>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    system: z.ZodObject<{
        nodeVersion: z.ZodString;
        platform: z.ZodString;
        arch: z.ZodString;
        cpuCores: z.ZodOptional<z.ZodNumber>;
        memory: z.ZodObject<{
            rss: z.ZodNumber;
            heapTotal: z.ZodNumber;
            heapUsed: z.ZodNumber;
            external: z.ZodNumber;
            totalMemory: z.ZodOptional<z.ZodNumber>;
            rssMax: z.ZodOptional<z.ZodNumber>;
            heapTotalMax: z.ZodOptional<z.ZodNumber>;
            heapUsedMax: z.ZodOptional<z.ZodNumber>;
            externalMax: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>;
        cpu: z.ZodObject<{
            user: z.ZodNumber;
            system: z.ZodNumber;
            max: z.ZodOptional<z.ZodNumber>;
            userMax: z.ZodOptional<z.ZodNumber>;
            systemMax: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>;
    }, z.core.$strip>;
    config: z.ZodObject<{
        port: z.ZodOptional<z.ZodNumber>;
        adminRoute: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        adminUser: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        adminPassword: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        loggerFilename: z.ZodOptional<z.ZodString>;
        uploadFileSizeLimit: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        routePlSql: z.ZodOptional<z.ZodArray<z.ZodObject<{
            route: z.ZodString;
            user: z.ZodOptional<z.ZodString>;
            password: z.ZodOptional<z.ZodString>;
            connectString: z.ZodOptional<z.ZodString>;
            defaultPage: z.ZodOptional<z.ZodString>;
            pathAlias: z.ZodOptional<z.ZodString>;
            pathAliasProcedure: z.ZodOptional<z.ZodString>;
            documentTable: z.ZodOptional<z.ZodString>;
            exclusionList: z.ZodOptional<z.ZodArray<z.ZodString>>;
            requestValidationFunction: z.ZodOptional<z.ZodString>;
            transactionMode: z.ZodOptional<z.ZodUnknown>;
            errorStyle: z.ZodOptional<z.ZodString>;
            directoryPath: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        routeStatic: z.ZodOptional<z.ZodArray<z.ZodObject<{
            route: z.ZodString;
            user: z.ZodOptional<z.ZodString>;
            password: z.ZodOptional<z.ZodString>;
            connectString: z.ZodOptional<z.ZodString>;
            defaultPage: z.ZodOptional<z.ZodString>;
            pathAlias: z.ZodOptional<z.ZodString>;
            pathAliasProcedure: z.ZodOptional<z.ZodString>;
            documentTable: z.ZodOptional<z.ZodString>;
            exclusionList: z.ZodOptional<z.ZodArray<z.ZodString>>;
            requestValidationFunction: z.ZodOptional<z.ZodString>;
            transactionMode: z.ZodOptional<z.ZodUnknown>;
            errorStyle: z.ZodOptional<z.ZodString>;
            directoryPath: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Error log entry schema.
 */
export declare const errorLogSchema: z.ZodObject<{
    timestamp: z.ZodString;
    req: z.ZodOptional<z.ZodObject<{
        method: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    message: z.ZodString;
    details: z.ZodOptional<z.ZodObject<{
        fullMessage: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const accessLogResponseSchema: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodObject<{
    message: z.ZodString;
}, z.core.$strip>]>;
/**
 * Trace entry schema.
 */
export declare const traceEntrySchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodString;
    source: z.ZodString;
    url: z.ZodString;
    method: z.ZodString;
    status: z.ZodString;
    duration: z.ZodNumber;
    procedure: z.ZodOptional<z.ZodString>;
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    uploads: z.ZodOptional<z.ZodArray<z.ZodAny>>;
    downloads: z.ZodOptional<z.ZodObject<{
        fileType: z.ZodString;
        fileSize: z.ZodNumber;
    }, z.core.$strip>>;
    html: z.ZodOptional<z.ZodString>;
    cookies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    cgi: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    error: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * API response type helpers.
 */
export type StatusResponse = z.infer<typeof statusSchema>;
export type ErrorLogResponse = z.infer<typeof errorLogSchema>;
export type AccessLogResponse = z.infer<typeof accessLogResponseSchema>;
