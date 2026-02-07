/**
 * Cache card template.
 *
 * @param c - Cache data containing pool name and cache statistics.
 * @param c.poolName - The pool name.
 * @param c.procedureNameCache - Procedure name cache data.
 * @param c.procedureNameCache.size - Number of cached procedures.
 * @param c.procedureNameCache.stats - Cache statistics.
 * @param c.procedureNameCache.stats.hits - Cache hits.
 * @param c.procedureNameCache.stats.misses - Cache misses.
 * @param c.argumentCache - Argument cache data.
 * @param c.argumentCache.size - Number of cached arguments.
 * @param c.argumentCache.stats - Cache statistics.
 * @param c.argumentCache.stats.hits - Cache hits.
 * @param c.argumentCache.stats.misses - Cache misses.
 * @returns HTML string for the cache card.
 */
export function cacheCard(c: {
	poolName: string;
	procedureNameCache: {size: number; stats: {hits: number; misses: number}};
	argumentCache: {size: number; stats: {hits: number; misses: number}};
}): string {
	const procTotal = c.procedureNameCache.stats.hits + c.procedureNameCache.stats.misses;
	const procHitRate = procTotal > 0 ? Math.round((c.procedureNameCache.stats.hits / procTotal) * 100) : 0;
	const argTotal = c.argumentCache.stats.hits + c.argumentCache.stats.misses;
	const argHitRate = argTotal > 0 ? Math.round((c.argumentCache.stats.hits / argTotal) * 100) : 0;

	return `
        <div class="card" data-pool="${c.poolName}">
            <div class="card-header">
                <span class="material-symbols-rounded">cached</span>
                <h3>Pool: ${c.poolName}</h3>
            </div>

            <div class="mb-6">
                <div class="flex justify-between mb-2">
                    <strong class="text-bright">Procedures</strong>
                    <span class="text-accent font-bold">${procHitRate}% Hit Rate</span>
                </div>
                <div class="grid grid-cols-3 gap-2 mb-3">
                    <div class="stat-card">
                        <div class="description">Size</div>
                        <div class="font-bold text-lg">${c.procedureNameCache.size}</div>
                    </div>
                    <div class="stat-card">
                        <div class="description">Hits</div>
                        <div class="font-bold text-lg text-success">${c.procedureNameCache.stats.hits}</div>
                    </div>
                    <div class="stat-card">
                        <div class="description">Misses</div>
                        <div class="font-bold text-lg text-danger">${c.procedureNameCache.stats.misses}</div>
                    </div>
                </div>
                <div class="progress-bar progress-bar-sm">
                    <div class="progress-bar-fill bg-success" style="width: ${procHitRate}%"></div>
                </div>
            </div>

            <div class="mb-6">
                <div class="flex justify-between mb-2">
                    <strong class="text-bright">Arguments</strong>
                    <span class="text-accent font-bold">${argHitRate}% Hit Rate</span>
                </div>
                <div class="grid grid-cols-3 gap-2 mb-3">
                    <div class="stat-card">
                        <div class="description">Size</div>
                        <div class="font-bold text-lg">${c.argumentCache.size}</div>
                    </div>
                    <div class="stat-card">
                        <div class="description">Hits</div>
                        <div class="font-bold text-lg text-success">${c.argumentCache.stats.hits}</div>
                    </div>
                    <div class="stat-card">
                        <div class="description">Misses</div>
                        <div class="font-bold text-lg text-danger">${c.argumentCache.stats.misses}</div>
                    </div>
                </div>
                <div class="progress-bar progress-bar-sm">
                    <div class="progress-bar-fill bg-success" style="width: ${argHitRate}%"></div>
                </div>
            </div>

            <button class="btn btn-warning w-full cache-clear-btn">
                <span class="material-symbols-rounded">delete_sweep</span>
                Clear Pool Cache
            </button>
        </div>
    `;
}
