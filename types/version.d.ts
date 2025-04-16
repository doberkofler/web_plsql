export function getPackageVersion(): string;
export function getExpressVersion(): string;
export type PackageJSON = {
    /**
     * - The package version.
     */
    version?: string;
};
