/**
 * @typedef {import('../../types.js').environmentType} environmentType
 * @typedef {import('../../types.js').BindParameterConfig} BindParameterConfig
 */
export class ProcedureError extends Error {
    /**
     * @param {string} message - The error message.
     * @param {environmentType} environment - The environment.
     * @param {string} sql - The SQL to execute.
     * @param {BindParameterConfig} bind - The bind parameters.
     */
    constructor(message: string, environment: environmentType, sql: string, bind: BindParameterConfig);
    /** @type {Date} */
    timestamp: Date;
    /** @type {environmentType} */
    environment: environmentType;
    /** @type {string} */
    sql: string;
    /** @type {BindParameterConfig} */
    bind: BindParameterConfig;
}
export type environmentType = import("../../types.js").environmentType;
export type BindParameterConfig = import("../../types.js").BindParameterConfig;
