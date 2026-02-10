import type { Request } from 'express';
import type { BindParameterConfig, environmentType } from '../types.ts';
export type outputType = {
    html: string;
    text: string;
};
export type messageType = {
    type: 'error' | 'warning' | 'trace';
    message: string;
    timestamp?: Date | null;
    req?: Request | null;
    environment?: environmentType | null;
    sql?: string | null;
    bind?: BindParameterConfig | null;
};
/**
 * Return a string representation of the value.
 *
 * @param value - Any value.
 * @param depth - Specifies the number of times to recurse while formatting object.
 * @returns The string representation.
 */
export declare const inspect: (value: unknown, depth?: number | null) => string;
/**
 * Return a tabular representation of the values.
 *
 * @param head - The header values.
 * @param body - The row values.
 * @returns The output.
 */
export declare const toTable: (head: string[], body: string[][]) => outputType;
/**
 * Log text to the console and to a file.
 *
 * @param text - Text to log.
 */
export declare const logToFile: (text: string) => void;
/**
 *	Get a block.
 *	@param title - The name.
 *	@param body - The name.
 *	@returns The text.
 */
export declare const getBlock: (title: string, body: string) => string;
/**
 *	Get a formatted message.
 *	@param para - The req object represents the HTTP request.
 *	@returns The output.
 */
export declare const getFormattedMessage: (para: messageType) => outputType;
/**
 *	Log a warning message.
 *	@param para - The req object represents the HTTP request.
 */
export declare const warningMessage: (para: messageType) => void;
