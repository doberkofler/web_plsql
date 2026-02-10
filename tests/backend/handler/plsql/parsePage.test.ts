import {describe, it, expect} from 'vitest';
import {parsePage} from '../../../../src/backend/handler/plsql/parsePage.ts';

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
});
