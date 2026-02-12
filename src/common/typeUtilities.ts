/**
 * Makes selected keys optional while preserving strict typing.
 */
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
