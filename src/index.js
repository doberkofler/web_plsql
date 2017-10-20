// @flow

//const debug = require('debug')('index');
const Database = require('./database');
const error = require('./error');

type $NextFunction = () => void;
type PlSqlMiddleware$options = {
	user: string,
	password: string,
	connectString: string
};

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection: ', reason);
	error(p);
});

const database = new Database();

module.exports = function (options: PlSqlMiddleware$options) {
	return function (req: $Request, res: $Response, next: $NextFunction) {
		middleware(req, res, next, options);
	};
};

async function middleware(req: $Request, res: $Response, next: $NextFunction, options: PlSqlMiddleware$options) {
	if (req.method === 'GET') {
		try {
			await database.open(options.user, options.password, options.connectString);

			const result = await database.execute('SELECT SYSDATE FROM DUAL', []);

			res.send(`Current date and time: "${result.rows[0][0]}"`);

			await database.close();
		} catch (err) {
			error(err);
		}
	} else {
		next();
	}
}
