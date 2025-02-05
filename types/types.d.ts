/**
 * @typedef {import('oracledb').BindParameter} BindParameter
 */
/**
 * @typedef {'basic' | 'debug'} errorStyleType
 */
export const z$errorStyleType: any;
/**
 * @typedef {{alias: string, procedure: string}} pathAliasType
 */
export const z$pathAliasType: any;
/**
 * @typedef {object} configStaticType
 * @property {string} route - The Static route path.
 * @property {string} directoryPath - The Static directory.
 */
export const z$configStaticType: any;
/**
 * @typedef {object} configPlSqlType
 * @property {string} route - The PL/SQL route path.
 * @property {string} user - The Oracle username.
 * @property {string} password - The Oracle password.
 * @property {string} connectString - The Oracle connect string.
 * @property {string} defaultPage - The default page.
 * @property {pathAliasType} [pathAlias] - The path alias.
 * @property {string} documentTable - The document table.
 */
export const z$configPlSqlType: any;
/**
 * @typedef {object} configType
 * @property {number} port - The server port number.
 * @property {configStaticType[]} routeStatic - The static routes.
 * @property {configPlSqlType[]} routePlSql - The PL/SQL routes.
 * @property {errorStyleType} errorStyle - The error style.
 * @property {string} loggerFilename - name of the request logger filename or '' if not required.
 * @property {boolean} monitorConsole - Enable console status monitor.
 */
export const z$configType: any;
export type BindParameter = import("oracledb").BindParameter;
export type errorStyleType = "basic" | "debug";
export type pathAliasType = {
    alias: string;
    procedure: string;
};
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
export type configPlSqlType = {
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
    /**
     * - The default page.
     */
    defaultPage: string;
    /**
     * - The path alias.
     */
    pathAlias?: pathAliasType;
    /**
     * - The document table.
     */
    documentTable: string;
};
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
     * - The error style.
     */
    errorStyle: errorStyleType;
    /**
     * - name of the request logger filename or '' if not required.
     */
    loggerFilename: string;
    /**
     * - Enable console status monitor.
     */
    monitorConsole: boolean;
};
export type middlewareOptions = {
    /**
     * - The default page.
     */
    defaultPage?: string;
    /**
     * - The document table.
     */
    doctable?: string;
    /**
     * - Additional CGI environment variables.
     */
    cgi?: environmentType;
    /**
     * - The path alias.
     */
    pathAlias?: pathAliasType;
    /**
     * - The error style.
     */
    errorStyle?: errorStyleType;
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
    requestsInCurrentSecond: number;
};
