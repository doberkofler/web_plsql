import type {SystemMetrics} from '../types.ts';

/**
 * Update the minimum and maximum metrics based on the current metrics.
 *
 * @param current - The current system metrics.
 * @param min - The object storing minimum values.
 * @param max - The object storing maximum values.
 */
export function updateMinMaxMetrics(current: SystemMetrics, min: Partial<SystemMetrics>, max: Partial<SystemMetrics>): void {
	const keys = Object.keys(current) as (keyof SystemMetrics)[];
	keys.forEach((key) => {
		const val = current[key];
		const currentMin = min[key];
		const currentMax = max[key];

		if (currentMin === undefined || val < currentMin) {
			min[key] = val;
		}
		if (currentMax === undefined || val > currentMax) {
			max[key] = val;
		}
	});
}
