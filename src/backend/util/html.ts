/*
 *	Html utilities
 */

/**
 * Escape html string.
 *
 * @param value - The value.
 * @returns The escaped value.
 */
export const escapeHtml = (value: string): string =>
	value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

/**
 *	Convert LF and/or CR to <br>
 *	@param text - The text to convert.
 *	@returns The converted text.
 */
export const convertAsciiToHtml = (text: string): string => {
	let html = escapeHtml(text);

	html = html.replaceAll(/\r\n|\r|\n/g, '<br />');
	html = html.replaceAll('\t', '&nbsp;&nbsp;&nbsp;');

	return html;
};

/**
 *	get a minimal html page.
 *	@param body - The body.
 *	@returns The html page.
 */
export const getHtmlPage = (body: string): string => `<!DOCTYPE html>
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
