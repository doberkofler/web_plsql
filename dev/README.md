# web_plsql Development Environment

Development server setup for frontend development without requiring a real Oracle database.

## Overview

Two servers work together:

1. **Backend Server** (port 3001) - Express with mock Oracle
2. **Frontend Server** (port 5173) - Vite dev server with HMR

```
┌─────────────────────┐         ┌──────────────────────┐
│  Vite Dev Server    │         │  Backend Dev Server  │
│  localhost:5173     │ ──────> │  localhost:3001      │
│  - Hot Module       │  Proxy  │  - Admin API         │
│    Reload (HMR)     │         │  - PL/SQL Routes     │
│  - TypeScript       │         │  - Mock Oracle       │
│  - Tailwind CSS     │         │  - Static Assets     │
└─────────────────────┘         └──────────────────────┘
```

## Quick Start

### Start Both Servers

```bash
npm run dev
```

### Start Servers Separately

```bash
# Terminal 1 - Backend (Node 24 native TypeScript)
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

### Access the Application

- **Admin Console**: http://localhost:5173/admin/
- **Backend**: http://localhost:3001/
- **Default Page (Help)**: http://localhost:3001/sample/
- **Static Assets**: http://localhost:3001/static/sample.txt

## Routes & Features

The dev server is configured with the following routes:

| Route | Purpose | URL |
|-------|---------|-----|
| `/sample` | PL/SQL Gateway (Mock) | `http://localhost:3001/sample/` |
| `/static` | Static Assets | `http://localhost:3001/static/` |
| `/admin` | Admin Console | `http://localhost:3001/admin/` |

### Special Package (`$`)

The special package provides server information:

- `http://localhost:3001/sample/$.help` - Help and usage instructions
- `http://localhost:3001/sample/$.health` - Server health status (JSON)

### API Package

The `api` package provides example data mocking:

- `http://localhost:3001/sample/api.html` - Sample HTML content
- `http://localhost:3001/sample/api.json` - Sample JSON data
- `http://localhost:3001/sample/api.files` - Binary file download

### Generic Procedures

Call any procedure name to get an HTML page showing the procedure name and all parameters:

```bash
curl 'http://localhost:3001/sample/mypackage.myproc?id=123&name=test'
```

### JSON Responses

Procedures matching these patterns return JSON:
- `api.json` - Specific JSON sample
- `*.getJson` - Any procedure ending with `getJson`
- `*.getData` - Any procedure ending with `getData`

```bash
curl 'http://localhost:3001/sample/utils.getJson?foo=bar'
```

### Error Simulation (_mock_.* package)

Special URLs for testing error handling:

| URL | Behavior |
|-----|----------|
| `/sample/_mock_.not_found` | ORA-06564: object does not exist |
| `/sample/_mock_.validation_error` | requestValidationFunction rejects request |
| `/sample/_mock_.db_error` | ORA-01017: invalid username/password |
| `/sample/_mock_.timeout` | Request hangs (will timeout) |
| `/sample/_mock_.slow?ms=3000` | Delays response by N milliseconds |

## File Structure

```
dev/
├── server.ts           # Main development backend server
├── mockProcedures.ts   # Dynamic procedure response generator
├── static/             # Static assets served at /static
└── README.md          # This file
```

## Architecture Details

### Backend Server (`dev/server.ts`)

- Express server on port 3001
- Uses `tests/mock/oracledb.ts` for Oracle mocking
- Mounts admin API routes from `src/backend/handler/handlerAdmin.ts`
- Mounts PL/SQL handler at `/sample`
- Serves static files from `dev/static` at `/static`
- **Starts with empty stats** - history accumulates naturally from real requests

### Dynamic Response Generation

`dev/mockProcedures.ts` generates responses on-the-fly:

- Detects `$.` package for system pages (help, health)
- Detects `api.` package for mock data
- Detects `_mock_.` package for errors
- Generates dynamic HTML for everything else

### Vite Dev Server

Configuration in `vite.config.js` proxies requests to backend:

```javascript
proxy: {
  '/sample': { target: 'http://localhost:3001' },
  '/static': { target: 'http://localhost:3001' },
  '/admin/api': { target: 'http://localhost:3001' }
}
```

## Development Workflow

1. **Start dev environment**
   ```bash
   npm run dev
   ```

2. **Test with Special URLs**
   - Visit http://localhost:3001/sample/$.help for instructions
   - Check http://localhost:3001/sample/$.health for status

3. **Test API Mocking**
   - http://localhost:3001/sample/api.json
   - http://localhost:3001/sample/api.files (downloads file)

4. **Test Error Scenarios**
   - Use `_mock_.*` URLs to trigger errors
   - Verify error handling in admin console

5. **Check Stats**
   - Visit admin console: http://localhost:5173/admin/
   - See real-time stats and charts populate
