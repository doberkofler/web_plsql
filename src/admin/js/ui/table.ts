/**
 * Column configuration for the DataTable.
 */
export type TableColumn<T> = {
	/** Unique identifier for the column */
	id: string;
	/** Header text to display */
	header: string;
	/** Tooltip for the column header */
	headerTitle?: string;
	/** Optional fixed width (e.g., '80px') */
	width?: string;
	/** Text alignment */
	align?: 'left' | 'center' | 'right';
	/** Custom CSS classes for the cell */
	className?: string | ((row: T) => string);
	/** Function to get the cell content (HTML string) */
	render?: (row: T) => string;
	/** Function to get the raw value (text content) */
	accessor?: (row: T) => string | number | undefined | null;
	/** Tooltip for the data cell */
	cellTitle?: (row: T) => string;
};

/**
 * Options for the DataTable.
 */
export type TableOptions<T> = {
	/** Array of column definitions */
	columns: TableColumn<T>[];
	/** Enable compact/dense layout */
	dense?: boolean;
	/** Callback when a row is clicked */
	onRowClick?: (row: T) => void;
};

/**
 * A reusable, configuration-driven data table component.
 */
export class DataTable<T> {
	private element: HTMLTableElement | null = null;

	/**
	 * Creates a new DataTable instance.
	 *
	 * @param elementId - The ID of the table element in the DOM.
	 * @param options - Configuration options for the table.
	 */
	constructor(
		private elementId: string,
		private options: TableOptions<T>,
	) {}

	/**
	 * Mounts the table to the DOM and renders the provided data.
	 *
	 * @param data - The array of data to display.
	 */
	render(data: T[]): void {
		this.element = document.getElementById(this.elementId) as HTMLTableElement;
		if (!this.element) return;

		// Apply dense class if enabled
		if (this.options.dense) {
			this.element.classList.add('dense-table');
		} else {
			this.element.classList.remove('dense-table');
		}

		this.renderHeader();
		this.renderBody(data);
	}

	/**
	 * Renders the table header.
	 */
	private renderHeader(): void {
		if (!this.element) return;

		let thead = this.element.querySelector('thead');
		if (!thead) {
			thead = document.createElement('thead');
			this.element.appendChild(thead);
		}

		thead.innerHTML = '';
		const tr = document.createElement('tr');

		this.options.columns.forEach((col) => {
			const th = document.createElement('th');
			th.textContent = col.header;
			if (col.headerTitle) {
				th.title = col.headerTitle;
			}
			if (col.width) {
				th.style.width = col.width;
			}
			if (col.align) {
				th.style.textAlign = col.align;
			}
			tr.appendChild(th);
		});

		thead.appendChild(tr);
	}

	/**
	 * Renders the table body.
	 *
	 * @param data - The data to render.
	 */
	private renderBody(data: T[]): void {
		if (!this.element) return;

		let tbody = this.element.querySelector('tbody');
		if (!tbody) {
			tbody = document.createElement('tbody');
			this.element.appendChild(tbody);
		}

		tbody.innerHTML = '';

		data.forEach((row) => {
			const tr = document.createElement('tr');

			// Add row click handler if provided
			if (this.options.onRowClick) {
				tr.style.cursor = 'pointer';
				tr.addEventListener('click', () => {
					if (this.options.onRowClick) {
						this.options.onRowClick(row);
					}
				});
				// Add hover effect class usually handled by CSS, but good to ensure
				tr.classList.add('table-row-hover');
			}

			this.options.columns.forEach((col) => {
				const td = document.createElement('td');

				// Content
				if (col.render) {
					td.innerHTML = col.render(row);
				} else if (col.accessor) {
					const val = col.accessor(row);
					td.textContent = val !== undefined && val !== null ? String(val) : '';
				}

				// Styling
				if (col.className) {
					const className = typeof col.className === 'function' ? col.className(row) : col.className;
					if (className) {
						td.className = className;
					}
				}

				// Alignment
				if (col.align) {
					td.style.textAlign = col.align;
				}

				// Tooltip
				if (col.cellTitle) {
					td.title = col.cellTitle(row);
				}

				tr.appendChild(td);
			});

			tbody.appendChild(tr);
		});
	}
}
