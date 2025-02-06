import z from 'zod';

/**
 * @typedef {import('oracledb').BindParameter} BindParameter
 */

/**
 * @typedef {'basic' | 'debug'} errorStyleType
 */
export const z$errorStyleType = z.enum(['basic', 'debug']);

/**
 * @typedef {{alias: string, procedure: string}} pathAliasType
 */
export const z$pathAliasType = z
	.object({
		alias: z.string(),
		procedure: z.string(),
	})
	.strict();

/**
 * @typedef {object} configStaticType
 * @property {string} route - The Static route path.
 * @property {string} directoryPath - The Static directory.
 */
export const z$configStaticType = z
	.object({
		route: z.string(),
		directoryPath: z.string(),
	})
	.strict();

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
export const z$configPlSqlType = z
	.object({
		route: z.string(),
		user: z.string(),
		password: z.string(),
		connectString: z.string(),
		defaultPage: z.string(),
		pathAlias: z$pathAliasType.optional(),
		documentTable: z.string(),
	})
	.strict();

/**
 * @typedef {object} configType
 * @property {number} port - The server port number.
 * @property {configStaticType[]} routeStatic - The static routes.
 * @property {configPlSqlType[]} routePlSql - The PL/SQL routes.
 * @property {errorStyleType} errorStyle - The error style.
 * @property {string} loggerFilename - name of the request logger filename or '' if not required.
 * @property {boolean} monitorConsole - Enable console status monitor.
 */
export const z$configType = z
	.object({
		port: z.number(),
		routeStatic: z.array(z$configStaticType),
		routePlSql: z.array(z$configPlSqlType),
		errorStyle: z$errorStyleType,
		loggerFilename: z.string(),
		monitorConsole: z.boolean(),
	})
	.strict();

/**
 * @typedef {object} middlewareOptions
 * @property {string} [defaultPage] - The default page.
 * @property {string} [doctable] - The document table.
 * @property {environmentType} [cgi] - Additional CGI environment variables.
 * @property {pathAliasType} [pathAlias] - The path alias.
 * @property {errorStyleType} [errorStyle] - The error style.
 */

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
 * @property {string} [path] - The path of the cookie.
 * @property {string} [domain] - The domain of the cookie.
 * @property {string} [secure] - The secure flag.
 * @property {Date} [expires] - The expiration date.
 * @property {boolean} [httpOnly] - The httpOnly flag.
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

/**
 * @typedef {object} metricsType - The metrics.
 * @property {number} totalRequests - The total number of requests.
 * @property {number} requestsInLastInterval - The number of requests in the last second.
 */
