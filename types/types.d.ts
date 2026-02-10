import z from 'zod';
import type { BindParameter, Connection, Result } from 'oracledb';
import type { CookieOptions, Request } from 'express';
import type { Readable } from 'node:stream';
export type { BindParameter, Connection, Result, CookieOptions, Request };
export declare const z$errorStyleType: z.ZodEnum<{
    basic: "basic";
    debug: "debug";
}>;
export type errorStyleType = z.infer<typeof z$errorStyleType>;
export declare const z$configStaticType: z.ZodObject<{
    route: z.ZodString;
    directoryPath: z.ZodString;
}, z.core.$strict>;
export type configStaticType = z.infer<typeof z$configStaticType>;
export type transactionCallbackType = (connection: Connection, procedure: string) => void | Promise<void>;
export type transactionModeType = 'commit' | 'rollback' | transactionCallbackType | undefined | null;
export type configPlSqlHandlerType = {
    defaultPage: string;
    pathAlias?: string;
    pathAliasProcedure?: string;
    documentTable: string;
    exclusionList?: string[];
    requestValidationFunction?: string;
    transactionMode?: transactionModeType;
    errorStyle: errorStyleType;
    cgi?: Record<string, string>;
};
export declare const z$configPlSqlHandlerType: z.ZodObject<{
    defaultPage: z.ZodString;
    pathAlias: z.ZodOptional<z.ZodString>;
    pathAliasProcedure: z.ZodOptional<z.ZodString>;
    documentTable: z.ZodString;
    exclusionList: z.ZodOptional<z.ZodArray<z.ZodString>>;
    requestValidationFunction: z.ZodOptional<z.ZodString>;
    transactionMode: z.ZodOptional<z.ZodUnknown>;
    errorStyle: z.ZodEnum<{
        basic: "basic";
        debug: "debug";
    }>;
}, z.core.$strict>;
export declare const z$configPlSqlConfigType: z.ZodObject<{
    route: z.ZodString;
    user: z.ZodString;
    password: z.ZodString;
    connectString: z.ZodString;
}, z.core.$strict>;
export type configPlSqlConfigType = z.infer<typeof z$configPlSqlConfigType>;
export type configPlSqlType = configPlSqlHandlerType & configPlSqlConfigType;
export declare const z$configPlSqlType: z.ZodObject<{
    route: z.ZodString;
    user: z.ZodString;
    password: z.ZodString;
    connectString: z.ZodString;
    defaultPage: z.ZodString;
    pathAlias: z.ZodOptional<z.ZodString>;
    pathAliasProcedure: z.ZodOptional<z.ZodString>;
    documentTable: z.ZodString;
    exclusionList: z.ZodOptional<z.ZodArray<z.ZodString>>;
    requestValidationFunction: z.ZodOptional<z.ZodString>;
    transactionMode: z.ZodOptional<z.ZodUnknown>;
    errorStyle: z.ZodEnum<{
        basic: "basic";
        debug: "debug";
    }>;
}, z.core.$strict>;
export type configType = {
    port: number;
    routeStatic: configStaticType[];
    routePlSql: configPlSqlType[];
    uploadFileSizeLimit?: number;
    loggerFilename: string;
    adminRoute?: string;
    adminUser?: string;
    adminPassword?: string;
};
export declare const z$configType: z.ZodObject<{
    port: z.ZodNumber;
    routeStatic: z.ZodArray<z.ZodObject<{
        route: z.ZodString;
        directoryPath: z.ZodString;
    }, z.core.$strict>>;
    routePlSql: z.ZodArray<z.ZodObject<{
        route: z.ZodString;
        user: z.ZodString;
        password: z.ZodString;
        connectString: z.ZodString;
        defaultPage: z.ZodString;
        pathAlias: z.ZodOptional<z.ZodString>;
        pathAliasProcedure: z.ZodOptional<z.ZodString>;
        documentTable: z.ZodString;
        exclusionList: z.ZodOptional<z.ZodArray<z.ZodString>>;
        requestValidationFunction: z.ZodOptional<z.ZodString>;
        transactionMode: z.ZodOptional<z.ZodUnknown>;
        errorStyle: z.ZodEnum<{
            basic: "basic";
            debug: "debug";
        }>;
    }, z.core.$strict>>;
    uploadFileSizeLimit: z.ZodOptional<z.ZodNumber>;
    loggerFilename: z.ZodString;
    adminRoute: z.ZodOptional<z.ZodString>;
    adminUser: z.ZodOptional<z.ZodString>;
    adminPassword: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
/**
 * Environment variables as string key-value pairs
 */
export type environmentType = Record<string, string>;
/**
 * Oracle database bind parameter configuration
 */
export type BindParameterConfig = Record<string, BindParameter>;
/**
 * Arguments object with string or string array values
 */
export type argObjType = Record<string, string | string[]>;
/**
 * Argument types mapping (name -> type)
 */
export type argsType = Record<string, string>;
/**
 * File upload metadata
 */
export type fileUploadType = {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    filename: string;
    path: string;
    size: number;
};
export type cookieType = {
    name: string;
    value: string;
    options: CookieOptions;
};
export type pageType = {
    body: string | Readable;
    head: {
        cookies: cookieType[];
        contentType?: string;
        contentLength?: number;
        statusCode?: number;
        statusDescription?: string;
        redirectLocation?: string;
        otherHeaders: Record<string, string>;
        server?: string;
    };
    file: {
        fileType: string | null;
        fileSize: number | null;
        fileBlob: Readable | Buffer | null;
    };
};
