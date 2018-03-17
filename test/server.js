// @flow

const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const multipart = require('connect-multiparty');
const cookieParser = require('cookie-parser');
const compression = require('compression');

// $FlowFixMe
const oracledb = require('../lib/oracledb_mock');
// $FlowFixMe
const webplsql = require('../lib');

const assert = require('chai').assert;
const request = require('supertest');

const PORT = 8765;
const PATH = '/base';
const DEFAULT_PAGE = 'sample.pageIndex';
const DOC_TABLE = 'docTable';

type serverConfigType = {
	app: express$Application,
	server: Server,
	connectionPool: oracledb.ConnectionPool
}

describe('server utilities', () => {
	it('should start a server', async () => {
		const serverConfig = await serverStart();

		assert.strictEqual(Object.prototype.toString.call(serverConfig), '[object Object]');
		assert.strictEqual(Object.prototype.toString.call(serverConfig.app.listen), '[object Function]');
		assert.strictEqual(Object.prototype.toString.call(serverConfig.server), '[object Object]');
		assert.isTrue(serverConfig.connectionPool instanceof oracledb.ConnectionPool);

		await serverStop(serverConfig);
	});
});

describe('server static', () => {
	let serverConfig;

	before('Start the server', async () => {
		serverConfig = await serverStart();
	});

	beforeEach('Reset the execute callback', () => {
		oracledb.setExecuteCallback();
	});

	after('Stop the server', async () => {
		await serverStop(serverConfig);
	});

	it('"GET /static/static.html" should return the static file /test/static/static.html', () => {
		const test = request(serverConfig.app).get('/static/static.html');

		return test.expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it('"GET /static/does-not-exist" should report a 404 error', () => {
		const test = request(serverConfig.app).get('/static/file_does_not_exist.html');

		return test.expect(404);
	});

	it(`"GET ${PATH}/${DEFAULT_PAGE} should return the main page`, () => {
		const executeOutBinds = {
			fileType: null,
			fileSize: null,
			fileBlob: null,
			lines: [
				'Content-type: text/html; charset=UTF-8\n',
				'\n',
				'<html><body><p>static</p></body></html>\n',
			],
			irows: 3
		};

		const test = executeRequest(serverConfig.app, `${PATH}/${DEFAULT_PAGE}`, executeOutBinds);

		return test.expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it(`"GET ${PATH} should return the default page`, () => {
		const test = request(serverConfig.app).get(PATH);

		return test.expect(302, `Found. Redirecting to ${PATH}/${DEFAULT_PAGE}`);
	});

	it(`"GET ${PATH}/${DEFAULT_PAGE}?p1=1&p2=2 should return the default page with the arguments a=1 and b=2`, () => {
		oracledb.setExecuteCallback((sql, bindParams) => {
			if (sql.indexOf('dbms_utility.name_resolve') !== -1) {
				return {
					outBinds: {
						names: ['a', 'b'],
						types: ['1', '2']
					}
				};
			}

			if (sql.indexOf('sample.pageIndex(a=>:p1,b=>:p2);') !== -1 && bindParams.p1.val === '1' && bindParams.p2.val === '2') {
				return {
					outBinds: {
						fileType: null,
						fileSize: null,
						fileBlob: null,
						lines: [
							'Content-type: text/html; charset=UTF-8\n',
							'\n',
							'<html><body><p>static</p></body></html>\n',
						],
						irows: 3
					}
				};
			}

			return {};
		});

		const test = request(serverConfig.app).get(`${PATH}/${DEFAULT_PAGE}?a=1&b=2`);

		return test.expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});


	/*

		describe('GET /sampleRoute/arrayPage', () => {
			let args = {para: ['value1', 'value2']};

			it('should return the array page', function (done) {
				request(application.expressApplication).get('/sampleRoute/arrayPage?para=value1&para=value2')
					.expect(200, 'array page\n' + util.inspect(args), done);
			});
		});

		describe('GET /sampleRoute/redirect', () => {
			it('should redirect to another page', function (done) {
				request(application.expressApplication).get('/sampleRoute/redirect')
					.expect(302, done);
			});
		});

		describe('GET /sampleRoute/json', () => {
			it('should parse JSON', function (done) {
				request(application.expressApplication).get('/sampleRoute/json')
					.expect(200, '{"name":"johndoe"}', done);
			});
		});

		describe('POST /sampleRoute/form_urlencoded', () => {
			it('should return a form with fields', function (done) {
				let test = request(application.expressApplication).post('/sampleRoute/form_urlencoded');

				test.set('Content-Type', 'application/x-www-form-urlencoded');
				test.send('name=johndoe');

				test.expect(200, '{"name":"johndoe"}', done);
			});
		});

		describe('POST /sampleRoute/multipart_form_data', () => {
			it('should return a multipart form with files', function (done) {
				let test = request(application.expressApplication).post('/sampleRoute/multipart_form_data');

				test.set('Content-Type', 'multipart/form-data; boundary=foo');
				test.write('--foo\r\n');
				test.write('Content-Disposition: form-data; name="user_name"\r\n');
				test.write('\r\n');
				test.write('Tobi');
				test.write('\r\n--foo\r\n');
				test.write('Content-Disposition: form-data; name="text"; filename="test/server.js"\r\n');
				test.write('\r\n');
				test.write('some text here');
				test.write('\r\n--foo--');

				test.expect(200, 'server.js', done);
			});
		});

		describe('GET /sampleRoute/cgi', () => {
			it('GET /sampleRoute/cgi should validate the cgi', function (done) {
				request(application.expressApplication).get('/sampleRoute/cgi')
					.expect(200, 'cgi', done);
			});
		});

	});

	describe('basic authorization', () => {
		describe('GET /basicRoute/basicPage unauthorized', () => {
			it('GET /basicRoute/basicPage should generate a 401 error', function (done) {
				request(application.expressApplication)
					.get('/basicRoute/basicPage')
					.expect(401, 'Access denied', done);
			});
		});

		describe('GET /basicRoute/basicPage authorize', () => {
			it('GET /basicRoute/basicPage should authorize', function (done) {
				request(application.expressApplication)
					.get('/basicRoute/basicPage')
					.auth('myusername', 'mypassword')
					.expect(200, done);
			});
		});

	});

	describe('file upload', () => {
		describe('Upload files (POST /sampleRoute/fileUpload)', () => {
			it('should upload files', function (done) {
				const FILENAME = 'temp/index.html';
				const CONTENT = 'content of index.html';
				let test;

				// create a static file
				mkdirp.sync('temp');
				fs.writeFileSync(FILENAME, CONTENT);

				// test the upload
				test = request(application.expressApplication).post('/sampleRoute/fileUpload');
				test.attach('file', FILENAME);
				test.expect(200, done);
			});
		});

	});

	describe('errors', () => {
		describe('GET /invalidRoute', () => {
			it('should respond with 404', function (done) {
				let test = request(application.expressApplication).get('/invalidRoute');

				test.expect(404, new RegExp('.*404 Not Found.*'), done);
			});
		});

		describe('GET /sampleRoute/errorInPLSQL', () => {
			it('should respond with 404', function (done) {
				let test = request(application.expressApplication).get('/sampleRoute/errorInPLSQL');

				test.expect(404, new RegExp('.*Failed to parse target procedure.*'), done);
			});
		});

		describe('GET /sampleRoute/internalError', () => {
			it('should respond with 500', function (done) {
				let test = request(application.expressApplication).get('/sampleRoute/internalError');

				test.expect(500, done);
			});
		});

	});

	describe('start server with no routes', () => {
		it('does stop', function (done) {
			server.stop(application, () => {
				application = null;
				assert.ok(true);
				done();
			});
		});
	});

	describe('start server with invalid options', () => {
		it('does not start', function (done) {
			server.start().then(() => {
			}, function (err) {
				assert.strictEqual(err, 'Configuration object must be an object');
				done();
			});
		});
	});

	*/
});

/*
*	Start server
*/
async function serverStart(): Promise<serverConfigType> {
	// create connection pool
	const connectionPool = await oracledb.createPool({
		user: 'sample',
		password: 'sample',
		connectString: 'localhost:1521/TEST'
	});

	// create express app
	const app = express();

	// add middleware
	app.use(multipart());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(cookieParser());
	app.use(compression());

	// add the oracle pl/sql express middleware
	app.use(PATH + '/:name?', webplsql(connectionPool, {
		trace: 'test',
		defaultPage: DEFAULT_PAGE,
		doctable: DOC_TABLE
	}));

	// serving static files
	const staticResourcesPath = path.join(process.cwd(), 'test', 'static');
	console.log(staticResourcesPath);
	app.use('/static', express.static(staticResourcesPath));

	// listen on port
	const server = app.listen(PORT);

	return {
		app,
		server,
		connectionPool
	};
}

/*
*	Stop server
*/
async function serverStop(config: serverConfigType) {
	await config.server.close();
	await config.connectionPool.close();
}

/*
*	Execute a request
*/
function executeRequest(app: express$Application, url: string, executeOutBinds: ?Object, getArgumentsOutBinds: ?Object) {
	if (executeOutBinds) {
		executeOutBinds = {outBinds: executeOutBinds};
	} else {
		executeOutBinds = {};
	}

	if (getArgumentsOutBinds) {
		getArgumentsOutBinds = {outBinds: getArgumentsOutBinds};
	} else {
		getArgumentsOutBinds = {outBinds: {names: [], types: []}};
	}

	oracledb.setExecuteCallback(sql => {
		if (/.*dbms_utility\.name_resolve.*/.test(sql)) {
			return getArgumentsOutBinds;
		} else if (/.*-- execute the procedure.*/.test(sql)) {
			return executeOutBinds;
		}

		return {};
	});

	return request(app).get(url);
}
