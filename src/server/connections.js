/**
 * @typedef {import('node:net').Socket} Socket
 */

/**
 * @param {string} id - id
 * @param {string} ip - address
 * @param {string} port - port
 * @param {string} read - bytes read
 * @param {string} written - bytes written
 */
const line = (id, ip, port, read, written) => {
	console.log(`${id.padStart(3)}  ${ip.padEnd(15)}  ${port.padStart(5)}  ${read.padStart(10)}  ${written.padStart(10)}`);
};

/**
 * Show connections.
 * @param {Set<Socket>} connections - The connections.
 * @returns {void}
 */
export const showConnections = (connections) => {
	if (connections.size === 0) {
		console.log('No open connections.');
		return;
	}

	// Print header
	line('ID', 'IP', 'Port', 'Read', 'Written');

	let i = 0;
	for (const socket of connections) {
		line(
			(i++).toString(),
			socket.remoteAddress ?? '',
			typeof socket.remotePort === 'number' ? socket.remotePort.toFixed() : '',
			socket.bytesRead.toFixed(),
			socket.bytesWritten.toFixed(),
		);
	}
};
