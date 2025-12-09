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

/**
 *	get a minimal html page.
 *	@param {string} body - The body.
 *	@returns {string} - The html page.
 */
export const getHtmlPage = (body) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>web_plsql error page</title>
<style type="text/css">
html {
	font-family: monospace, sans-serif;
	font-size: 12px;
}
h1 {
	font-size: 16px;
	padding: 2px;
	background-color: #cc0000;
}
</style>
</head>
<body>
${body}
</body>
</html>
`;
