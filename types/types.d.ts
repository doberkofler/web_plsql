/**
 * @typedef {import('oracledb').BindParameter} BindParameter
 * @typedef {import('oracledb').Connection} Connection
 * @typedef {import('express').CookieOptions} CookieOptions
 * @typedef {import('express').Request} Request
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
 * @typedef {(connection: Connection, procedure: string) => void | Promise<void>} transactionCallbackType
 * @typedef {'commit' | 'rollback' | transactionCallbackType | undefined | null} transactionModeType
 */
/**
 * @typedef {object} configPlSqlHandlerType
 * @property {string} defaultPage - The default page.
 * @property {string} [pathAlias] - The path alias.
 * @property {string} [pathAliasProcedure] - The path alias.
 * @property {string} documentTable - The document table.
 * @property {string[]} [exclusionList] - The exclusion list.
 * @property {string} [requestValidationFunction] - The request validation function.
 * @property {Record<string, string>} [cgi] - The additional CGI.
 * @property {transactionModeType} [transactionMode] - Specifies an optional transaction mode.
 * "commit" this automatically commits any open transaction after each request. This is the defaults because this is what mod_plsql and ohs are doing.
 * "rollback" this automatically rolles back any open transaction after each request.
 * "transactionCallbackType" this allows to defined a custom handler as a JavaScript function.
 * @property {errorStyleType} errorStyle - The error style.
 */
export const z$configPlSqlHandlerType: z.ZodObject<{
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
    transactionMode: z.ZodOptional<z.ZodUnknown>;
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
 * @property {number} [uploadFileSizeLimit] - Maximum size of each uploaded file in bytes or no limit if omitted.
 * @property {string} loggerFilename - name of the request logger filename or '' if not required.
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
        transactionMode: z.ZodOptional<z.ZodUnknown>;
        errorStyle: z.ZodEnum<{
            basic: "basic";
            debug: "debug";
        }>;
    }, z.core.$strict>>;
    uploadFileSizeLimit: z.ZodOptional<z.ZodNumber>;
    loggerFilename: z.ZodString;
}, z.core.$strict>;
export type BindParameter = import("oracledb").BindParameter;
export type Connection = import("oracledb").Connection;
export type CookieOptions = import("express").CookieOptions;
export type Request = import("express").Request;
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
export type transactionCallbackType = (connection: Connection, procedure: string) => void | Promise<void>;
export type transactionModeType = "commit" | "rollback" | transactionCallbackType | undefined | null;
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
     * - Specifies an optional transaction mode.
     * "commit" this automatically commits any open transaction after each request. This is the defaults because this is what mod_plsql and ohs are doing.
     * "rollback" this automatically rolles back any open transaction after each request.
     * "transactionCallbackType" this allows to defined a custom handler as a JavaScript function.
     */
    transactionMode?: transactionModeType;
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
     * - Maximum size of each uploaded file in bytes or no limit if omitted.
     */
    uploadFileSizeLimit?: number;
    /**
     * - name of the request logger filename or '' if not required.
     */
    loggerFilename: string;
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
     * - The cookie options.
     */
    options: CookieOptions;
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
        fileBlob: import("node:stream").Readable | Buffer | null;
    };
};
import z from 'zod';
