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

export const dummy = 0;
