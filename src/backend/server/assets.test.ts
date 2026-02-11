import {describe, it, expect, beforeAll, afterAll, vi} from 'vitest';
import {startServer} from '../server/server.ts';
import type {configType} from '../types.ts';
import request from 'supertest';
import {load as cheerioLoad} from 'cheerio';
import {existsSync} from 'node:fs';
import path from 'node:path';

// Mock oracledb
vi.mock('oracledb', () => {
	return {
		default: {
			createPool: vi.fn().mockResolvedValue({
				close: vi.fn(),
				getConnection: vi.fn(),
			}),
			BIND_IN: 1,
			BIND_OUT: 3,
			STRING: 1,
		},
	};
});

describe('Admin Console Asset Loading', () => {
	let serverInstance: any;

	const validConfig: configType = {
		port: 8081, // Use different port for tests
		routeStatic: [],
		routePlSql: [
			{
				route: '/pls',
				user: 'test',
				password: 'test',
				connectString: 'localhost:1521/TEST',
				defaultPage: 'test.page',
				documentTable: 'docs',
				errorStyle: 'debug',
			},
		],
		loggerFilename: '',
		adminRoute: '/admin',
	};

	beforeAll(async () => {
		serverInstance = await startServer(validConfig);
	});

	afterAll(async () => {
		if (serverInstance) {
			await serverInstance.shutdown();
		}
	});

	it('should serve admin console HTML with correct asset paths', async () => {
		const response = await request(serverInstance.app).get('/admin/');
		expect(response.status).toBe(200);
		expect(response.headers['content-type']).toMatch(/html/);

		// Parse HTML
		const $ = cheerioLoad(response.text);

		const assets: {type: string; url: string}[] = [];
		$('link[rel="stylesheet"], script[src], link[rel="icon"]').each((_, el) => {
			const url = $(el).attr('href') || $(el).attr('src');
			if (url) assets.push({type: el.tagName, url});
		});

		for (const asset of assets) {
			if (asset.url.startsWith('http')) continue;

			// If it's an absolute path (starts with /), it MUST start with /admin/
			if (asset.url.startsWith('/')) {
				expect(asset.url, `Absolute asset path "${asset.url}" missing /admin/ prefix`).toMatch(/^\/admin\//);
			}
		}
	});

	it('should serve all referenced assets successfully', async () => {
		const htmlResponse = await request(serverInstance.app).get('/admin/');
		const $ = cheerioLoad(htmlResponse.text);

		const assetUrls: string[] = [];
		$('link[rel="stylesheet"][href], script[src], link[rel="icon"][href]').each((_, el) => {
			const url = $(el).attr('href') || $(el).attr('src');
			if (url && !url.startsWith('http')) {
				assetUrls.push(url);
			}
		});

		for (const url of assetUrls) {
			// Resolve relative URLs if served from src
			const targetUrl = url.startsWith('/') ? url : `/admin/${url}`;
			const response = await request(serverInstance.app).get(targetUrl);
			expect(response.status, `Asset "${targetUrl}" failed to load`).toBe(200);
		}
	});

	it('should have built frontend assets in dist directory', () => {
		const distFrontend = path.resolve(process.cwd(), 'dist/frontend');
		expect(existsSync(distFrontend)).toBe(true);

		const indexHtml = path.resolve(distFrontend, 'index.html');
		expect(existsSync(indexHtml)).toBe(true);
	});
});
