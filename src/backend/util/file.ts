import {promises as fs, readFileSync} from 'node:fs';

/**
 * Read file.
 *
 * @param filePath - File name.
 * @returns The string.
 */
export const readFileSyncUtf8 = (filePath: string): string => {
	try {
		return readFileSync(filePath, 'utf8');
	} catch {
		throw new Error(`Unable to read file "${filePath}"`);
	}
};

/**
 * Read file.
 *
 * @param filePath - File name.
 * @returns The buffer.
 */
export const readFile = async (filePath: string): Promise<Buffer> => {
	try {
		return await fs.readFile(filePath);
	} catch {
		throw new Error(`Unable to read file "${filePath}"`);
	}
};

/**
 * Remove file.
 *
 * @param filePath - File name.
 */
export const removeFile = async (filePath: string): Promise<void> => {
	try {
		await fs.unlink(filePath);
	} catch {
		throw new Error(`Unable to remove file "${filePath}"`);
	}
};

/**
 * Load a json file.
 *
 * @param filePath - File name.
 * @returns The json object.
 */
export const getJsonFile = (filePath: string): unknown => {
	try {
		const fileContent = readFileSync(filePath, 'utf8');
		return JSON.parse(fileContent);
	} catch {
		throw new Error(`Unable to load file "${filePath}"`);
	}
};

/**
 * Is this a directory.
 * @param directoryPath - Directory name.
 * @returns Return true if it is a directory.
 */
export const isDirectory = async (directoryPath: unknown): Promise<boolean> => {
	if (typeof directoryPath !== 'string') {
		return false;
	}

	const stats = await fs.stat(directoryPath);

	return stats.isDirectory();
};

/**
 * Is this a file.
 * @param filePath - File name.
 * @returns Return true if it is a file.
 */
export const isFile = async (filePath: unknown): Promise<boolean> => {
	if (typeof filePath !== 'string') {
		return false;
	}

	try {
		const stats = await fs.stat(filePath);
		return stats.isFile();
	} catch {
		return false;
	}
};
