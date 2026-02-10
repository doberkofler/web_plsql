import type {Socket} from 'node:net';

/**
 * @param id - id
 * @param ip - address
 * @param port - port
 * @param read - bytes read
 * @param written - bytes written
 */
const line = (id: string, ip: string, port: string, read: string, written: string) => {
	console.log(`${id.padStart(3)}  ${ip.padEnd(15)}  ${port.padStart(5)}  ${read.padStart(10)}  ${written.padStart(10)}`);
};

/**
 * Show connections.
 * @param connections - The connections.
 */
export const showConnections = (connections: Set<Socket>): void => {
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
