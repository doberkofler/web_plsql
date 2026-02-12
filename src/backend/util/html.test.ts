import {describe, it, expect} from 'vitest';
import {escapeHtml, convertAsciiToHtml, getHtmlPage} from './html.ts';

describe('html', () => {
	describe('escapeHtml', () => {
		it('should escape ampersand', () => {
			expect(escapeHtml('a&b')).toBe('a&amp;b');
		});

		it('should escape less than', () => {
			expect(escapeHtml('a<b')).toBe('a&lt;b');
		});

		it('should escape greater than', () => {
			expect(escapeHtml('a>b')).toBe('a&gt;b');
		});

		it('should escape double quote', () => {
			expect(escapeHtml('a"b')).toBe('a&quot;b');
		});

		it('should escape single quote', () => {
			expect(escapeHtml("a'b")).toBe('a&#39;b');
		});

		it('should escape all special characters', () => {
			expect(escapeHtml('&<>"\'test')).toBe('&amp;&lt;&gt;&quot;&#39;test');
		});

		it('should handle empty string', () => {
			expect(escapeHtml('')).toBe('');
		});

		it('should handle string with no special characters', () => {
			expect(escapeHtml('hello world')).toBe('hello world');
		});
	});

	describe('convertAsciiToHtml', () => {
		it('should convert LF to br', () => {
			expect(convertAsciiToHtml('line1\nline2')).toBe('line1<br />line2');
		});

		it('should convert CR to br', () => {
			expect(convertAsciiToHtml('line1\rline2')).toBe('line1<br />line2');
		});

		it('should convert CRLF to br', () => {
			expect(convertAsciiToHtml('line1\r\nline2')).toBe('line1<br />line2');
		});

		it('should convert tab to nbsp spaces', () => {
			expect(convertAsciiToHtml('a\tb')).toBe('a&nbsp;&nbsp;&nbsp;b');
		});

		it('should escape html and convert newlines and tabs', () => {
			expect(convertAsciiToHtml('<script>\n\talert()</script>')).toBe('&lt;script&gt;<br />&nbsp;&nbsp;&nbsp;alert()&lt;/script&gt;');
		});

		it('should handle empty string', () => {
			expect(convertAsciiToHtml('')).toBe('');
		});

		it('should handle multiple newlines', () => {
			expect(convertAsciiToHtml('a\n\n\nb')).toBe('a<br /><br /><br />b');
		});

		it('should handle multiple tabs', () => {
			expect(convertAsciiToHtml('a\t\t\tb')).toBe('a&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;b');
		});
	});

	describe('getHtmlPage', () => {
		it('should return complete html page with body', () => {
			const body = '<h1>Error</h1><p>Something went wrong</p>';
			const page = getHtmlPage(body);
			expect(page).toContain('<!DOCTYPE html>');
			expect(page).toContain('<html lang="en">');
			expect(page).toContain('<meta charset="utf-8">');
			expect(page).toContain('<title>web_plsql error page</title>');
			expect(page).toContain(body);
			expect(page).toContain('</html>');
		});

		it('should include body content in page', () => {
			const body = '<p>Test message</p>';
			const page = getHtmlPage(body);
			expect(page).toContain(body);
		});

		it('should handle empty body', () => {
			const page = getHtmlPage('');
			expect(page).toContain('<!DOCTYPE html>');
			expect(page).toContain('</html>');
		});

		it('should handle body with special characters', () => {
			const body = '<script>alert("xss")</script>';
			const page = getHtmlPage(body);
			expect(page).toContain(body);
		});

		it('should contain correct html structure', () => {
			const page = getHtmlPage('test');
			expect(page).toMatch(/<!DOCTYPE html>/);
			expect(page).toMatch(/<html lang="en">/);
			expect(page).toMatch(/<\/html>/);
		});

		it('should contain css styles', () => {
			const page = getHtmlPage('test');
			expect(page).toContain('font-family: monospace, sans-serif');
			expect(page).toContain('font-size: 12px');
		});
	});
});
