import type { environmentType, BindParameterConfig } from '../../types.ts';
export declare class ProcedureError extends Error {
    timestamp: Date;
    environment: environmentType;
    sql: string;
    bind: BindParameterConfig;
    /**
     * @param message - The error message.
     * @param environment - The environment.
     * @param sql - The SQL to execute.
     * @param bind - The bind parameters.
     */
    constructor(message: string, environment: environmentType, sql: string, bind: BindParameterConfig);
}
