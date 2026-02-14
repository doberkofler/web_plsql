declare global {
	var __VERSION__: string;
}

if (typeof globalThis.__VERSION__ === 'undefined') {
	globalThis.__VERSION__ = '**development**';
}

declare const __VERSION__: string;

/**
 * Returns the current library version
 * @returns {string} - Version.
 */
export const getVersion = () => __VERSION__;
