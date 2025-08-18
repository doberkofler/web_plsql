/**
 * @typedef {import('oracledb').BindParameter} BindParameter
 */
/**
 * @typedef {'basic' | 'debug'} errorStyleType
 */
export const z$errorStyleType: z.ZodEnum<{
    basic: "basic";
    debug: "debug";
}>;
/**
 * @typedef {object} configStaticType
 * @property {string} route - The Static route path.
 * @property {string} directoryPath - The Static directory.
 */
export const z$configStaticType: z.ZodObject<{
    route: z.ZodString;
    directoryPath: z.ZodString;
}, z.core.$strict>;
/**
 * @typedef {object} configPlSqlHandlerType
 * @property {string} defaultPage - The default page.
 * @property {string} [pathAlias] - The path alias.
 * @property {string} [pathAliasProcedure] - The path alias.
 * @property {string} documentTable - The document table.
 * @property {string[]} [exclusionList] - The exclusion list.
 * @property {string} [requestValidationFunction] - The request validation function.
 * @property {Record<string, string>} [cgi] - The additional CGI.
 * @property {errorStyleType} errorStyle - The error style.
 */
export const z$configPlSqlHandlerType: z.ZodObject<{
    defaultPage: z.ZodString;
    pathAlias: z.ZodOptional<z.ZodString>;
    pathAliasProcedure: z.ZodOptional<z.ZodString>;
    documentTable: z.ZodString;
    exclusionList: z.ZodOptional<z.ZodArray<z.ZodString>>;
    requestValidationFunction: z.ZodOptional<z.ZodString>;
    errorStyle: z.ZodEnum<{
        basic: "basic";
        debug: "debug";
    }>;
}, z.core.$strict>;
/**
 * @typedef {object} configPlSqlConfigType
 * @property {string} route - The PL/SQL route path.
 * @property {string} user - The Oracle username.
 * @property {string} password - The Oracle password.
 * @property {string} connectString - The Oracle connect string.
 */
export const z$configPlSqlConfigType: z.ZodObject<{
    route: z.ZodString;
    user: z.ZodString;
    password: z.ZodString;
    connectString: z.ZodString;
}, z.core.$strict>;
/**
 * @typedef {configPlSqlHandlerType & configPlSqlConfigType} configPlSqlType
 */
export const z$configPlSqlType: z.ZodObject<{
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
    errorStyle: z.ZodEnum<{
        basic: "basic";
        debug: "debug";
    }>;
}, z.core.$strict>;
/**
 * @typedef {object} configType
 * @property {number} port - The server port number.
 * @property {configStaticType[]} routeStatic - The static routes.
 * @property {configPlSqlType[]} routePlSql - The PL/SQL routes.
 * @property {string} loggerFilename - name of the request logger filename or '' if not required.
 * @property {boolean} monitorConsole - Enable console status monitor.
 */
export const z$configType: z.ZodObject<{
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
        errorStyle: z.ZodEnum<{
            basic: "basic";
            debug: "debug";
        }>;
    }, z.core.$strict>>;
    loggerFilename: z.ZodString;
    monitorConsole: z.ZodBoolean;
}, z.core.$strict>;
export type BindParameter = import("oracledb").BindParameter;
export type errorStyleType = "basic" | "debug";
export type configStaticType = {
    /**
     * - The Static route path.
     */
    route: string;
    /**
     * - The Static directory.
     */
    directoryPath: string;
};
export type configPlSqlHandlerType = {
    /**
     * - The default page.
     */
    defaultPage: string;
    /**
     * - The path alias.
     */
    pathAlias?: string;
    /**
     * - The path alias.
     */
    pathAliasProcedure?: string;
    /**
     * - The document table.
     */
    documentTable: string;
    /**
     * - The exclusion list.
     */
    exclusionList?: string[];
    /**
     * - The request validation function.
     */
    requestValidationFunction?: string;
    /**
     * - The additional CGI.
     */
    cgi?: Record<string, string>;
    /**
     * - The error style.
     */
    errorStyle: errorStyleType;
};
export type configPlSqlConfigType = {
    /**
     * - The PL/SQL route path.
     */
    route: string;
    /**
     * - The Oracle username.
     */
    user: string;
    /**
     * - The Oracle password.
     */
    password: string;
    /**
     * - The Oracle connect string.
     */
    connectString: string;
};
export type configPlSqlType = configPlSqlHandlerType & configPlSqlConfigType;
export type configType = {
    /**
     * - The server port number.
     */
    port: number;
    /**
     * - The static routes.
     */
    routeStatic: configStaticType[];
    /**
     * - The PL/SQL routes.
     */
    routePlSql: configPlSqlType[];
    /**
     * - name of the request logger filename or '' if not required.
     */
    loggerFilename: string;
    /**
     * - Enable console status monitor.
     */
    monitorConsole: boolean;
};
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
 * File upload metadata
 */
export type fileUploadType = {
    /**
     * - The field value.
     */
    fieldname: string;
    /**
     * - The filename.
     */
    originalname: string;
    /**
     * - The encoding.
     */
    encoding: string;
    /**
     * - The mimetype.
     */
    mimetype: string;
    /**
     * - The filename.
     */
    filename: string;
    /**
     * - The path.
     */
    path: string;
    /**
     * - The size.
     */
    size: number;
};
export type cookieType = {
    /**
     * - The name of the cookie.
     */
    name: string;
    /**
     * - The value of the cookie.
     */
    value: string;
    /**
     * - The path of the cookie.
     */
    path?: string;
    /**
     * - The domain of the cookie.
     */
    domain?: string;
    /**
     * - The secure flag.
     */
    secure?: string;
    /**
     * - The expiration date.
     */
    expires?: Date;
    /**
     * - The httpOnly flag.
     */
    httpOnly?: boolean;
};
/**
 * - The page.
 */
export type pageType = {
    /**
     * - The body of the page.
     */
    body: string;
    /**
     * - The head of the page.
     */
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
    /**
     * - The file.
     */
    file: {
        fileType: string | null;
        fileSize: number | null;
        fileBlob: Buffer | null;
    };
};
/**
 * - The metrics.
 */
export type metricsType = {
    /**
     * - The total number of requests.
     */
    totalRequests: number;
    /**
     * - The number of requests in the last second.
     */
    requestsInLastInterval: number;
};
import z from 'zod';
