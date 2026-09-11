import type {Server} from 'node:http';
import type {AddressInfo} from 'node:net';

import request from 'supertest';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {startServer} from './server.js';
import type {webServer} from './server.js';

describe('setupRawExtensions actual Express behavior', () => {
	let serverInstance: webServer;
	let rawBodyWasUndefined = false;
	let rawFilesWereUndefined = false;
	let rawCookiesWereUndefined = false;
	let downstreamRawRouteReached = false;
	let initialized = false;

	beforeAll(async () => {
		serverInstance = await startServer({
			port: 0,
			devMode: true,
			routePlSql: [],
			routeStatic: [],
			setupRawExtensions: async (app) => {
				await Promise.resolve();
				initialized = true;

				app.post('/raw-json', async (req, res) => {
					rawBodyWasUndefined = req.body === undefined;
					rawFilesWereUndefined = req.files === undefined;
					rawCookiesWereUndefined = req.cookies === undefined;
					const chunks: Buffer[] = [];
					for await (const chunk of req) {
						chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
					}
					res.status(202).set('X-Raw-Handler', 'true').type('application/octet-stream').send(Buffer.concat(chunks));
				});

				app.post('/fall-through', (_req, _res, next) => next());

				app.get('/stream', (_req, res) => {
					res.type('text/plain');
					res.write('first');
					res.write('-second');
					res.end('-third');
				});

				app.get('/initialized', (_req, res) => res.json({initialized}));
			},
			setupExtensions: (app) => {
				app.post('/raw-json', (_req, res) => {
					downstreamRawRouteReached = true;
					res.status(500).send('downstream route reached');
				});
				app.post('/fall-through', (req, res) => res.json({body: req.body, cookies: req.cookies}));
			},
		});
	});

	afterAll(async () => {
		serverInstance.adminContext.statsManager.stop();
		await new Promise<void>((resolve, reject) => {
			(serverInstance.server as Server).close((error) => {
				if (error) reject(error);
				else resolve();
			});
		});
	});

	it('provides the original JSON bytes before standard middleware and can complete the response', async () => {
		const serialized = '{"event":"raw","sequence":1}';
		const response = await request(serverInstance.app).post('/raw-json').set('Content-Type', 'application/json').set('Cookie', 'session=raw').send(serialized);

		expect(response.status).toBe(202);
		expect(response.headers['x-raw-handler']).toBe('true');
		expect(response.body).toEqual(Buffer.from(serialized));
		expect(rawBodyWasUndefined).toBe(true);
		expect(rawFilesWereUndefined).toBe(true);
		expect(rawCookiesWereUndefined).toBe(true);
		expect(downstreamRawRouteReached).toBe(false);
		expect(response.headers['content-encoding']).toBeUndefined();
	});

	it('parses JSON and cookies after a raw middleware falls through without consuming the stream', async () => {
		const response = await request(serverInstance.app).post('/fall-through').set('Cookie', 'session=normal').send({message: 'parsed'});

		expect(response.status).toBe(200);
		expect(response.body).toEqual({body: {message: 'parsed'}, cookies: {session: 'normal'}});
	});

	it('delivers an ordered streaming response', async () => {
		const response = await request(serverInstance.app).get('/stream');

		expect(response.status).toBe(200);
		expect(response.text).toBe('first-second-third');
	});

	it('finishes asynchronous initialization before serving the first request', async () => {
		const response = await request(serverInstance.app).get('/initialized');

		expect(response.status).toBe(200);
		expect(response.body).toEqual({initialized: true});
	});

	it('preserves the existing unknown-route response', async () => {
		const response = await request(serverInstance.app).get('/unknown-route');

		expect(response.status).toBe(404);
		expect(response.text).toContain('Cannot GET /unknown-route');
	});

	it('listens on an ephemeral port without creating Oracle pools', () => {
		const address = serverInstance.server.address();
		expect(address).not.toBeNull();
		if (!address || typeof address === 'string') throw new Error('Expected an ephemeral TCP address');
		expect((address as AddressInfo).port).toBeGreaterThan(0);
		expect(serverInstance.connectionPools).toEqual([]);
	});
});