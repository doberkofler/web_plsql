# Competitive Analysis:

This document provides a consolidated analysis of the `web_plsql` middleware implementation, identifying critical issues, architectural gaps.

---

## 1. Technical Findings

### 1.1 Data Integrity & Globalization (NLS)
*   **Encoding Hardcoding:** `upload.js` hardcodes `dad_charset` as `'ascii'`, and `cgi.js` hardcodes `REQUEST_CHARSET` as `'UTF8'`. This causes immediate data corruption for non-Western character sets (Cyrillic, Chinese, etc.) unless the DB is AL32UTF8.
*   **Transactional Integrity:** File uploads use `autoCommit: true`, while the main procedure handles its own commit. If the upload succeeds but the procedure fails, orphaned files remain in the `documentTable`.
*   **Resolution:** Align charsets with database NLS settings; pass the same connection to `uploadFile` and commit atomically.

---

## 2. Competitive Comparison: `thoth-gateway`

`thoth-gateway` is a .NET-based gateway for IIS. Comparing its source code with `web_plsql` reveals several mature features that could be adopted.

| Feature | `web_plsql` | `thoth-gateway` | Notes |
| :--- | :--- | :--- | :--- |
| **Before/After Hooks** | No | Yes | `thoth-gateway` supports `BeforeProcedure` and `AfterProcedure` for session setup. |
| **Metadata Caching** | Basic (Args only) | Advanced | `thoth-gateway` uses a sophisticated cache for procedure signatures. |
| **Path Aliasing** | Yes | Yes | `thoth-gateway` allows optional parameter forwarding for aliases. |

---

## 3. Prioritized Enhancement List

The following enhancements are proposed based on the competitive analysis and identified architectural gaps.

| Enhancement | Priority | Motivation |
| :--- | :--- | :--- |
| **Hook Support (`before`/`after`)** | **High** | Essential for parity with `mod_plsql`. Allows custom session setup (security context, NLS settings) without modifying every PL/SQL procedure. |
| **Configurable Charset & HTP Buffer** | **High** | Resolves the critical data integrity risks and aligns with `thoth-gateway`'s ability to handle various NLS environments. |
| **Streaming Responses** | **Medium** | Fixes the memory scaling issue by piping LOBs and large buffers directly to the response instead of joining strings. |
| **Enhanced Path Alias Parameters** | **Medium** | Increases flexibility for dispatcher-style procedures by optionally forwarding all request parameters. |
| **Atomic Transactional Uploads** | **Medium** | Ensures that file uploads and the main procedure call happen in the same transaction. |

---

## 4. Non-Goals / Out of Scope

The following features are explicitly **excluded** from the roadmap to maintain architectural simplicity and security.

*   **Stateful Mode (`StatelessWithPreservePackageState`)**:
    *   Legacy `mod_plsql` allowed preserving package state between requests.
    *   **Decision**: This will **not** be implemented.
    *   **Reasoning**: It introduces severe "state leakage" risks in a pooled environment and complicates the architecture. The project is strictly **Stateless**.
