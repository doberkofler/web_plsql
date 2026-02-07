import type {ServerConfig, RouteConfig} from '../types.js';

/**
 * Render a stat row using the standardized format.
 * @param label - The field label.
 * @param value - The value to display.
 * @param isMono - Whether to use monospaced font.
 * @param colorClass - The CSS class for coloring the value.
 * @returns HTML string.
 */
function renderStatRow(label: string, value: string | number, isMono = true, colorClass = 'text-accent'): string {
	const valClass = `${isMono ? 'font-mono' : ''} ${colorClass} font-bold break-all`.trim();
	return `
		<div class="stat-row text-sm">
			<span>${label}</span>
			<span class="${valClass}">${value}</span>
		</div>
	`;
}

/**
 * Render a configuration section header.
 * @param title - The section title.
 * @param icon - The Material icon name.
 * @returns HTML string.
 */
function renderSectionTitle(title: string, icon: string): string {
	return `
		<div class="card-header mt-6 mb-2">
			<span class="material-symbols-rounded icon-sm">${icon}</span>
			<h3 class="text-xs uppercase tracking-wider font-bold text-accent">${title}</h3>
		</div>
	`;
}

/**
 * Render a PL/SQL route card.
 * @param r - The route configuration.
 * @param index - The index of the route.
 * @returns HTML string.
 */
function renderPlSqlRoute(r: RouteConfig, index: number): string {
	const exclusionList = r.exclusionList?.length ? r.exclusionList.join(', ') : '(None)';
	const transactionMode = typeof r.transactionMode === 'string' ? r.transactionMode : r.transactionMode ? 'Custom' : 'commit';

	return `
		<div class="card mb-6">
			<div class="flex justify-between items-center mb-4">
				<div class="flex items-center gap-3">
					<span class="badge badge-info">PL/SQL Route #${index + 1}</span>
					<code class="text-lg font-bold text-bright">${r.route}</code>
				</div>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<h4 class="text-xs font-bold text-main uppercase mb-3 opacity-75">Database Connection</h4>
					${renderStatRow('Oracle User', r.user ?? '(Not set)')}
					${renderStatRow('Connect String', r.connectString ?? '(Not set)')}
					${renderStatRow('Password', r.password ?? '(None)')}
				</div>
				<div>
					<h4 class="text-xs font-bold text-main uppercase mb-3 opacity-75">Request Handler</h4>
					${renderStatRow('Default Page', r.defaultPage ?? 'index')}
					${renderStatRow('Document Table', r.documentTable ?? '(None)')}
					${renderStatRow('Error Style', r.errorStyle ?? 'table')}
					${renderStatRow('Transaction Mode', transactionMode)}
				</div>
			</div>

			<div class="mt-4 pt-4 border-t">
				<h4 class="text-xs font-bold text-main uppercase mb-3 opacity-75">Path & Validation</h4>
				${renderStatRow('Path Alias', r.pathAlias ?? '(None)')}
				${renderStatRow('Path Alias Proc', r.pathAliasProcedure ?? '(None)')}
				${renderStatRow('Exclusion List', exclusionList)}
				${renderStatRow('Validation Func', r.requestValidationFunction ?? '(None)')}
			</div>
		</div>
	`;
}

/**
 * Render a Static route card.
 * @param r - The route configuration.
 * @param index - The index of the route.
 * @returns HTML string.
 */
function renderStaticRoute(r: RouteConfig, index: number): string {
	return `
		<div class="card mb-4">
			<div class="flex items-center gap-3 mb-4">
				<span class="badge badge-success">Static Route #${index + 1}</span>
				<code class="text-lg font-bold text-bright">${r.route}</code>
			</div>
			${renderStatRow('Directory Path', r.directoryPath ?? '(Not set)')}
		</div>
	`;
}

/**
 * Render the full server configuration.
 * @param config - The server configuration.
 * @returns HTML string.
 */
export function renderConfig(config: Partial<ServerConfig>): string {
	let html = '<div class="config-view-content">';

	// Global Server Section
	html += '<div class="card mb-8">';
	html += '<div class="card-header"><span class="material-symbols-rounded">dns</span><h3>Server Settings</h3></div>';
	if (typeof config.port === 'number') {
		html += renderStatRow('Port', config.port);
	}
	html += renderStatRow('Admin Route', config.adminRoute ?? '/admin');
	html += renderStatRow('Admin User', config.adminUser ?? '(Not authenticated)');
	html += renderStatRow('Admin Password', config.adminPassword ?? '(None)');
	html += renderStatRow('Logger Filename', config.loggerFilename ?? '(Logging disabled)');

	if (typeof config.uploadFileSizeLimit === 'number') {
		const limit = config.uploadFileSizeLimit;
		const mb = (limit / (1024 * 1024)).toFixed(2);
		html += renderStatRow('Upload Size Limit', `${mb} MB (${limit.toLocaleString()} bytes)`);
	} else {
		html += renderStatRow('Upload Size Limit', 'No limit');
	}
	html += '</div>';

	// PL/SQL Routes
	html += renderSectionTitle('PL/SQL Routes', 'database');
	if (config.routePlSql?.length) {
		html += config.routePlSql.map((r, i) => renderPlSqlRoute(r, i)).join('');
	} else {
		html += '<div class="empty-state">No PL/SQL routes configured</div>';
	}

	// Static Routes
	html += renderSectionTitle('Static Routes', 'folder_shared');
	if (config.routeStatic?.length) {
		html += config.routeStatic.map((r, i) => renderStaticRoute(r, i)).join('');
	} else {
		html += '<div class="empty-state">No static routes configured</div>';
	}

	html += '</div>';
	return html;
}
