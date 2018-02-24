// @flow

/*
*	Error handling
*/

function getErrorMessage(msg: string, err?: Error): string {
	// error message
	let errorMessage = (typeof msg === 'string' && msg.length > 0) ? msg : '';

	// stack trace
	if (!(err instanceof Error)) {
		err = new Error();
	}
	errorMessage += '\n' + err.toString() + '\n' + err.stack;

	return errorMessage;
}

function errorPage(res: $Response, msg: string, err?: Error): void {
	const errorMessage = getErrorMessage(msg, err);

	console.error(errorMessage);

	res.status(500).send(errorMessage);
}

function exit(msg: string, err?: Error): void {
	console.error(getErrorMessage(msg, err));

	process.exit(1);
}

module.exports = {
	getErrorMessage: getErrorMessage,
	errorPage: errorPage,
	exit: exit
};
