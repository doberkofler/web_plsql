/**
 * Read file.
 *
 * @param filePath - File name.
 * @returns The string.
 */
export declare const readFileSyncUtf8: (filePath: string) => string;
/**
 * Read file.
 *
 * @param filePath - File name.
 * @returns The buffer.
 */
export declare const readFile: (filePath: string) => Promise<Buffer>;
/**
 * Remove file.
 *
 * @param filePath - File name.
 */
export declare const removeFile: (filePath: string) => Promise<void>;
/**
 * Load a json file.
 *
 * @param filePath - File name.
 * @returns The json object.
 */
export declare const getJsonFile: (filePath: string) => unknown;
/**
 * Is this a directory.
 * @param directoryPath - Directory name.
 * @returns Return true if it is a directory.
 */
export declare const isDirectory: (directoryPath: unknown) => Promise<boolean>;
/**
 * Is this a file.
 * @param filePath - File name.
 * @returns Return true if it is a file.
 */
export declare const isFile: (filePath: unknown) => Promise<boolean>;
