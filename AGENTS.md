# Agent Instructions for web_plsql

This document provides guidelines for AI agents working on the `web_plsql` repository.
Adhere strictly to these rules to ensure code quality, consistency, and stability.

## 1. Build, Lint, and Test Commands

This project is a Node.js application using TypeScript and ES Modules (ESM).

### Core Commands

*   **Install Dependencies**: `npm install`
*   **Run All Tests**: `npm run test` (or `npm test`)
    *   Uses **Vitest** runner (`vitest run`).
    *   **Coverage**: Run `npm run test -- --coverage` to generate a coverage report.
*   **Run Single Test**: `npx vitest run tests/backend/version.test.ts`
    *   Example: `npx vitest run tests/backend/version.test.ts`
    *   *Note*: The project uses Vitest.
*   **Lint & Format**: `npm run lint`
    *   Runs `prettier` (formatting), `eslint` (linting), and `tsc` (type checking).
    *   **Crucial**: Always run this before submitting changes.
*   **Type Check**: `tsc --noEmit` (included in `npm run lint`).
*   **Build Backend**: `npm run build:backend`
    *   Uses **tsdown** to bundle the backend into `dist/`.
*   **Build Admin**: `npm run build:frontend`
    *   Uses **Vite** to bundle the admin console.
*   **Clean**: `npm run clean`
    *   Removes build artifacts and logs.
*   **Full CI Check**: `npm run ci`
    *   Runs clean, version check, build, lint, and coverage.

### Docker Commands

*   **Build Image**: `npm run image-build`
*   **Save Image**: `npm run image-save`

## 2. Code Style & Conventions

### Language & Typing

*   **Language**: TypeScript.
*   **Type Checking**: Strict TypeScript checking.
*   **Module System**: ES Modules (`type: "module"`).
    *   **Requirement**: All imports must include the `.ts` or `.js` file extension as required by the environment.
    *   Example: `import { foo } from './bar.ts'`.

### Package Management

*   **Always Use Latest Versions**: When adding or updating dependencies, always use the latest stable versions available via `npm install package-name@latest`.
*   **No Type Suppression**: Never use `@ts-ignore`, `// @ts-nocheck`, or `any` type.
    *   If a TypeScript/ESLint error cannot be resolved, fix the code instead of suppressing the error.
    *   **Exception**: Only if absolutely necessary, use `// @ts-expect-error` with a detailed explanation comment explaining why it was absolutely required.
*   **No ESLint Disabling**: Never disable ESLint rules with `/* eslint-disable */` or inline disable comments.
    *   **Exception**: Only if absolutely necessary, disable a specific rule with `// eslint-disable-next-line rule-name` followed by a detailed explanation comment explaining why it was absolutely required.
*   **No Type Assertions**: Never use TypeScript `as` type assertions (e.g., `value as string`).
    *   Use proper type narrowing, type guards, or explicit checks (e.g., `typeof value === 'string'`).
    *   Throw exceptions for unexpected types rather than silently converting.
    *   If you must cast, explain why in comments and prefer runtime checks over compile-time assertions.

### Formatting & Linting

*   **Formatter**: Prettier.
*   **Linter**: ESLint with `typescript-eslint` strict rules.
*   **Specific Rules**:
    *   **Unused Variables**: Warn (`argsIgnorePattern: '^_'` allowed).
    *   **Strict Types**: No implicit any, strict null checks.
    *   **JSDoc**: Required for public functions/methods.
    *   **Error Handling**: `caughtErrors` check is disabled, but errors must be handled explicitly.
    *   **Catch Clause Variables**: Always type catch clause variables as `unknown` (e.g., `catch (error: unknown)`). Do not use `any` or leave it untyped.

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
*   **LFU Policy**: The `Cache` utility (`src/backend/util/cache.ts`) implements a Least-Frequently-Used eviction policy to prevent memory overflows.
*   **Invalidation**: Logic in `procedure.ts` automatically clears cache entries when database errors indicating schema changes (`ORA-04068`, `ORA-06550`, etc.) are detected.

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

### Admin Console
The admin console is a Single Page Application (SPA) built with modern web technologies and served via an internal API.

**Architecture**:
- **Backend**: Express routes under `/admin/api` serve JSON data for traffic, pools, logs, and cache.
- **Frontend**: TypeScript-based SPA bundled with **Vite**.
- **Styling**: **Tailwind CSS** for a responsive and modern UI.
- **Charts**: **Chart.js** for real-time data visualization.
- **Icons**: Heroicons (SVG).

**Key Components**:
- `src/frontend/api.ts`: Typed client for the internal Admin API.
- `src/frontend/ui/views.ts`: View-specific rendering and refresh logic.
- `src/frontend/charts.ts`: Chart.js lifecycle management and real-time updates.
- `src/frontend/main.ts`: Main application logic and state management.

**Build Process**:
- `npm run build:frontend`: Compiles TS, processes Tailwind CSS, and bundles all assets into `src/frontend/lib/chart.bundle.js`.
- The bundle includes Chart.js and all required logic, making the frontend self-contained.
- **Note**: Always run this command after modifying any file in `src/frontend/`.

**View Refresh Logic**:
- Each view (errors, access, cache, pools, config, system) has a refresh function in `src/frontend/ui/views.ts`
- Views are refreshed when:
  1. The view is first clicked/opened
  2. Auto-refresh timer fires (if the view is currently active)
- The navigation handler in `src/frontend/main.ts` calls the appropriate refresh function for each view

**Commands**:
- `npm run build:frontend` - Build the admin client bundle
- `npm run build` - Alias for build:frontend
- `npm run prepack` - Automatically builds before publishing
- `npm run ci` - Runs full CI including build

**Files Excluded from Linting/Type Checking**:
- `src/frontend/lib/` - Build output directory (contains bundled JS/CSS)

### SPA (Single Page Application) Support
The middleware supports serving SPA applications that use HTML5 History Mode routing (e.g., React Router `createBrowserRouter`, Vue Router history mode).

**Configuration**:
Enable SPA fallback in `routeStatic` configuration:
```json
{
  "routeStatic": [
    {
      "route": "/app",
      "directoryPath": "./build",
      "spaFallback": true
    }
  ]
}
```

**How It Works**:
1. **express-static-gzip** serves actual files (CSS, JS, images)
2. If no file found, **handlerSpaFallback** serves `index.html`
3. SPA router (React Router, etc.) handles client-side routing

**Middleware Order** (CRITICAL):
```typescript
// ✅ CORRECT ORDER
app.use('/app', expressStaticGzip('./build'));      // Serves files
app.use('/app', createSpaFallback('./build', '/app')); // Fallback to index.html

// ❌ WRONG ORDER (will not work)
app.use('/app', createSpaFallback('./build', '/app')); // Always serves index.html
app.use('/app', expressStaticGzip('./build'));         // Never reached!
```

**Accept Header Filtering**:
The fallback only serves HTML for navigation requests. API requests and static asset 404s are passed through:
- `Accept: text/html` → Serves index.html
- `Accept: application/json` → Calls next() (404)
- `Accept: image/png` → Calls next() (404)

**Example Use Cases**:
- React Router with `createBrowserRouter`
- Vue Router with `createWebHistory`
- Angular Router with `useHash: false`
- Any SPA framework using History API

**Note**: The admin console does NOT need SPA fallback (uses hash-based routing internally).

### Planned Enhancements
Refer to `ENHANCEMENTS.md` for the full roadmap. Key priorities include:
1.  **Hooks**: Adding `before`/`after` procedure hooks for session setup.
2.  **Streaming**: Moving away from in-memory buffering for large responses.

## 4. Testing Guidelines

### Test Organization

*   **Framework**: Vitest.
*   **Unit Tests**: Colocated with source files in `src/` directory.
    *   Each module should have one test file named `<module>.test.ts` alongside `<module>.ts`.
    *   Example: `src/backend/util/cache.test.ts` tests `src/backend/util/cache.ts`.
*   **Integration Tests**: Located in `tests/backend/integration/`.
    *   Tests that require full middleware stack or database mocking.
    *   File naming: `*.test.ts`.
*   **E2E Tests**: Located in `tests/e2e/`.
    *   Browser-based tests using Playwright.
    *   File naming: `*.e2e.test.ts`.
*   **Performance Tests**: Located in `tests/`.
    *   File naming: `performance.test.ts`.

### Test File Naming

*   **Unit Tests**: `<source-name>.test.ts` (e.g., `cache.test.ts` tests `cache.ts`).
*   **Integration Tests**: `*.test.ts` in `tests/backend/integration/`.
*   **E2E Tests**: `*.e2e.test.ts` in `tests/e2e/`.

### Test Configuration

*   **Vitest Config**: `vitest.config.js` includes both patterns:
    ```javascript
    include: ['tests/**/*.test.{js,ts}', 'src/**/*.test.{js,ts}']
    ```
*   **ESLint Config**: `eslint.config.js` applies relaxed test rules to both:
    ```javascript
    files: ['tests/**/*.{js,ts}', 'src/**/*.test.ts']
    ```

### Coverage Requirements

*   Unit tests should aim for 100% coverage for modules they test.
*   Integration and E2E tests contribute to overall coverage but have separate thresholds.

### Console Output

*   `console.warn` and `console.error` are suppressed by default during tests.
    *   To see full logs, run: `DEBUG=true npm test` or `VERBOSE=true npm test`.
    *   See `tests/setup.ts` for implementation.

### Example Test Patterns

**Unit Test Pattern**:
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule.js';

describe('myModule', () => {
    it('should return expected value', () => {
        const result = myFunction();
        expect(result).toBe('expected');
    });
});
```

**Integration Test Pattern** (in `tests/backend/integration/`):
```typescript
import { describe, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { serverStart, serverStop } from '../../src/backend/server/server.js';

describe('middleware', () => {
    let server;
    beforeAll(async () => { server = await serverStart({...}); });
    afterAll(async () => { await serverStop(server); });
    it('should handle request', async () => {
        const res = await request(server.app).get('/');
        expect(res.status).toBe(200);
    });
});
```

### Linting in Tests

*   TypeScript strict rules are relaxed for test files (see `eslint.config.js`).
*   Allowed in tests: `no-explicit-any`, `no-unsafe-argument`, `dot-notation`, etc.

## 5. Development Workflow

1.  **Understand**: Read existing code. Search using `grep` and `glob`. Check `src/backend/types.ts` for data structures.
2.  **Check Enhancements**: Consult `ENHANCEMENTS.md` to avoid reimplementing known issues or contradicting future plans.
3.  **Consult References**: Check official docs and `thoth-gateway` (see below) for architectural alignment.
4.  **Plan**: Outline changes. Check for existing tests.
5. **Implement**: Write code in `.ts` files.
6. **Verify**:
    *   Run `npm run lint` to fix formatting and type errors immediately.
    *   Run `npx vitest run tests/relevant.test.ts` to verify logic.
7. **Finalize**: **ALWAYS** Run `npm run ci` to ensure the full suite passes. This is **MANDATORY** before finishing a task.

## 6. Project Structure

*   `src/`: Source code.
    *   `backend/`:
        *   `handler/`: Request handlers (`handlerPlSql.ts`).
        *   `handler/plsql/`: PL/SQL execution logic (`procedure.ts`, `parsePage.ts`).
        *   `server/`: Server setup.
        *   `util/`: Utilities.
    *   `frontend/`: Admin console source.
    *   `common/`: Shared constants and logic.
*   `tests/`: Unit, integration, and e2e tests.
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
