const oracledb = require('oracledb');
const dbConfig = require('./credentials.js');

async function run() {
	let connection;

	try {
		// Connect to database
		connection = await oracledb.getConnection(dbConfig);

		// Select some data
		binds = {};
		result = await connection.execute('SELECT sysdate FROM dual', binds, {});
		console.log('metadata: ', result.metaData);
		console.log('results: ');
		console.log(result.rows);
	} catch (err) {
		console.error(err);
	} finally {
		if (connection) {
			try {
				await connection.close();
			} catch (err) {
				console.error(err);
			}
		}
	}
}

run();
