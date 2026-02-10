/**
 *	Is the given value a string or an array of strings
 *	@param value - The value to check.
 *	@returns True if the value is a string or an array of strings
 */
export const isStringOrArrayOfString = (value: unknown): value is string | string[] =>
	typeof value === 'string' || (Array.isArray(value) && value.every((element) => typeof element === 'string'));
