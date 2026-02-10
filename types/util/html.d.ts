/**
 * Escape html string.
 *
 * @param value - The value.
 * @returns The escaped value.
 */
export declare const escapeHtml: (value: string) => string;
/**
 *	Convert LF and/or CR to <br>
 *	@param text - The text to convert.
 *	@returns The converted text.
 */
export declare const convertAsciiToHtml: (text: string) => string;
/**
 *	get a minimal html page.
 *	@param body - The body.
 *	@returns The html page.
 */
export declare const getHtmlPage: (body: string) => string;
