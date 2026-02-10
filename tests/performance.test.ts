/**
 * @file Performance Regression Tests for web_plsql
 *
 * This test suite measures the performance overhead of the middleware itself,
 * isolating it from database and network latency by using a mocked database driver.
 *
 * STRATEGY:
 * 1. Mock the `oracledb` driver to return immediate responses without network I/O.
 * 2. Start the actual Express server (listening on a real port).
 * 3. Run a "warm-up" phase to allow JIT compilation and cache population.
 * 4. Execute a large number of requests using native `fetch` against the running server.
 *    (Using `fetch` instead of `supertest` avoids the overhead of creating new server instances per request).
 * 5. Measure latency and throughput.
 * 6. Assert against "soft" thresholds to detect significant regressions.
 *
 * USAGE:
 * Run this test via the npm script:
 *   npm run test:perf
 */

import {describe, it, beforeAll, afterAll, beforeEach, expect} from 'vitest';
import {performance} from 'node:perf_hooks';
import * as oracledb from './mock/oracledb.ts';
import {serverStart, serverStop, sqlExecuteProxy, PATH, DEFAULT_PAGE, PORT} from './server.ts';
import type {serverConfigType} from './server.ts';

const BASE_URL = `http://localhost:${PORT}`;

const skipPerf = !process.env.PERF_TEST;

describe('Performance Regression Tests', () => {
	let serverConfig: serverConfigType;

	beforeAll(async () => {
		if (skipPerf) return;
		// Start server with logging disabled to minimize noise/overhead
		serverConfig = await serverStart({log: false});
	});

	afterAll(async () => {
		if (serverConfig) {
			await serverStop(serverConfig);
		}
	});

	beforeEach(() => {
		// Reset the mock execution callback before each test
		oracledb.setExecuteCallback();
	});

	it.skipIf(skipPerf)('should maintain acceptable latency for sequential requests', {timeout: 30000}, async () => {
		// Configuration
		const ITERATIONS = 1000;
		const MAX_AVG_LATENCY_MS = 20;

		// Setup mock to return a simple page instantly
		sqlExecuteProxy({
			proc: 'sample.pageIndex();',
			lines: ['Content-type: text/html\n', '\n', '<html><body><p>fast</p></body></html>\n'],
		});

		// Warm-up phase
		for (let i = 0; i < 10; i++) {
			await fetch(`${BASE_URL}${PATH}/${DEFAULT_PAGE}`);
		}

		// Measurement Phase
		const start = performance.now();

		for (let i = 0; i < ITERATIONS; i++) {
			const res = await fetch(`${BASE_URL}${PATH}/${DEFAULT_PAGE}`);
			if (!res.ok) throw new Error(`Request failed: ${res.status}`);
			await res.text(); // Consume body
		}

		const end = performance.now();
		const duration = end - start;
		const avgLatency = duration / ITERATIONS;
		const rps = (ITERATIONS / duration) * 1000;

		console.log(`
---------------------------------------------------
Sequential Performance Results (${ITERATIONS} reqs):
  Total Duration: ${duration.toFixed(2)}ms
  Avg Latency:    ${avgLatency.toFixed(3)}ms
  Throughput:     ${rps.toFixed(0)} req/sec
---------------------------------------------------
        `);

		expect(avgLatency).toBeLessThan(MAX_AVG_LATENCY_MS);
	});

	it.skipIf(skipPerf)('should maintain acceptable throughput for concurrent requests', {timeout: 30000}, async () => {
		// Configuration
		const ITERATIONS = 2000;
		const BATCH_SIZE = 50;
		const MIN_RPS = 100;

		// Setup mock
		sqlExecuteProxy({
			proc: 'sample.pageIndex();',
			lines: ['Content-type: text/html\n', '\n', '<html><body><p>fast</p></body></html>\n'],
		});

		// Measurement Phase
		const start = performance.now();

		const requestFactory = async () => {
			const res = await fetch(`${BASE_URL}${PATH}/${DEFAULT_PAGE}`);
			if (!res.ok) throw new Error(`Request failed: ${res.status}`);
			await res.text(); // Consume body
		};

		// Process in concurrent batches
		for (let i = 0; i < ITERATIONS; i += BATCH_SIZE) {
			const batchPromises = [];
			for (let j = 0; j < BATCH_SIZE && i + j < ITERATIONS; j++) {
				batchPromises.push(requestFactory());
			}
			await Promise.all(batchPromises);
		}

		const end = performance.now();
		const duration = end - start;
		const rps = (ITERATIONS / duration) * 1000;

		console.log(`
---------------------------------------------------
Concurrent Performance Results (${ITERATIONS} reqs):
  Total Duration: ${duration.toFixed(2)}ms
  Batch Size:     ${BATCH_SIZE}
  Throughput:     ${rps.toFixed(0)} req/sec
---------------------------------------------------
        `);

		expect(rps).toBeGreaterThan(MIN_RPS);
	});
});
