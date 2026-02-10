import type { pageType } from '../../types.ts';
/**
 *	Parse the header and split it up into the individual components
 *
 * @param text - The text returned from the PL/SQL procedure.
 * @returns The parsed page.
 */
export declare const parsePage: (text: string) => pageType;
