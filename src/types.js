/**
 * @typedef {import('oracledb').BindParameter} BindParameter
 */

/**
 * @typedef {'basic' | 'debug'} errorStyleType
 */

/**
 * @typedef {{alias: string, procedure: string}} pathAliasType
 */

/**
 * @typedef {object} middlewareOptions
 * @property {string} [defaultPage] - The default page.
 * @property {string} doctable - The document table.
 * @property {environmentType} [cgi] - The CGI environment variables.
 * @property {pathAliasType} [pathAlias] - The path alias.
 * @property {errorStyleType} errorStyle - The error style.
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

export const dummy = 0;
