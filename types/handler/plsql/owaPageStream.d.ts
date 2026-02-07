/**
 * @typedef {import('oracledb').Connection} Connection
 * @typedef {import('../../types.js').BindParameterConfig} BindParameterConfig
 */
export class OWAPageStream extends Readable {
    /**
     * @param {Connection} databaseConnection - The database connection.
     */
    constructor(databaseConnection: Connection);
    databaseConnection: oracledb.Connection;
    chunkSize: number;
    isDone: boolean;
    /**
     * Fetch a chunk of the page from the database.
     * @returns {Promise<string[]>} The array of lines fetched.
     */
    fetchChunk(): Promise<string[]>;
    /**
     * Add initial body content to the stream.
     * @param {string} content - The initial content to prepend.
     * @returns {void}
     */
    addBody(content: string): void;
}
export type Connection = import("oracledb").Connection;
export type BindParameterConfig = import("../../types.js").BindParameterConfig;
import { Readable } from 'node:stream';
import oracledb from 'oracledb';
