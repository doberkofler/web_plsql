import {describe, it, expect, vi, beforeEach} from 'vitest';
import {startServer} from '../../../src/backend/server/server.ts';
import {EventEmitter} from 'node:events';
import request from 'supertest';
import type {configType} from '../../../src/backend/types.ts';

vi.mock('../../../src/backend/util/oracle.ts', () => ({
	poolCreate: vi.fn().mockResolvedValue({
		close: vi.fn(),
		connectionsOpen: 0,
		connectionsInUse: 0,
	}),
	poolsClose: vi.fn(),
}));

vi.mock('../../../src/backend/util/shutdown.ts', () => ({
	installShutdown: vi.fn(),
}));

describe('server/server coverage', () => {
	const validConfig: configType = {
		port: 0,
		adminRoute: '/admin',
		loggerFilename: '',
		uploadFileSizeLimit: 1024,
		routeStatic: [],
		routePlSql: [],
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// @ts-expect-error - mocking private process.exit
		vi.spyOn(process, 'exit').mockImplementation(() => {
			/* empty */
		});
		vi.spyOn(console, 'log').mockImplementation(() => {
			/* empty */
		});
	});

	it('should call next() for admin sub-routes', async () => {
		const webServer = await startServer(validConfig);
		const response = await request(webServer.app).get('/admin/foo');
		expect(response.status).not.toBe(302);

		await webServer.shutdown();
	});

	it('should track and remove closed connections', async () => {
		const webServer = await startServer(validConfig);
		const server = webServer.server;

		const socket: any = new EventEmitter();
		socket.destroy = vi.fn();
		vi.spyOn(socket, 'on');

		server.emit('connection', socket);

		// Emit close event to trigger removal from connections set
		socket.emit('close');

		await webServer.shutdown();

		// Should NOT be destroyed because it was already closed/removed
		expect(socket.destroy).not.toHaveBeenCalled();
	});

	it('should track active connections and destroy them on shutdown', async () => {
		const webServer = await startServer(validConfig);
		const server = webServer.server;

		const socket: any = new EventEmitter();
		socket.destroy = vi.fn();
		vi.spyOn(socket, 'on');

		server.emit('connection', socket);

		// Do NOT emit close

		await webServer.shutdown();

		// Should be destroyed by shutdown
		expect(socket.destroy).toHaveBeenCalled();
	});

	it('should call next() in adminRoute redirect middleware', async () => {
		const config: configType = {
			port: 0,
			adminRoute: '/admin',
			loggerFilename: '',
			uploadFileSizeLimit: 1024,
			routeStatic: [],
			routePlSql: [],
		};

		// @ts-expect-error - accessing private process.exit
		vi.spyOn(process, 'exit').mockImplementation(() => {
			/* empty */
		});

		const webServer = await startServer(config);
		const res = await request(webServer.app).get('/admin/subpath');

		expect(res.status).not.toBe(302);

		// Exercise closeAllConnections with an active connection

		const socket = new EventEmitter() as any;
		socket.destroy = vi.fn();
		webServer.server.emit('connection', socket);

		await webServer.shutdown();
		expect(socket.destroy).toHaveBeenCalled();
	});
});
