/**
 *	Is the given value a string or an array of strings
 *	@param {unknown} value - The value to check.
 *	@returns {value is string | string[]} - True if the value is a string or an array of strings
 */
export const isStringOrArrayOfString = (value) => typeof value === 'string' || (Array.isArray(value) && value.every((element) => typeof element === 'string'));
