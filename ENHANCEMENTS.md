# Competitive Analysis:

This document provides a consolidated analysis of the `web_plsql` middleware implementation, identifying critical issues, architectural gaps, and completed enhancements.

---

## 1. Technical Findings

*   **Encoding Hardcoding:** `upload.js` hardcodes `dad_charset` as `'ascii'`, and `cgi.js` hardcodes `REQUEST_CHARSET` as `'UTF8'`. This causes immediate data corruption for non-Western character sets (Cyrillic, Chinese, etc.) unless the DB is AL32UTF8.
*   **Transactional Integrity:** File uploads use `autoCommit: true`, while the main procedure handles its own commit. If the upload succeeds but the procedure fails, orphaned files remain in the `documentTable`.
*   **Resolution:** Align charsets with database NLS settings; pass the same connection to `uploadFile` and commit atomically.
*   **Before/After Hooks** `thoth-gateway` supports `BeforeProcedure` and `AfterProcedure` for session setup.
*   **Path Aliasing** allows optional parameter forwarding for aliases.

---

## 2. Completed Enhancements

*   **Streaming Responses** ✅ **COMPLETED**
    *   **Issue**: Previous implementation buffered entire PL/SQL page output in memory by fetching all lines at once and joining them into a single string, causing memory scaling issues for large responses.
    *   **Solution**: Implemented `OWAPageStream` class that extends Node.js `Readable` stream to fetch page content in chunks (1000 lines at a time) and pipe directly to the HTTP response.
    *   **Implementation**: 
        *   Created `src/handler/plsql/owaPageStream.js` with streaming support
        *   Modified `procedure.js` to use stream for page body
        *   Updated `sendResponse.js` to detect and pipe stream responses
        *   Added comprehensive unit tests in `tests/owaPageStream.test.js`
    *   **Performance Impact**: 
        *   Small responses: ~25% throughput reduction due to stream overhead (acceptable tradeoff)
        *   Large responses: Eliminates memory issues and enables handling of multi-GB responses
    *   **Benefits**:
        *   Constant memory usage regardless of response size
        *   Supports responses larger than available RAM
        *   Maintains compatibility with existing functionality (file downloads, redirects, etc.)

---

## 3. Non-Goals / Out of Scope

The following features are explicitly **excluded** from the roadmap to maintain architectural simplicity and security.

*   **Stateful Mode (`StatelessWithPreservePackageState`)**:
    *   Legacy `mod_plsql` allowed preserving package state between requests.
    *   **Decision**: This will **not** be implemented.
    *   **Reasoning**: It introduces severe "state leakage" risks in a pooled environment and complicates the architecture. The project is strictly **Stateless**.
