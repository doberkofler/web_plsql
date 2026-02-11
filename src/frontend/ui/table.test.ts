import {describe, it, expect, vi, beforeEach, type Mock} from 'vitest';
import {DataTable, TableColumn, TableOptions} from '../ui/table.ts';

// Mock DOM elements
class MockElement {
	tagName: string;
	children: MockElement[];
	style: Record<string, string>;
	private _className: string;
	classList: {
		add: Mock;
		remove: Mock;
		contains: (cls: string) => boolean;
		classes: string[];
	};
	innerHTML: string;
	textContent: string;
	title?: string;
	attributes: Record<string, string>;
	eventListeners: Record<string, (() => void)[]>;

	constructor(tagName: string) {
		this.tagName = tagName;
		this.children = [];
		this.style = {};
		this._className = '';
		this.classList = {
			add: vi.fn((cls: string) => {
				if (!this.classList.classes.includes(cls)) {
					this.classList.classes.push(cls);
					this._updateClassName();
				}
			}),
			remove: vi.fn((cls: string) => {
				const idx = this.classList.classes.indexOf(cls);
				if (idx > -1) {
					this.classList.classes.splice(idx, 1);
					this._updateClassName();
				}
			}),
			contains: (cls: string) => this.classList.classes.includes(cls),
			classes: [],
		};
		this.innerHTML = '';
		this.textContent = '';
		this.attributes = {};
		this.eventListeners = {};
	}

	get className(): string {
		return this._className;
	}

	set className(val: string) {
		this._className = val;
		this.classList.classes = val.split(' ').filter(Boolean);
	}

	private _updateClassName(): void {
		this._className = this.classList.classes.join(' ');
	}

	appendChild(child: MockElement): MockElement {
		this.children.push(child);
		return child;
	}

	querySelector(selector: string): MockElement | null {
		if (selector === 'thead') return this.children.find((c) => c.tagName === 'thead') ?? null;
		if (selector === 'tbody') return this.children.find((c) => c.tagName === 'tbody') ?? null;
		return null;
	}

	addEventListener(event: string, callback: () => void): void {
		if (!this.eventListeners[event]) {
			this.eventListeners[event] = [];
		}
		this.eventListeners[event]?.push(callback);
	}

	click(): void {
		this.eventListeners['click']?.forEach((cb) => cb());
	}
}

// Mock document
const mockDocument = {
	getElementById: vi.fn() as Mock,
	createElement: vi.fn((tagName: string) => new MockElement(tagName)) as Mock,
};

// Inject mock document into global scope
(global as unknown as {document: typeof mockDocument}).document = mockDocument;

type TestRow = {col1: string; col2: string};

describe('DataTable', () => {
	let tableElement: MockElement;
	let dataTable: DataTable<TestRow>;

	const columns = [
		{
			id: 'col1',
			header: 'Column 1',
			accessor: (row: TestRow) => row.col1,
		},
		{
			id: 'col2',
			header: 'Column 2',
			accessor: (row: TestRow) => row.col2,
		},
	];

	const data: TestRow[] = [
		{col1: 'val1', col2: 'val2'},
		{col1: 'val3', col2: 'val4'},
	];

	beforeEach(() => {
		vi.clearAllMocks();
		tableElement = new MockElement('table');
		mockDocument.getElementById.mockReturnValue(tableElement);
	});

	it('should render table header', () => {
		dataTable = new DataTable<TestRow>('my-table', {columns});
		dataTable.render(data);

		const thead = tableElement.children.find((c) => c.tagName === 'thead');
		expect(thead).toBeDefined();
		const tr = thead?.children[0];
		expect(tr?.tagName).toBe('tr');
		expect(tr?.children.length).toBe(2);
		expect(tr?.children[0]?.textContent).toBe('Column 1');
		expect(tr?.children[1]?.textContent).toBe('Column 2');
	});

	it('should render table body with data', () => {
		dataTable = new DataTable<TestRow>('my-table', {columns});
		dataTable.render(data);

		const tbody = tableElement.children.find((c) => c.tagName === 'tbody');
		expect(tbody).toBeDefined();
		expect(tbody?.children.length).toBe(2);

		const row1 = tbody?.children[0];
		expect(row1?.children[0]?.textContent).toBe('val1');
		expect(row1?.children[1]?.textContent).toBe('val2');

		const row2 = tbody?.children[1];
		expect(row2?.children[0]?.textContent).toBe('val3');
		expect(row2?.children[1]?.textContent).toBe('val4');
	});

	it('should apply dense class when option is enabled', () => {
		dataTable = new DataTable<TestRow>('my-table', {columns, dense: true});
		dataTable.render(data);
		expect(tableElement.classList.add).toHaveBeenCalledWith('dense-table');
	});

	it('should remove dense class when option is disabled', () => {
		dataTable = new DataTable<TestRow>('my-table', {columns, dense: false});
		dataTable.render(data);
		expect(tableElement.classList.remove).toHaveBeenCalledWith('dense-table');
	});

	it('should handle row click events', () => {
		const onRowClick = vi.fn();
		dataTable = new DataTable<TestRow>('my-table', {columns, onRowClick});
		dataTable.render(data);

		const tbody = tableElement.children.find((c) => c.tagName === 'tbody');
		const row1 = tbody?.children[0];

		row1?.click();
		expect(onRowClick).toHaveBeenCalledWith(data[0]);
	});

	it('should handle custom render functions', () => {
		const customColumns = [
			{
				id: 'col1',
				header: 'Custom',
				render: (row: TestRow) => `<b>${row.col1}</b>`,
			},
		];
		dataTable = new DataTable<TestRow>('my-table', {columns: customColumns});
		dataTable.render(data);

		const tbody = tableElement.children.find((c) => c.tagName === 'tbody');
		expect(tbody?.children[0]?.children[0]?.innerHTML).toBe('<b>val1</b>');
	});

	it('should handle custom class names', () => {
		const customColumns = [
			{
				id: 'col1',
				header: 'Classy',
				accessor: (row: TestRow) => row.col1,
				className: 'my-class',
			},
			{
				id: 'col2',
				header: 'Dynamic',
				accessor: (row: TestRow) => row.col2,
				className: (row: TestRow) => (row.col2 === 'val2' ? 'active' : ''),
			},
		];
		dataTable = new DataTable<TestRow>('my-table', {columns: customColumns});
		dataTable.render(data);

		const tbody = tableElement.children.find((c) => c.tagName === 'tbody');
		expect(tbody?.children[0]?.children[0]?.className).toBe('my-class');
		expect(tbody?.children[0]?.children[1]?.className).toBe('active');
		expect(tbody?.children[1]?.children[1]?.className).toBe('');
	});

	it('should handle tooltips', () => {
		const customColumns = [
			{
				id: 'col1',
				header: 'Tooltip',
				headerTitle: 'Header Tooltip',
				accessor: (row: TestRow) => row.col1,
				cellTitle: (row: TestRow) => `Value is ${row.col1}`,
			},
		];
		dataTable = new DataTable<TestRow>('my-table', {columns: customColumns});
		dataTable.render(data);

		const thead = tableElement.children.find((c) => c.tagName === 'thead');
		expect(thead?.children[0]?.children[0]?.title).toBe('Header Tooltip');

		const tbody = tableElement.children.find((c) => c.tagName === 'tbody');
		expect(tbody?.children[0]?.children[0]?.title).toBe('Value is val1');
	});

	it('should apply tableLayout option', () => {
		dataTable = new DataTable<TestRow>('my-table', {columns, tableLayout: 'fixed'});
		dataTable.render(data);
		expect(tableElement.style.tableLayout).toBe('fixed');
	});

	it('should apply column width to header', () => {
		const customColumns = [
			{
				id: 'col1',
				header: 'Column 1',
				accessor: (row: TestRow) => row.col1,
				width: '150px',
			},
			{
				id: 'col2',
				header: 'Column 2',
				accessor: (row: TestRow) => row.col2,
			},
		];
		dataTable = new DataTable<TestRow>('my-table', {columns: customColumns});
		dataTable.render(data);

		const thead = tableElement.children.find((c) => c.tagName === 'thead');
		expect(thead?.children[0]?.children[0]?.style.width).toBe('150px');
	});

	it('should apply align option to header and cell', () => {
		const customColumns: TableColumn<TestRow>[] = [
			{
				id: 'col1',
				header: 'Center Col',
				accessor: (row: TestRow) => row.col1,
				align: 'center',
			},
			{
				id: 'col2',
				header: 'Right Col',
				accessor: (row: TestRow) => row.col2,
				align: 'right',
			},
		];
		dataTable = new DataTable<TestRow>('my-table', {columns: customColumns});
		dataTable.render(data);

		const thead = tableElement.children.find((c) => c.tagName === 'thead');
		expect(thead?.children[0]?.children[0]?.style.textAlign).toBe('center');
		expect(thead?.children[0]?.children[1]?.style.textAlign).toBe('right');

		const tbody = tableElement.children.find((c) => c.tagName === 'tbody');
		expect(tbody?.children[0]?.children[0]?.style.textAlign).toBe('center');
		expect(tbody?.children[0]?.children[1]?.style.textAlign).toBe('right');
	});

	it('should create thead if it does not exist', () => {
		tableElement = new MockElement('table');
		tableElement.appendChild(new MockElement('tbody'));
		mockDocument.getElementById.mockReturnValue(tableElement);

		dataTable = new DataTable<TestRow>('my-table', {columns});
		dataTable.render(data);

		const thead = tableElement.children.find((c) => c.tagName === 'thead');
		expect(thead).toBeDefined();
		expect(thead?.children[0]?.children.length).toBe(2);
	});

	it('should create tbody if it does not exist', () => {
		tableElement = new MockElement('table');
		tableElement.appendChild(new MockElement('thead'));
		mockDocument.getElementById.mockReturnValue(tableElement);

		dataTable = new DataTable<TestRow>('my-table', {columns});
		dataTable.render(data);

		const tbody = tableElement.children.find((c) => c.tagName === 'tbody');
		expect(tbody).toBeDefined();
		expect(tbody?.children.length).toBe(2);
	});

	it('should use accessor for cell content without render function', () => {
		dataTable = new DataTable<TestRow>('my-table', {columns});
		dataTable.render(data);

		const tbody = tableElement.children.find((c) => c.tagName === 'tbody');
		expect(tbody?.children[0]?.children[0]?.textContent).toBe('val1');
		expect(tbody?.children[0]?.children[1]?.textContent).toBe('val2');
	});

	it('should handle null element gracefully', () => {
		mockDocument.getElementById.mockReturnValue(null);

		dataTable = new DataTable<TestRow>('my-table', {columns});
		dataTable.render(data);
	});

	it('should handle onRowClick becoming falsy after render', () => {
		const onRowClick = vi.fn();
		dataTable = new DataTable<TestRow>('my-table', {columns, onRowClick});
		dataTable.render(data);

		(dataTable as unknown as {options: TableOptions<TestRow>}).options.onRowClick = undefined as unknown as (row: TestRow) => void;

		const tbody = tableElement.children.find((c) => c.tagName === 'tbody');
		const row1 = tbody?.children[0];
		row1?.click();
	});

	it('should handle accessor returning undefined', () => {
		const customColumns: TableColumn<TestRow>[] = [
			{
				id: 'col1',
				header: 'Undefined',
				accessor: () => undefined,
			},
			{
				id: 'col2',
				header: 'Null',
				accessor: () => null as unknown as string,
			},
		];
		dataTable = new DataTable<TestRow>('my-table', {columns: customColumns});
		dataTable.render(data);

		const tbody = tableElement.children.find((c) => c.tagName === 'tbody');
		expect(tbody?.children[0]?.children[0]?.textContent).toBe('');
		expect(tbody?.children[0]?.children[1]?.textContent).toBe('');
	});

	it('should not call renderHeader or renderBody when element is null', () => {
		const nullElementTable = new DataTable<TestRow>('non-existent', {columns});
		const renderHeaderSpy = vi.spyOn(nullElementTable as unknown as {renderHeader: () => void}, 'renderHeader');
		const renderBodySpy = vi.spyOn(nullElementTable as unknown as {renderBody: (data: TestRow[]) => void}, 'renderBody');

		mockDocument.getElementById.mockReturnValue(null);

		nullElementTable.render(data);

		expect(renderHeaderSpy).not.toHaveBeenCalled();
		expect(renderBodySpy).not.toHaveBeenCalled();
	});

	it('should render with column that has no render or accessor', () => {
		const customColumns: TableColumn<TestRow>[] = [
			{
				id: 'col1',
				header: 'No Content',
			},
		];
		dataTable = new DataTable<TestRow>('my-table', {columns: customColumns});
		dataTable.render(data);

		const tbody = tableElement.children.find((c) => c.tagName === 'tbody');
		expect(tbody?.children[0]?.children[0]?.textContent).toBe('');
	});

	it('should handle null element in private methods', () => {
		dataTable = new DataTable<TestRow>('my-table', {columns});
		// @ts-expect-error - accessing private method for test coverage
		dataTable.renderHeader();
		// @ts-expect-error - accessing private method for test coverage
		dataTable.renderBody(data);
	});
});
