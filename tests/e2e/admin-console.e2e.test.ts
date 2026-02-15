import {test, expect} from './fixtures/server.ts';

test.describe('Admin Console E2E Tests', () => {
	test('should redirect /admin to /admin/ with trailing slash', async ({page, baseURL}) => {
		await page.goto(`${baseURL}/admin`);
		expect(page.url()).toBe(`${baseURL}/admin/`);
	});

	test('should load admin console with all assets accessible', async ({page, baseURL}) => {
		const failedRequests: string[] = [];
		page.on('requestfailed', (request) => {
			failedRequests.push(`${request.url()} (${request.failure()?.errorText})`);
		});

		const response = await page.goto(`${baseURL}/admin/`, {
			waitUntil: 'networkidle',
		});

		expect(response?.status()).toBe(200);
		expect(failedRequests).toEqual([]);

		const cssLoaded = await page.evaluate(() => {
			const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
			return links.some((link) => {
				const href = link.getAttribute('href');
				return href?.includes('/admin/assets/') && href.endsWith('.css');
			});
		});

		expect(cssLoaded).toBe(true);
	});

	test('should render admin console with styling applied', async ({page, baseURL}) => {
		await page.goto(`${baseURL}/admin/`, {waitUntil: 'networkidle'});
		await page.waitForSelector('.app-container');

		const sidebar = page.locator('.sidebar');
		await expect(sidebar).toBeVisible();

		const sidebarBgColor = await sidebar.evaluate((el) => {
			return globalThis.getComputedStyle(el).backgroundColor;
		});
		expect(sidebarBgColor).not.toBe('rgba(0, 0, 0, 0)');
		expect(sidebarBgColor).not.toBe('transparent');
	});
});
