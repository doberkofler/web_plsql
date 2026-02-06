# Agent Instructions for web_plsql

This document provides guidelines for AI agents working on the `web_plsql` repository.
Adhere strictly to these rules to ensure code quality, consistency, and stability.

## 1. Build, Lint, and Test Commands

This project is a Node.js application using ES Modules (ESM) and JSDoc for TypeScript type checking.

### Core Commands

*   **Install Dependencies**: `npm install`
*   **Run All Tests**: `npm run test` (or `npm test`)
    *   Uses **Vitest** runner (`vitest run`).
*   **Run Single Test**: `npx vitest run tests/path/to/test.js`
    *   Example: `npx vitest run tests/version.test.js`
    *   *Note*: The project uses Vitest, not the native Node.js test runner.
*   **Lint & Format**: `npm run lint`
    *   Runs `prettier` (formatting), `eslint` (linting), and `tsc` (type checking).
    *   **Crucial**: Always run this before submitting changes.
*   **Type Check**: `tsc --noEmit` (included in `npm run lint`).
    *   Checks JSDoc types in `.js` files.
*   **Generate Types**: `npm run types`
    *   Generates `.d.ts` files in `types/`.
*   **Clean**: `npm run clean`
    *   Removes build artifacts and logs.
*   **Full CI Check**: `npm run ci`
    *   Runs clean, version check, type generation, lint, and coverage.

### Docker Commands

*   **Build Image**: `npm run image-build`
*   **Save Image**: `npm run image-save`

## 2. Code Style & Conventions

### Language & Typing

*   **Language**: JavaScript (ESM).
*   **Type Checking**: Strict TypeScript checking is enabled via JSDoc (`checkJs: true` in `tsconfig.json`).
    *   **Do not write .ts files** for source code. Use `.js` with JSDoc.
    *   Do not add `// @ts-check` to individual files (enabled globally).
*   **Module System**: ES Modules (`type: "module"`).
    *   **Requirement**: All imports must include the `.js` file extension.
    *   Example: `import { foo } from './bar.js'`.

### Formatting & Linting

*   **Formatter**: Prettier.
*   **Linter**: ESLint with `typescript-eslint` strict rules.
*   **Specific Rules**:
    *   **Unused Variables**: Warn (`argsIgnorePattern: '^_'` allowed).
    *   **Strict Types**: No implicit any, strict null checks.
    *   **JSDoc**: Required for public functions/methods.
    *   **Error Handling**: `caughtErrors` check is disabled, but errors must be handled explicitly.

### Naming Conventions

*   **Variables/Functions**: `camelCase` (e.g., `handlerWebPlSql`, `invokeProcedure`).
*   **Classes**: `PascalCase` (e.g., `ProcedureError`).
*   **Files**: `camelCase` (e.g., `handlerPlSql.js`).
*   **Constants**: `UPPER_SNAKE_CASE` or `camelCase` depending on usage.

### Imports

Group imports in the following order:
1.  **Node.js built-ins** (prefix with `node:`, e.g., `import fs from 'node:fs';`).
2.  **External libraries** (e.g., `import oracledb from 'oracledb';`).
3.  **Internal modules** (relative paths with `.js`, e.g., `import { util } from '../../util/util.js';`).

### Error Handling

*   Use standard `try...catch` blocks.
*   For procedure execution, wrap errors in `ProcedureError` to capture context (SQL, binds).
*   Do not swallow errors silently. Log them using the debug module or rethrow.

## 3. Architecture & Critical Concepts

### Request Handling Flow
1.  **Upload**: Files are uploaded if present.
2.  **Sanitize & Resolve**: The procedure name is validated against the database using `dbms_utility.name_resolve`. This prevents SQL injection and ensures the object exists.
3.  **Prepare**: The session is prepared (see below).
4.  **Execute**: The PL/SQL procedure is executed.
5.  **Fetch**: The page content is retrieved via OWA.
6.  **Download**: File downloads are handled.
7.  **Response**: The parsed page is sent to the client.

### Caching Strategy
To ensure performance and stability, the middleware uses a robust caching mechanism:
*   **Scoped Caching**: Caches are instantiated per handler (pool), preventing multi-tenant collisions.
*   **LFU Policy**: The `Cache` utility (`src/util/cache.js`) implements a Least-Frequently-Used eviction policy to prevent memory overflows.
*   **Invalidation**: Logic in `procedure.js` automatically clears cache entries when database errors indicating schema changes (`ORA-04068`, `ORA-06550`, etc.) are detected.

### Statelessness and `dbms_session`
The middleware enforces a **stateless model** as defined in the Oracle mod_plsql documentation (**Section 3.4 Transaction Mode**).

*   **Mechanism**: `dbms_session.modify_package_state(dbms_session.reinitialize)` is called before executing the user's procedure.
*   **Purpose**: To reset the state of all packages in the session.
*   **Necessity**: Essential for correctness and security in a pooled connection environment. Without this, **state leakage** occurs (User B inherits User A's global variables), causing severe security and logic failures.

#### Why "Stateful" Mode is NOT Supported
*   **The "Stateful" Exception**: Legacy `mod_plsql` had a `StatelessWithPreservePackageState` option. This mode skipped the reset but required manual cleanup by the developer.
*   **Decision**: This architecture **strictly prohibits** this mode.
*   **Reasoning**: It is dangerous (security risk) and generally discouraged. `web_plsql` hardcodes the "Fast Reset" approach (`dbms_session.reinitialize`) to ensure a secure, scalable gateway.
*   **Instruction**: **Do not remove this call.** It is essential for correctness.

### Known Issues & Security (See `ENHANCEMENTS.md`)
*   **Character Sets**: The project currently hardcodes some charsets (`ascii`, `UTF8`). Aim for configuration-driven NLS settings.

### Planned Enhancements
Refer to `ENHANCEMENTS.md` for the full roadmap. Key priorities include:
1.  **Hooks**: Adding `before`/`after` procedure hooks for session setup.
2.  **Streaming**: Moving away from in-memory buffering for large responses.

## 4. Testing Guidelines

*   **Framework**: Vitest.
*   **Imports**: `import { describe, it, assert, expect } from 'vitest';`
*   **Location**: `tests/` directory.
*   **File Naming**: `*.test.js`.
*   **Console Output**: `console.warn` and `console.error` are suppressed by default during tests.
    *   To see full logs, run: `DEBUG=true npm test` or `VERBOSE=true npm test`.
    *   See `tests/setup.js` for implementation.

**Example Test Pattern**:
```javascript
import { describe, it, assert } from 'vitest';
import { myFunction } from '../src/myModule.js';

describe('myModule', () => {
    it('should return expected value', () => {
        const result = myFunction();
        assert.strictEqual(result, 'expected');
    });
});
```

*   **Linting in Tests**: TypeScript strict rules are slightly relaxed in `tests/` (e.g., `no-explicit-any` is off).

## 5. Development Workflow

1.  **Understand**: Read existing code. Search using `grep` and `glob`. Check `src/types.js` for data structures.
2.  **Check Enhancements**: Consult `ENHANCEMENTS.md` to avoid reimplementing known issues or contradicting future plans.
3.  **Consult References**: Check official docs and `thoth-gateway` (see below) for architectural alignment.
4.  **Plan**: Outline changes. Check for existing tests.
5.  **Implement**: Write code in `.js` files using JSDoc.
6.  **Verify**:
    *   Run `npm run lint` to fix formatting and type errors immediately.
    *   Run `npx vitest run tests/relevant.test.js` to verify logic.
7.  **Finalize**: Run `npm run ci` to ensure the full suite passes.

## 6. Project Structure

*   `src/`: Source code.
    *   `handler/`: Request handlers (`handlerPlSql.js`).
    *   `handler/plsql/`: PL/SQL execution logic (`procedure.js`, `parsePage.js`).
    *   `server/`: Server setup.
    *   `util/`: Utilities.
*   `tests/`: Unit and integration tests.
*   `types/`: Generated TypeScript definitions (do not edit).
*   `examples/`: Example configurations and SQL.

## 7. References

Always consult these official resources and reference implementations when planning architectural changes or verifying behavior. This project aims to be a viable alternative to these standards.

*   **Official Oracle Documentation**:
    *   **mod_plsql (Legacy)**: [Oracle Application Server mod_plsql User's Guide 10g Release 2 (10.1.2)](https://docs.oracle.com/cd/B14099_12/web.1012/b14010/concept.htm)
        *   **Crucial Sections**: Section 3.4 (Transaction Mode), Section 3.6 (Parameter Passing), Section 3.9 (CGI Variables).
    *   **ORDS (Current)**: [Oracle REST Data Services Developer's Guide](https://docs.oracle.com/en/database/oracle/oracle-rest-data-services/25.4/orddg/index.html)
        *   The modern successor; align behavior with ORDS standards where applicable.
*   **Thoth Gateway**: [https://github.com/mortenbra/thoth-gateway](https://github.com/mortenbra/thoth-gateway)
    *   Use this as a comparative reference for features like hooks, caching, and SOAP support.
    *   This is an established open-source alternative for IIS that implements the same standard.
