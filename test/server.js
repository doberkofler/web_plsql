// @flow

const os = require('os');
const path = require('path');
const util = require('util');
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
		// register an execute callback
		oracledb.setExecuteCallback(sql => {
			if (/.*dbms_utility\.name_resolve.*/.test(sql)) {
				// "procedure.getFixArgsPara"
				return {
					outBinds: {
						names: [],
						types: []
					}
				};
			} else if (/.*-- execute the procedure.*/.test(sql)) {
				// "execute the procedure"
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

		const test = request(serverConfig.app).get(`${PATH}/${DEFAULT_PAGE}`);

		return test.expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it(`"GET ${PATH} should return the default page`, () => {
		const test = request(serverConfig.app).get(PATH);

		return test.expect(302, `Found. Redirecting to ${PATH}/${DEFAULT_PAGE}`);
	});

/*
	describe('routes', function () {
		describe('default page (GET /sampleRoute)', function () {
			it('should return the default page', function (done) {
				let test = request(application.expressApplication).get('/sampleRoute');

				test.expect(302, 'Found. Redirecting to /sampleRoute/samplePage', done);
			});
		});

		describe('GET /sampleRoute/emptyPage', function () {
			it('GET /sampleRoute/emptyPage should return an empty page', function (done) {
				request(application.expressApplication).get('/sampleRoute/emptyPage')
					.expect(200, '', done);
			});
		});

		describe('GET /sampleRoute/samplePage', function () {
			it('GET /sampleRoute/samplePage should return the sample page', function (done) {
				request(application.expressApplication).get('/sampleRoute/samplePage')
					.expect(200, 'sample page', done);
			});
		});

		describe('GET /sampleRoute/completePage', function () {
			it('should return the complete page', function (done) {
				request(application.expressApplication).get('/sampleRoute/completePage?para=value')
					.expect(200, 'complete page', done);
			});
		});

		describe('GET /sampleRoute/arrayPage', function () {
			let args = {para: ['value1', 'value2']};

			it('should return the array page', function (done) {
				request(application.expressApplication).get('/sampleRoute/arrayPage?para=value1&para=value2')
					.expect(200, 'array page\n' + util.inspect(args), done);
			});
		});

		describe('GET /sampleRoute/redirect', function () {
			it('should redirect to another page', function (done) {
				request(application.expressApplication).get('/sampleRoute/redirect')
					.expect(302, done);
			});
		});

		describe('GET /sampleRoute/json', function () {
			it('should parse JSON', function (done) {
				request(application.expressApplication).get('/sampleRoute/json')
					.expect(200, '{"name":"johndoe"}', done);
			});
		});

		describe('POST /sampleRoute/form_urlencoded', function () {
			it('should return a form with fields', function (done) {
				let test = request(application.expressApplication).post('/sampleRoute/form_urlencoded');

				test.set('Content-Type', 'application/x-www-form-urlencoded');
				test.send('name=johndoe');

				test.expect(200, '{"name":"johndoe"}', done);
			});
		});

		describe('POST /sampleRoute/multipart_form_data', function () {
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

		describe('GET /sampleRoute/cgi', function () {
			it('GET /sampleRoute/cgi should validate the cgi', function (done) {
				request(application.expressApplication).get('/sampleRoute/cgi')
					.expect(200, 'cgi', done);
			});
		});

	});

	describe('basic authorization', function () {
		describe('GET /basicRoute/basicPage unauthorized', function () {
			it('GET /basicRoute/basicPage should generate a 401 error', function (done) {
				request(application.expressApplication)
					.get('/basicRoute/basicPage')
					.expect(401, 'Access denied', done);
			});
		});

		describe('GET /basicRoute/basicPage authorize', function () {
			it('GET /basicRoute/basicPage should authorize', function (done) {
				request(application.expressApplication)
					.get('/basicRoute/basicPage')
					.auth('myusername', 'mypassword')
					.expect(200, done);
			});
		});

	});

	describe('file upload', function () {
		describe('Upload files (POST /sampleRoute/fileUpload)', function () {
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

	describe('status page', function () {
		describe('GET /status', function () {
			it('should show the status page', function (done) {
				request(application.expressApplication)
					.get('/status')
					.expect(200)
					.end(function (err) {
						if (err) {
							return done(err);
						}
						return done();
					});
			});
		});

	});

	describe('shutdown from status page', function () {
		describe('GET /shutdown', function () {
			it('should show the shutdown page', function (done) {
				request(application.expressApplication)
					.get('/shutdown')
					.expect(200)
					.end(function (err) {
						if (err) {
							return done(err);
						}
						return done();
					});
			});
		});

	});

	describe('errors', function () {
		describe('GET /invalidRoute', function () {
			it('should respond with 404', function (done) {
				let test = request(application.expressApplication).get('/invalidRoute');

				test.expect(404, new RegExp('.*404 Not Found.*'), done);
			});
		});

		describe('GET /sampleRoute/errorInPLSQL', function () {
			it('should respond with 404', function (done) {
				let test = request(application.expressApplication).get('/sampleRoute/errorInPLSQL');

				test.expect(404, new RegExp('.*Failed to parse target procedure.*'), done);
			});
		});

		describe('GET /sampleRoute/internalError', function () {
			it('should respond with 500', function (done) {
				let test = request(application.expressApplication).get('/sampleRoute/internalError');

				test.expect(500, done);
			});
		});

	});

	describe('start server with no routes', function () {
		it('does stop', function (done) {
			server.stop(application, function () {
				application = null;
				assert.ok(true);
				done();
			});
		});
	});

	describe('start server with invalid options', function () {
		it('does not start', function (done) {
			server.start().then(function () {
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
*	Database callback when invoking a page
*/
function invokeCallback(database, procedure, args, cgi, files, doctablename, callback) {
	//console.log('invokeCallback: START\n' + util.inspect(arguments, {showHidden: false, depth: null, colors: true}) + '\"');

	switch (procedure.toLowerCase()) {
		case 'emptypage':
			callback(null, getPage(''));
			break;
		case 'samplepage':
			callback(null, getPage('sample page'));
			break;
		case 'basicpage':
			callback(null, getPage('basic page'));
			break;
		case 'completepage':
			callback(null, getPage('complete page', {'Content-Type': 'text/html', 'Set-Cookie': 'C1=V1'}));
			break;
		case 'arraypage':
			callback(null, getPage('array page\n' + util.inspect(args), {'Content-Type': 'text/html'}));
			break;
		case 'redirect':
			callback(null, getPage('', {'Location': 'www.google.com'}));
			break;
		case 'json':
			callback(null, getPage('{"name":"johndoe"}', {'Content-Type': 'application/json'}));
			break;
		case 'form_urlencoded':
			callback(null, getPage('{"name":"johndoe"}', {'Content-Type': 'text/html'}));
			break;
		case 'multipart_form_data':
			callback(null, getPage('server.js', {'Content-Type': 'text/html'}));
			break;
		case 'cgi':
			validateCGI(cgi);
			callback(null, getPage('cgi'), {'Content-Type': 'text/html'});
			break;
		case 'fileupload':
			callback(null, getPage('File "server.js" has been uploaded', {'Content-Type': 'text/html'}));
			break;
		case 'errorinplsql':
			callback(new Error('procedure not found'));
			break;
		case 'internalerror':
			throw new Error('internal error');
		default:
			console.log('==========> FATAL ERROR IN server.js: _invokeCallback received an invalid procedure=' + procedure);
			break;
	}

	//console.log('invokeCallback: END');
}

/*
*	Get database page
*/
function getPage(body, header) {
	let text = '',
		name;

	if (header) {
		for (name in header) {
			if (header.hasOwnProperty(name)) {
				text += name + ': ' + header[name] + '\n';
			}
		}
	}

	text += 'Content-type: text/html; charset=UTF-8\nX-DB-Content-length: ' + body.length + '\n\n' + body;

	return text;
}

/*
*	Validate the CGI
*/
function validateCGI(cgi) {
	const SERVER_PORT = '8999',
		ROUTE = 'sampleRoute';

	assert.strictEqual(cgi.PLSQL_GATEWAY, 'WebDb');
	assert.strictEqual(cgi.GATEWAY_IVERSION, '2');
	assert.strictEqual(cgi.SERVER_SOFTWARE, 'NodeJS-PL/SQL-Gateway');
	assert.strictEqual(cgi.GATEWAY_INTERFACE, 'CGI/1.1');
	assert.strictEqual(cgi.SERVER_PORT, SERVER_PORT);
	assert.strictEqual(cgi.SERVER_NAME, os.hostname());
	assert.strictEqual(cgi.REQUEST_METHOD, 'GET');
	assert.strictEqual(cgi.PATH_INFO, 'cgi');
	assert.strictEqual(cgi.SCRIPT_NAME, ROUTE);
	//	assert.strictEqual(cgi.REMOTE_ADDR, REMOTE_ADDRESS);
	assert.strictEqual(cgi.SERVER_PROTOCOL, 'HTTP/1.1');
	assert.strictEqual(cgi.REQUEST_PROTOCOL, 'HTTP');
	//	assert.strictEqual(cgi.REMOTE_USER, '');
	//	assert.strictEqual(cgi.HTTP_USER_AGENT, 'USER-AGENT');
	//	assert.strictEqual(cgi.HTTP_HOST, 'HOST');
	//	assert.strictEqual(cgi.HTTP_ACCEPT, 'ACCEPT');
	//	assert.strictEqual(cgi.HTTP_ACCEPT_ENCODING, 'ACCEPT-ENCODING');
	//	assert.strictEqual(cgi.HTTP_ACCEPT_LANGUAGE, 'ACCEPT-LANGUAGE');
	//	assert.strictEqual(cgi.HTTP_REFERER, '');
	assert.strictEqual(cgi.WEB_AUTHENT_PREFIX, '');
	assert.strictEqual(cgi.DAD_NAME, ROUTE);
	assert.strictEqual(cgi.DOC_ACCESS_PATH, 'doc');
	assert.strictEqual(cgi.DOCUMENT_TABLE, 'sampleDoctable');
	assert.strictEqual(cgi.PATH_ALIAS, '');
	assert.strictEqual(cgi.REQUEST_CHARSET, 'UTF8');
	assert.strictEqual(cgi.REQUEST_IANA_CHARSET, 'UTF-8');
	assert.strictEqual(cgi.SCRIPT_PREFIX, '/');
	assert.isUndefined(cgi.HTTP_COOKIE);
}
