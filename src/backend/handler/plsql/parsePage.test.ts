import {describe, it, expect} from 'vitest';
import {parsePage} from '../../handler/plsql/parsePage.ts';

describe('handler/plsql/parsePage', () => {
	it('should parse valid page with headers and body', () => {
		const text = 'Content-Type: text/html\n\n<body>hello</body>';
		const page = parsePage(text);
		expect(page.body).toBe('<body>hello</body>');
		expect(page.head.contentType).toBe('text/html');
	});

	it('should parse Set-Cookie header', () => {
		const text = 'Set-Cookie: name=value; Path=/; Secure; HttpOnly\n\n';
		const page = parsePage(text);
		expect(page.head.cookies).toHaveLength(1);
		const cookie = page.head.cookies[0];
		expect(cookie).toBeDefined();
		if (cookie) {
			expect(cookie.name).toBe('name');
			expect(cookie.value).toBe('value');
			expect(cookie.options.path).toBe('/');
			expect(cookie.options.secure).toBe(true);
			expect(cookie.options.httpOnly).toBe(true);
		}
	});

	it('should parse x-db-content-length', () => {
		const text = 'x-db-content-length: 123\n\n';
		const page = parsePage(text);
		expect(page.head.contentLength).toBe(123);
	});

	it('should throw on invalid x-db-content-length', () => {
		const text = 'x-db-content-length: invalid\n\n';
		expect(() => parsePage(text)).toThrow('Unable to parse header');
	});

	it('should parse status', () => {
		const text = 'Status: 200 OK\n\n';
		const page = parsePage(text);
		expect(page.head.statusCode).toBe(200);
		expect(page.head.statusDescription).toBe('OK');
	});

	it('should throw on invalid status', () => {
		const text = 'Status: invalid\n\n';
		expect(() => parsePage(text)).toThrow('Unable to parse header');
	});

	it('should parse location', () => {
		const text = 'Location: /home\n\n';
		const page = parsePage(text);
		expect(page.head.redirectLocation).toBe('/home');
	});

	it('should handle cookies with invalid format (no equals)', () => {
		const text = 'Set-Cookie: invalid\n\n';
		expect(() => parsePage(text)).toThrow('Unable to parse header "set-cookie"');
	});

	it('should parse cookie expires', () => {
		const text = 'Set-Cookie: n=v; Expires=Wed, 21 Oct 2015 07:28:00 GMT\n\n';
		const page = parsePage(text);
		expect(page.head.cookies).toHaveLength(1);
		expect(page.head.cookies[0]?.options.expires).toBeInstanceOf(Date);
	});

	it('should handle custom headers', () => {
		const text = 'X-Custom: value\n\n';
		const page = parsePage(text);
		expect(page.head.otherHeaders['X-Custom']).toBe('value');
	});

	it('should ignore x-oracle-ignore', () => {
		const text = 'x-oracle-ignore: ignore-me\n\n';
		const page = parsePage(text);
		expect(page.head.otherHeaders).not.toHaveProperty('x-oracle-ignore');
	});

	it('should handle text without header/body separator', () => {
		const text = 'Content-Type: text/html';
		const page = parsePage(text);
		expect(page.body).toBe('');
		expect(page.head.contentType).toBe('text/html');
	});

	it('should handle null getHeader result', () => {
		const text = 'not-a-header-line\n\n';
		const page = parsePage(text);
		expect(page.head.otherHeaders).not.toHaveProperty('not-a-header-line');
	});

	it('should parse cookie domain option', () => {
		const text = 'Set-Cookie: n=v; Domain=example.com\n\n';
		const page = parsePage(text);
		expect(page.head.cookies[0]?.options.domain).toBe('example.com');
	});

	it('should parse status without description', () => {
		const text = 'Status: 500\n\n';
		const page = parsePage(text);
		expect(page.head.statusCode).toBe(500);
		expect(page.head.statusDescription).toBeUndefined();
	});

	it('should parse multiple cookies', () => {
		const text = 'Set-Cookie: a=1; Path=/\nSet-Cookie: b=2; Path=/\n\n';
		const page = parsePage(text);
		expect(page.head.cookies).toHaveLength(2);
		expect(page.head.cookies[0]?.name).toBe('a');
		expect(page.head.cookies[1]?.name).toBe('b');
	});

	it('should throw on invalid cookie value', () => {
		const text = 'Set-Cookie: ; Path=/\n\n';
		expect(() => parsePage(text)).toThrow('Unable to parse header "set-cookie"');
	});

	it('should throw on cookie with empty name', () => {
		const text = 'Set-Cookie: =value; Path=/\n\n';
		expect(() => parsePage(text)).toThrow('Unable to parse header "set-cookie"');
	});

	it('should handle empty Set-Cookie value', () => {
		const text = 'Set-Cookie:\n\n';
		expect(() => parsePage(text)).toThrow('Unable to parse header "set-cookie"');
	});

	it('should handle whitespace-only Set-Cookie value', () => {
		const text = 'Set-Cookie:   \n\n';
		expect(() => parsePage(text)).toThrow('Unable to parse header "set-cookie"');
	});

	it('should handle Set-Cookie with empty value after semicolon', () => {
		const text = 'Set-Cookie: ; Path=/\n\n';
		expect(() => parsePage(text)).toThrow('Unable to parse header "set-cookie"');
	});

	it('should handle invalid expires date format gracefully', () => {
		const text = 'Set-Cookie: n=v; Expires=invalid-date\n\n';
		const page = parsePage(text);
		expect(page.head.cookies).toHaveLength(1);
		expect(page.head.cookies[0]?.options.expires).toBeUndefined();
	});

	it('should parse cookie httpOnly option', () => {
		const text = 'Set-Cookie: n=v; HttpOnly\n\n';
		const page = parsePage(text);
		expect(page.head.cookies[0]?.options.httpOnly).toBe(true);
	});
});
