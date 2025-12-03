/*
 *	Html utilities
 */

/**
 * Escape html string.
 *
 * @param {string} value - The value.
 * @returns {string} - The escaped value.
 */
export const escapeHtml = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 *	Convert LF and/or CR to <br>
 *	@param {string} text - The text to convert.
 *	@returns {string} - The converted text.
 */
export const convertAsciiToHtml = (text) => {
	let html = escapeHtml(text);

	html = html.replace(/(?:\r\n|\r|\n)/g, '<br />');
	html = html.replace(/\t/g, '&nbsp;&nbsp;&nbsp;');

	return html;
};
