# Competitive Analysis:

This document provides a consolidated analysis of the `web_plsql` middleware implementation, identifying critical issues, architectural gaps, and completed enhancements.

---

## Technical Findings

* **Encoding Hardcoding:** `upload.js` hardcodes `dad_charset` as `'ascii'`, and `cgi.js` hardcodes `REQUEST_CHARSET` as `'UTF8'`. This causes immediate data corruption unless the DB is AL32UTF8.
* **Transactional Integrity:** File uploads use `autoCommit: true`, while the main procedure handles its own commit. If the upload succeeds but the procedure fails, orphaned files remain in the `documentTable`.
* **Before/After Hooks** `thoth-gateway` supports `BeforeProcedure` and `AfterProcedure` for session setup.
* **Path Aliasing** allows optional parameter forwarding for aliases.

## Performance Enhancements

The Oracle network roundtrips dominate normal PL/SQL request latency. Framework and JavaScript hot-path improvements should therefore be measured only after reducing and instrumenting database calls.

### Priority 1: Reduce Database Roundtrips

A cached, non-upload request currently requires separate calls for session reset, OWA initialization, procedure execution, initial page retrieval, file-download detection, and transaction completion. Additional page chunks each require another call.

* Combine `dbms_session.modify_package_state(dbms_session.reinitialize)` and `owa.init_cgi_env` into one PL/SQL block. The package-state reset must remain in place to prevent pooled-session state leakage.
* Investigate a unified execution block that initializes the session, invokes the target procedure, fetches the first OWA page chunk, and returns file-download metadata in one call.
* Keep subsequent OWA fetches streaming, but benchmark `OWA_STREAM_CHUNK_SIZE` against representative page sizes and database network latency.
* Expose and benchmark Oracle pool and statement-cache settings such as `stmtCacheSize`; defaults may be too small for applications with many procedures.
* Benchmark node-oracledb Thin and Thick modes with realistic concurrency, page sizes, uploads, and LOB downloads before recommending a deployment default.

### Priority 2: Reduce Express Middleware Work

Express 5 is unlikely to be the primary bottleneck while each request performs several Oracle calls. The current global middleware chain nevertheless performs avoidable work on requests that do not need every parser.

* Run multipart parsing only for requests whose `Content-Type` is `multipart/form-data`, rather than passing every request through `handlerUpload`.
* Mount JSON and URL-encoded body parsers only where required and reconsider the current `50mb` global limits. Benchmark `extended: false` if nested URL-encoded parameters are not required.
* Parse cookies lazily or only on PL/SQL routes that need CGI cookie data or authentication.
* Make dynamic compression configurable. For production deployments, compare Node compression with compression performed by the reverse proxy, especially for small and already-compressed responses.
* Mount route-specific middleware directly on each PL/SQL route to avoid unrelated global middleware and routing work.

### Priority 3: Optimize JavaScript Hot Paths

* Replace repeated Zod parsing of trusted node-oracledb results in `OWAPageStream.fetchChunk`, procedure-name resolution, argument loading, and file-download detection with focused runtime type guards. Keep Zod for external configuration and untrusted input.
* Avoid constructing a complete `URL` object in CGI generation when only the pathname is needed; benchmark a safe direct extraction from `req.originalUrl`.
* Parse OWA headers with a single scan rather than `split` and intermediate arrays if profiling shows meaningful allocation pressure.
* Avoid repeated `Object.keys` and `Object.values` calls while building CGI binds.
* Use `process.hrtime.bigint()` or `performance.now()` for request timing rather than allocating the tuple returned by `process.hrtime()`.

### Priority 4: Runtime and Deployment Scaling

* Set and document HTTP `keepAliveTimeout`, `headersTimeout`, and request timeout values appropriate for the expected reverse proxy and long-running PL/SQL calls.
* Scale across CPU cores with multiple Node processes or containers when JavaScript CPU usage is demonstrated to be limiting. Each process creates its own Oracle pools, so total database connections must remain bounded.
* Consider Fastify, Hono, or a native `node:http` standalone server only after benchmarking the complete Oracle-backed request path. Preserve the Express middleware API for existing consumers and `setupExtensions` compatibility.

### Measurement Plan

The existing mocked performance test measures middleware overhead but has thresholds too broad to guide optimization and does not model Oracle latency.

* Record p50, p95, and p99 latency as well as throughput and event-loop utilization.
* Add separately reported scenarios for cached and uncached metadata, small and multi-chunk pages, uploads, downloads, compression, and concurrent pool saturation.
* Count Oracle executions per request so roundtrip regressions are visible.
* Run both mocked-driver microbenchmarks and local/remote Oracle integration benchmarks.
* Benchmark each proposed change independently before changing defaults or replacing Express.

## Linting

* Disabling unicorn/prefer-add-event-listener and unicorn/prefer-dom-node-append should be removed
