export function getJsonFile(filePath: string): unknown;
export function isDirectory(directoryPath: unknown): Promise<boolean>;
export function isFile(filePath: unknown): Promise<boolean>;
export function write(text: string): void;
export function writeNewLine(text?: string): void;
export function writeAfterEraseLine(text: string): void;
export function writeStartingOnColumn(text: string, column: number): void;
