/**
 * @file Load testing CLI tool for web_plsql.
 * This tool simulates parallel traffic to the middleware and provides real-time statistics.
 */

import {performance} from 'node:perf_hooks';

/**
 * @typedef {object} Metrics
 * @property {number} total Total requests made.
 * @property {number} success Number of successful requests (2xx).
 * @property {number} error Number of failed requests.
 * @property {number} minLatency Minimum latency in milliseconds.
 * @property {number} maxLatency Maximum latency in milliseconds.
 * @property {number} sumLatency Sum of all latencies for average calculation.
 * @property {Map<string|number, number>} statusCodes Frequency of status codes.
 */

/** @type {Metrics} */
const metrics = {
	total: 0,
	success: 0,
	error: 0,
	minLatency: Number.MAX_SAFE_INTEGER,
	maxLatency: 0,
	sumLatency: 0,
	statusCodes: new Map(),
};

let stopped = false;

/**
 * Parse CLI arguments.
 * @returns {{ url: string, concurrency: number, duration: number }} Options object.
 */
function parseArgs() {
	const args = process.argv.slice(2);
	const options = {
		url: '',
		concurrency: 10,
		duration: 30,
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		const nextArg = args[i + 1] ?? '';

		if (arg === '--url' || arg === '-u') {
			options.url = nextArg;
			i++;
		} else if (arg === '--concurrency' || arg === '-c') {
			options.concurrency = parseInt(nextArg, 10);
			i++;
		} else if (arg === '--duration' || arg === '-d') {
			options.duration = parseInt(nextArg, 10);
			i++;
		}
	}

	if (!options.url) {
		console.error('Usage: node src/bin/load-test.js --url <url> [-c concurrency] [-d duration]');
		process.exit(1);
	}

	return options;
}

/**
 * Record a single request's result.
 * @param {boolean} ok Whether the request succeeded.
 * @param {number} latency Latency in milliseconds.
 * @param {number|string} status Status code or error string.
 */
function recordMetrics(ok, latency, status) {
	metrics.total++;
	if (ok) {
		metrics.success++;
	} else {
		metrics.error++;
	}

	metrics.minLatency = Math.min(metrics.minLatency, latency);
	metrics.maxLatency = Math.max(metrics.maxLatency, latency);
	metrics.sumLatency += latency;

	const count = metrics.statusCodes.get(status) ?? 0;
	metrics.statusCodes.set(status, count + 1);
}

/**
 * Clear the console and move cursor to the top.
 */
function clearConsole() {
	process.stdout.write('\x1b[2J\x1b[0;0H');
}

/**
 * Render the dashboard.
 * @param {number} elapsed Elapsed time in seconds.
 * @param {number} duration Total duration in seconds.
 * @param {string} url Target URL.
 * @param {number} concurrency Concurrency level.
 */
function renderDashboard(elapsed, duration, url, concurrency) {
	clearConsole();
	const rps = elapsed > 0 ? (metrics.total / elapsed).toFixed(1) : '0.0';
	const avgLatency = metrics.total > 0 ? (metrics.sumLatency / metrics.total).toFixed(1) : '0.0';
	const progress = Math.min(100, (elapsed / duration) * 100).toFixed(1);
	const barWidth = 30;
	const filledWidth = Math.floor((barWidth * parseFloat(progress)) / 100);
	const bar = '='.repeat(filledWidth) + '>'.padEnd(barWidth - filledWidth, ' ');

	console.log('\x1b[1m\x1b[36mWeb PL/SQL Load Test\x1b[0m');
	console.log('='.repeat(40));
	console.log(`\x1b[33mURL:\x1b[0m         ${url}`);
	console.log(`\x1b[33mConcurrency:\x1b[0m ${concurrency}`);
	console.log(`\x1b[33mDuration:\x1b[0m    ${duration}s`);
	console.log('='.repeat(40));
	console.log(`\x1b[32mProgress:\x1b[0m    [${bar}] ${progress}% (${elapsed.toFixed(1)}s)`);
	console.log(`\x1b[32mRPS:\x1b[0m         ${rps}`);
	console.log(`\x1b[32mTotal:\x1b[0m       ${metrics.total}`);
	console.log(`\x1b[32mSuccess:\x1b[0m     ${metrics.success}`);
	console.log(`\x1b[31mErrors:\x1b[0m      ${metrics.error}`);
	console.log('='.repeat(40));
	console.log('\x1b[1mLatency (ms)\x1b[0m');
	console.log(`\x1b[34mAvg:\x1b[0m ${avgLatency.padStart(8)}`);
	console.log(`\x1b[34mMin:\x1b[0m ${(metrics.minLatency === Number.MAX_SAFE_INTEGER ? 0 : metrics.minLatency).toFixed(1).padStart(8)}`);
	console.log(`\x1b[34mMax:\x1b[0m ${metrics.maxLatency.toFixed(1).padStart(8)}`);
	console.log('='.repeat(40));

	if (metrics.statusCodes.size > 0) {
		console.log('\x1b[1mStatus Codes\x1b[0m');
		for (const [code, count] of metrics.statusCodes.entries()) {
			const numericCode = typeof code === 'number' ? code : 0;
			const color = numericCode >= 200 && numericCode < 300 ? '\x1b[32m' : '\x1b[31m';
			console.log(`${color}${code}\x1b[0m: ${count}`);
		}
	}
}

/**
 * Worker function to maintain concurrency.
 * @param {string} url The target URL.
 * @param {number} endTime The end time in milliseconds.
 */
async function runWorker(url, endTime) {
	while (performance.now() < endTime && !stopped) {
		const start = performance.now();
		try {
			const res = await fetch(url, {
				signal: AbortSignal.timeout(10000), // 10s timeout
			});
			const latency = performance.now() - start;
			recordMetrics(res.ok, latency, res.status);
			// Consume body to free up connection
			await res.arrayBuffer();
		} catch (err) {
			const latency = performance.now() - start;
			const errorName = err instanceof Error ? err.name : 'UnknownError';
			recordMetrics(false, latency, errorName === 'TimeoutError' ? 'Timeout' : 'NetworkErr');
		}
	}
}

/**
 * Main function.
 */
async function main() {
	const options = parseArgs();
	const startTime = performance.now();
	const endTime = startTime + options.duration * 1000;

	console.log(`Starting load test on ${options.url}...`);

	// Start workers
	const workers = Array.from({length: options.concurrency}, () => runWorker(options.url, endTime));

	// Dashboard refresh interval
	const uiInterval = setInterval(() => {
		const elapsed = (performance.now() - startTime) / 1000;
		renderDashboard(elapsed, options.duration, options.url, options.concurrency);
	}, 200);

	// Handle Ctrl+C
	process.on('SIGINT', () => {
		stopped = true;
		console.log('\nStopping...');
	});

	await Promise.all(workers);
	clearInterval(uiInterval);

	// Final render
	const finalElapsed = (performance.now() - startTime) / 1000;
	renderDashboard(finalElapsed, options.duration, options.url, options.concurrency);
	console.log('\n\x1b[1m\x1b[32mTest Complete!\x1b[0m\n');
}

main().catch((/** @type {unknown} */ err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
