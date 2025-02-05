export class RequestError extends Error {
    /**
     * @param {string} message - The error message.
     */
    constructor(message: string);
    /** @type {Date} */
    timestamp: Date;
}
