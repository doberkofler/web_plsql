/**
 * @typedef {import('oracledb').BindParameter} BindParameter
 */

/**
 * @typedef {object} middlewareOptions
 * @property {string} [defaultPage] - The default page.
 * @property {string} [doctable] - The document table.
 * @property {environmentType} [cgi] - The CGI environment variables.
 * @property {{alias: string, procedure: string}} [pathAlias] - The path alias.
 * @property {'basic' | 'debug'} errorStyle - The error style.
 * @property {'on' | 'off' | 'test'} trace - The trace level.
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
 * @property {string} fieldValue - The field value.
 * @property {string} filename - The filename.
 * @property {string} physicalFilename - The physical filename.
 * @property {string} encoding - The encoding.
 * @property {string} mimetype - The mimetype.
 * @property {number} size - The size.
 */

export const dummy = 0;
