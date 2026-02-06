# Competitive Analysis: `web_plsql` vs `thoth-gateway`

This document provides a consolidated analysis of the `web_plsql` middleware implementation, identifying critical issues, architectural gaps, and a comparative analysis against `thoth-gateway`.

---

## 1. Executive Summary of Findings

| Topic | Impact | Priority | Description |
| :--- | :--- | :--- | :--- |
| **SQL Injection** | Critical | High | Direct interpolation of `procName` in SQL construction. |
| **Global Cache Collisions** | High | High | Caches are global and do not distinguish between database pools/schemas. |
| **Missing Security Features** | High | Medium | Claimed `OWA_SEC` and Authentication support is missing from the codebase. |
| **Data Integrity (NLS)** | High | Medium | Hardcoded charsets (ASCII/UTF8) risk corruption for non-Western data. |
| **Hook Support** | Medium | High | Missing `before` and `after` procedure hooks present in `thoth-gateway`. |
| **Performance** | Medium | High | Lack of metadata caching compared to `thoth-gateway`. |
| **Memory & Scalability** | High | Medium | Lack of true streaming; response body and uploads are buffered in memory. |

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

---

## 3. Competitive Comparison: `thoth-gateway`

`thoth-gateway` is a .NET-based gateway for IIS. Comparing its source code with `web_plsql` reveals several mature features that could be adopted.

| Feature | `web_plsql` | `thoth-gateway` | Notes |
| :--- | :--- | :--- | :--- |
| **Platform** | Node.js (Cross-platform) | .NET (Windows/IIS) | `web_plsql` is more container-friendly and modern. |
| **Before/After Hooks** | No | Yes | `thoth-gateway` supports `BeforeProcedure` and `AfterProcedure` for session setup. |
| **Metadata Caching** | Basic (Args only) | Advanced | `thoth-gateway` uses a sophisticated cache for procedure signatures. |
| **SOAP/WSDL** | No | Yes | Built-in support for SOAP-based PL/SQL calls. |
| **Path Aliasing** | Yes | Yes | `thoth-gateway` allows optional parameter forwarding for aliases. |

---

## 4. Prioritized Enhancement List

The following enhancements are proposed based on the competitive analysis and identified architectural gaps.

| Enhancement | Priority | Motivation |
| :--- | :--- | :--- |
| **Hook Support (`before`/`after`)** | **High** | Essential for parity with `mod_plsql`. Allows custom session setup (security context, NLS settings) without modifying every PL/SQL procedure. |
| **Procedure Metadata Caching** | **High** | Significantly reduces database roundtrips by caching procedure signatures. Critical for performance parity with `thoth-gateway`. |
| **Configurable Charset & HTP Buffer** | **High** | Resolves the critical data integrity risks and aligns with `thoth-gateway`'s ability to handle various NLS environments. |
| **Streaming Responses** | **Medium** | Fixes the memory scaling issue by piping LOBs and large buffers directly to the response instead of joining strings. |
| **Enhanced Path Alias Parameters** | **Medium** | Increases flexibility for dispatcher-style procedures by optionally forwarding all request parameters. |
| **Atomic Transactional Uploads** | **Medium** | Ensures that file uploads and the main procedure call happen in the same transaction. |
| **SOAP/WSDL Support** | **Low** | Useful for legacy enterprise service integrations. |

---

## 5. Non-Goals / Out of Scope

The following features are explicitly **excluded** from the roadmap to maintain architectural simplicity and security.

*   **Stateful Mode (`StatelessWithPreservePackageState`)**:
    *   Legacy `mod_plsql` allowed preserving package state between requests.
    *   **Decision**: This will **not** be implemented.
    *   **Reasoning**: It introduces severe "state leakage" risks in a pooled environment and complicates the architecture. The project is strictly **Stateless**.

