/**
 * Config value template.
 *
 * @param value - The configuration value to render.
 * @returns HTML string representation.
 */
export function renderConfigValue(value: unknown): string {
	if (value === undefined || value === null) return '-';

	if (Array.isArray(value)) {
		return `
            <div class="flex flex-col gap-2">
                ${value.map((v) => `<div class="p-2 bg-hover rounded border">${renderConfigValue(v)}</div>`).join('')}
            </div>
        `;
	}

	if (typeof value === 'object') {
		return `
            <table class="inner-config-table">
                ${Object.entries(value)
					.map(
						([k, v]) => `
                    <tr>
                        <td class="font-semibold text-main" style="width: 120px">${k}</td>
                        <td class="font-mono">${typeof v === 'string' && v.includes('***') ? v : JSON.stringify(v)}</td>
                    </tr>
                `,
					)
					.join('')}
            </table>
        `;
	}

	if (typeof value !== 'string') {
		throw new Error(`Unexpected non-string value: ${typeof value}`);
	}

	return value;
}
