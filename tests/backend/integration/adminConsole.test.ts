import {describe, it, expect, beforeAll, vi} from 'vitest';
import request from 'supertest';
import express from 'express';
import {handlerAdminConsole, AdminContext} from '../../../src/backend/index.ts';

describe('Admin Console Integration', () => {
	let app: express.Express;
	let adminContext: AdminContext;
	const adminPath = '/my-admin';

	beforeAll(() => {
		app = express();

		// Mock pool and cache
		const mockPool = {
			connectionsOpen: 1,
			connectionsInUse: 0,
			close: vi.fn() as any,
		} as any;

		const mockCache = {
			poolName: 'test',
			procedureNameCache: {
				getStats: () => ({hits: 0, misses: 0}),
				keys: () => [],
			},
			argumentCache: {
				getStats: () => ({hits: 0, misses: 0}),
				keys: () => [],
			},
		} as any;

		adminContext = new AdminContext({} as any);
		adminContext.pools.push(mockPool);
		adminContext.caches.push(mockCache);

		app.use(
			handlerAdminConsole(
				{
					adminRoute: adminPath,
					user: 'admin',
					password: 'password',
					devMode: true, // Skip static dir check if not built
				},
				adminContext,
			),
		);
	});

	it('should redirect /my-admin to /my-admin/', async () => {
		const res = await request(app).get(adminPath);
		expect(res.status).toBe(302);
		expect(res.header.location).toBe(adminPath + '/');
	});

	it('should protect with basic auth', async () => {
		const res = await request(app).get(adminPath + '/');
		expect(res.status).toBe(401);
		expect(res.header['www-authenticate']).toBeDefined();
	});

	it('should allow access with valid credentials', async () => {
		const res = await request(app)
			.get(adminPath + '/api/status')
			.set('Authorization', 'Basic ' + Buffer.from('admin:password').toString('base64'));

		// If handlerAdmin is working, it should return 200 for api/status
		// Even if the database is not real, handlerAdmin returns status info
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty('uptime');
	});

	it('should handle pause/resume visibility in status', async () => {
		adminContext.setPaused(true);
		const auth = 'Basic ' + Buffer.from('admin:password').toString('base64');
		let res = await request(app)
			.get(adminPath + '/api/status')
			.set('Authorization', auth);
		expect(res.body.status).toBe('paused');

		adminContext.setPaused(false);
		res = await request(app)
			.get(adminPath + '/api/status')
			.set('Authorization', auth);
		expect(res.body.status).toBe('running');
	});

	it('should return 503 when paused and accessing non-admin route', async () => {
		adminContext.setPaused(true);
		// Mock a non-admin route
		app.get('/other', (_req, res) => res.send('OK'));

		const res = await request(app).get('/other');
		expect(res.status).toBe(503);
		expect(res.text).toBe('Server Paused');

		adminContext.setPaused(false);
		const res2 = await request(app).get('/other');
		expect(res2.status).toBe(200);
		expect(res2.text).toBe('OK');
	});
});
