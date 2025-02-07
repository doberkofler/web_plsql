export function readFile(filePath: string): Promise<Buffer>;
export function removeFile(filePath: string): Promise<void>;
export function getJsonFile(filePath: string): unknown;
export function isDirectory(directoryPath: unknown): Promise<boolean>;
export function isFile(filePath: unknown): Promise<boolean>;
