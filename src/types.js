import z from 'zod';

/**
 * @typedef {import('oracledb').BindParameter} BindParameter
 * @typedef {import('express').CookieOptions} CookieOptions
 */

/**
 * @typedef {'basic' | 'debug'} errorStyleType
 */
export const z$errorStyleType = z.enum(['basic', 'debug']);

/**
 * @typedef {object} configStaticType
 * @property {string} route - The Static route path.
 * @property {string} directoryPath - The Static directory.
 */
export const z$configStaticType = z.strictObject({
	route: z.string(),
	directoryPath: z.string(),
});

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
export const z$configPlSqlHandlerType = z.strictObject({
	defaultPage: z.string(),
	pathAlias: z.string().optional(),
	pathAliasProcedure: z.string().optional(),
	documentTable: z.string(),
	exclusionList: z.array(z.string()).optional(),
	requestValidationFunction: z.string().optional(),
	errorStyle: z$errorStyleType,
});

/**
 * @typedef {object} configPlSqlConfigType
 * @property {string} route - The PL/SQL route path.
 * @property {string} user - The Oracle username.
 * @property {string} password - The Oracle password.
 * @property {string} connectString - The Oracle connect string.
 */
export const z$configPlSqlConfigType = z.strictObject({
	route: z.string(),
	user: z.string(),
	password: z.string(),
	connectString: z.string(),
});

/**
 * @typedef {configPlSqlHandlerType & configPlSqlConfigType} configPlSqlType
 */
export const z$configPlSqlType = z.strictObject({
	...z$configPlSqlHandlerType.shape,
	...z$configPlSqlConfigType.shape,
});

/**
 * @typedef {object} configType
 * @property {number} port - The server port number.
 * @property {configStaticType[]} routeStatic - The static routes.
 * @property {configPlSqlType[]} routePlSql - The PL/SQL routes.
 * @property {string} loggerFilename - name of the request logger filename or '' if not required.
 */
export const z$configType = z.strictObject({
	port: z.number(),
	routeStatic: z.array(z$configStaticType),
	routePlSql: z.array(z$configPlSqlType),
	loggerFilename: z.string(),
});

/**
 * Environment variables as string key-value pairs
 * @typedef {Record<string, string>} environmentType
 */

/**
 * Oracle database bind parameter configuration
 * @typedef {Record<string, BindParameter>} BindParameterConfig
 */

/**
 * Arguments object with string or string array values
 * @typedef {Record<string, string | string[]>} argObjType
 */

/**
 * File upload metadata
 * @typedef {object} fileUploadType
 * @property {string} fieldname - The field value.
 * @property {string} originalname - The filename.
 * @property {string} encoding - The encoding.
 * @property {string} mimetype - The mimetype.
 * @property {string} filename - The filename.
 * @property {string} path - The path.
 * @property {number} size - The size.
 */

/**
 * @typedef {object} cookieType
 * @property {string} name - The name of the cookie.
 * @property {string} value - The value of the cookie.
 * @property {CookieOptions} options - The cookie options.
 */

/**
 * @typedef {object} pageType - The page.
 * @property {string} body - The body of the page.
 * @property {object} head - The head of the page.
 * @property {cookieType[]} head.cookies - The cookies.
 * @property {string} [head.contentType] - The content type.
 * @property {number} [head.contentLength] - The content length.
 * @property {number} [head.statusCode] - The status code.
 * @property {string} [head.statusDescription] - The status description.
 * @property {string} [head.redirectLocation] - The redirect location.
 * @property {Record<string, string>} head.otherHeaders - The other headers.
 * @property {string} [head.server] - The server.
 * @property {object} file - The file.
 * @property {string | null} file.fileType - The file type.
 * @property {number | null} file.fileSize - The file size.
 * @property {Buffer | null} file.fileBlob - The file blob.
 */
