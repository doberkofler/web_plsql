#!/usr/bin/env node
/**
 * Development Server for web_plsql Frontend
 *
 * This server provides a mock Oracle backend for frontend development.
 * It enables the Vite dev server to proxy API requests without requiring
 * a real Oracle database connection.
 */

// Enable mock Oracle
process.env.MOCK_ORACLE = 'true';

// Dynamic imports to ensure env var is picked up
const {startServer} = await import('../src/backend/server/server.ts');
const {setExecuteCallback} = await import('../src/backend/util/oracledb-provider.ts');
const {createMockProcedureCallback} = await import('./mockProcedures.ts');

const DEV_PORT = 3001;
const DEFAULT_PAGE = '$.help';

/**
 * Start the development server.
 */
const startDevServer = async (): Promise<void> => {
	console.log('🚀 Starting web_plsql Development Server...\n');

	// Configure mock Oracle callback
	setExecuteCallback(createMockProcedureCallback());

	// Configure AdminContext for dev
	const devConfig = {
		port: DEV_PORT,
		devMode: true,
		routeStatic: [
			{
				route: '/static',
				directoryPath: 'dev/static',
			},
		],
		routePlSql: [
			{
				route: '/sample',
				user: 'dev',
				password: 'dev',
				connectString: 'localhost:1521/DEV',
				defaultPage: DEFAULT_PAGE,
				documentTable: 'docs',
				errorStyle: 'debug' as const,
			},
		],
		loggerFilename: '',
		adminRoute: '/admin',
	};

	// Start server
	await startServer(devConfig);

	console.log('✅ Development server started successfully!\n');
	console.log('📍 Routes:');
	console.log(`   Backend:            http://localhost:${DEV_PORT}`);
	console.log(`   Admin Console:      http://localhost:${DEV_PORT}/admin/`);
	console.log(`   Static Assets:      http://localhost:${DEV_PORT}/static/`);
	console.log(`   PL/SQL Procedures:  http://localhost:${DEV_PORT}/sample/`);
	console.log(`   Default Page:       http://localhost:${DEV_PORT}/sample/ → $.help`);
	console.log('');
	console.log('📦 Special Package ($ prefix):');
	console.log('   $.help              Help and usage instructions');
	console.log('   $.health            Server health status (JSON)');
	console.log('');
	console.log('📦 API Package Examples:');
	console.log('   api.html            Sample HTML content');
	console.log('   api.json            Sample JSON data');
	console.log('   api.files           Download sample text file');
	console.log('');
	console.log('📦 Mock Error Testing (_mock_ prefix):');
	console.log('   _mock_.not_found    ORA-06564: object does not exist');
	console.log('   _mock_.db_error     ORA-01017: connection error');
	console.log('   _mock_.slow?ms=N    Delayed response (N milliseconds)');
	console.log('');
	console.log('🎨 Frontend Dev:     npm run dev:frontend');
	console.log('   Then open:         http://localhost:5173/admin/');
	console.log('');
	console.log('💡 Press Ctrl+C to stop\n');
};

// Error handling
process.on('unhandledRejection', (reason, promise) => {
	console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
	process.exit(1);
});

process.on('uncaughtException', (error) => {
	console.error('❌ Uncaught Exception:', error);
	process.exit(1);
});

// Start the server
startDevServer().catch((error: unknown) => {
	console.error('❌ Failed to start development server:', error);
	process.exit(1);
});

// eslint-disable-next-line unicorn/require-module-specifiers
export {};
