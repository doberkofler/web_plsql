# Agent Instructions for web_plsql

This document provides guidelines for AI agents working on the `web_plsql` repository.

## 1. Build, Lint, and Test Commands

This project is a Node.js application using ES Modules and JSDoc for type checking.

### Core Commands

*   **Install Dependencies**: `npm install`
*   **Run All Tests**: `npm run test`
    *   Uses the native Node.js test runner (`node --test`).
*   **Run Single Test**: `node --test tests/path/to/test.js`
    *   Example: `node --test tests/version.test.js`
*   **Lint & Format**: `npm run lint`
    *   Runs `prettier`, `eslint`, and `tsc` (type check).
    *   **Crucial**: Always run this before submitting changes.
*   **Type Check**: `tsc --noEmit` (included in `npm run lint`)
*   **Generate Types**: `npm run types`
*   **Clean**: `npm run clean`
*   **Full CI Check**: `npm run ci`

### Docker Commands

*   **Build Image**: `npm run image-build`
*   **Save Image**: `npm run image-save`

## 2. Code Style & Conventions

### Language & Typing

*   **Language**: JavaScript (ESM).
*   **Type Checking**: Strict TypeScript checking is enabled via JSDoc (`checkJs: true` in `tsconfig.json`).
*   **Files**: Use `.js` extension.
*   **Module System**: ES Modules (`type: "module"`).
    *   **Requirement**: All imports must include the `.js` file extension (e.g., `import { foo } from './bar.js'`).
    *   Use `import`/`export` syntax.

### Formatting & Linting

*   **Formatter**: Prettier.
*   **Linter**: ESLint with `typescript-eslint` strict rules.
*   **Rules**:
    *   No unused variables (warn).
    *   Strict type checking (no implicit any, strict null checks).
    *   JSDoc required for public functions/methods (warn).

### Naming Conventions

*   **Variables/Functions**: `camelCase` (e.g., `handlerWebPlSql`, `getVersion`).
*   **Classes**: `PascalCase`.
*   **Files**: `camelCase` (e.g., `handlerPlSql.js`).
*   **Constants**: `UPPER_SNAKE_CASE` or `camelCase` depending on usage.

### Imports

*   Group imports:
    1.  Node.js built-in modules (prefix with `node:`, e.g., `node:fs`).
    2.  External libraries.
    3.  Internal modules.
*   **Always** use the `.js` extension for local relative imports.

### Error Handling

*   Use standard `try...catch` blocks.
*   Linting disables `caughtErrors` check, but handle errors explicitly.
*   Use `node:assert` for assertions in tests.

## 3. Testing Guidelines

*   **Framework**: Node.js native test runner (`node:test`).
*   **Assertions**: `node:assert`.
*   **Structure**:
    *   Tests are located in the `tests/` directory.
    *   Test files should end with `.test.js`.
*   **Pattern**:
    ```javascript
    import assert from 'node:assert';
    import { describe, it } from 'node:test';
    import { myFunction } from '../src/myModule.js';

    describe('myModule', () => {
        it('should do something', () => {
            const result = myFunction();
            assert.strictEqual(result, 'expected');
        });
    });
    ```
*   **Linting in Tests**: TypeScript strict rules are relaxed in `tests/` (e.g., `no-explicit-any` is off).

## 4. Project Structure

*   `src/`: Source code.
    *   `handler/`: Request handlers (e.g., `handlerPlSql.js`, `handlerUpload.js`).
    *   `server/`: Server setup and configuration.
    *   `util/`: Utility functions.
    *   `index.js`: Main entry point/exports.
*   `tests/`: Unit and integration tests.
*   `types/`: Generated TypeScript declaration files (do not edit manually).
*   `examples/`: Example usage.

## 5. Development Workflow

1.  **Understand**: Read the relevant code in `src/`. Check `package.json` for dependencies.
2.  **Edit**: Make changes. Ensure JSDoc comments are updated.
3.  **Verify**:
    *   Run `npm run lint` to catch formatting and type errors.
    *   Run relevant tests using `node --test tests/...`.
4.  **Commit**: Ensure `npm run ci` passes.
