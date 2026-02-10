import { Readable } from 'node:stream';
import type { Connection } from '../../types.ts';
export declare class OWAPageStream extends Readable {
    databaseConnection: Connection;
    chunkSize: number;
    isDone: boolean;
    /**
     * @param databaseConnection - The database connection.
     */
    constructor(databaseConnection: Connection);
    /**
     * Fetch a chunk of the page from the database.
     * @returns The array of lines fetched.
     */
    fetchChunk(): Promise<string[]>;
    /**
     * @override
     * @param _size - The size hint (unused).
     */
    _read(_size: number): void;
    /**
     * Add initial body content to the stream.
     * @param content - The initial content to prepend.
     */
    addBody(content: string): void;
}
