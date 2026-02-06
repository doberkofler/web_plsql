# Detailed Analysis of `web_plsql` Express Middleware

This document provides a consolidated analysis of the `web_plsql` middleware implementation, identifying critical issues, architectural gaps, and suggested improvements.

---

## 1. Executive Summary of Findings

| Topic | Impact | Priority | Description |
| :--- | :--- | :--- | :--- |
| **SQL Injection** | Critical | High | Direct interpolation of `procName` in SQL construction. |
| **Global Cache Collisions** | High | High | Caches are global and do not distinguish between database pools/schemas. |
| **Missing Security Features** | High | Medium | Claimed `OWA_SEC` and Authentication support is missing from the codebase. |
| **Data Integrity (NLS)** | High | Medium | Hardcoded charsets (ASCII/UTF8) risk corruption for non-Western data. |
| **Memory & Scalability** | High | Medium | Lack of true streaming; entire file uploads and responses are buffered in memory. |
| **Resource Management** | Medium | Medium | Potential connection leaks in complex error scenarios; needs `finally` blocks. |
| **Compatibility Gaps** | Medium | Low | Missing "Four-Parameter" interface and limited LOB/BLOB input support. |

---

## 2. Technical Findings

### 2.1 Security & Sanitization
*   **SQL Injection Risk:** The middleware constructs SQL using template literals (`${procName}(...)`). While bind variables are used for parameters, the procedure name itself is a massive injection vector if sanitization is bypassed.
*   **Insufficient Sanitization:** `procedureSanitize.js` uses shallow regex that allows characters like `$` and `#`. It fails to limit the number of dots, potentially allowing access to unintended internal schemas (e.g., `sys.dbms_system`).
*   **Resolution:** Implement strict whitelist validation or use `dbms_assert.sql_object_name` in the database.

### 2.2 Architectural & Resource Reliability
*   **Global Cache Collisions:** `ARGS_CACHE` and `REQUEST_VALIDATION_FUNCTION_CACHE` are global `Map` objects. Multiple routes (DADs) pointing to different schemas with identical procedure names will collide, leading to runtime binding errors.
*   **Connection Handling:** `processRequest` relies on the caller for error handling. A failure between acquisition and release can leak connections. Use a `finally` block to ensure `connection.release()` is always called.
*   **Resolution:** Scope caches to the connection pool/options; refactor request handling for guaranteed release.

### 2.3 Data Integrity & Globalization (NLS)
*   **Encoding Hardcoding:** `upload.js` hardcodes `dad_charset` as `'ascii'`, and `cgi.js` hardcodes `REQUEST_CHARSET` as `'UTF8'`. This causes immediate data corruption for non-Western character sets (Cyrillic, Chinese, etc.) unless the DB is AL32UTF8.
*   **Transactional Integrity:** File uploads use `autoCommit: true`, while the main procedure handles its own commit. If the upload succeeds but the procedure fails, orphaned files remain in the `documentTable`.
*   **Resolution:** Align charsets with database NLS settings; pass the same connection to `uploadFile` and commit atomically.

### 2.4 Performance & Scalability
*   **Memory Buffering:** The middleware buffers entire file uploads and massive responses (`owa.get_page` joins up to 100k rows into a single string) in memory. This prevents supporting multi-gigabyte exports and increases DoS risk.
*   **Session Overhead:** Mandatory `dbms_session.modify_package_state` on every request is expensive for large schemas.
*   **Resolution:** Implement Node.js `Readable Stream` and `pipe()` data directly; make session reset optional via a configuration flag.

---

## 3. Implementation Gaps

*   **False Claims:** The README claims support for `OWA_SEC` and custom authentication (Basic/Custom), but the code does not process `Authorization` headers or populate `REMOTE_USER` variables.
*   **Parameter Interface:** Only the **Two-Parameter** interface is supported. Lack of the **Four-Parameter** interface (`num_entries`, `name_array`, `value_array`, `reserved`) prevents drop-in compatibility for many legacy `mod_plsql` apps.
*   **LOB Support:** No support for passing `BLOB` objects as input parameters. `wpg_docload` is tightly coupled to the `doctable`, limiting flexibility for streaming from arbitrary tables.
