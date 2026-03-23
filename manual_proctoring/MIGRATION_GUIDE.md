# Manual Proctoring Client Migration Guide

This migration is complete. The Electron manual proctoring client now uses the single main backend.

## Current Architecture

### Before

```text
Electron Client -> manual_proctoring/backend/server.js -> in-memory state
```

### After

```text
Electron Client -> backend (http://localhost:5000) -> manual compatibility layer
```

The old runtime behavior from `manual_proctoring/backend/server.js` now lives in:

- `backend/src/modules/manual-proctoring/manual-proctoring.routes.ts`
- `backend/src/modules/manual-proctoring/manual-proctoring.compat.ts`

## What Was Preserved

- Demo login with `user / password`
- In-memory manual session handling
- In-memory exam attempt state
- Question paper serving from the main backend
- Violation tracking and auto-submit at the warning limit
- Manual-app response shapes expected by the Electron client

## Runtime Setup

Start the main backend:

```bash
cd backend
npm run dev
```

Start the Electron app:

```bash
cd manual_proctoring
npm install
npm start
```

Optional: start the AI proctoring service for live monitoring:

```bash
cd ai_proctoring
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Client Configuration

The Electron client should point to:

```javascript
const APP_CONFIG = {
  apiBaseUrl: 'http://localhost:5000'
}
```

## Validation Checklist

- Login works with `user / password`
- Dashboard loads
- Question paper loads
- Exam starts
- Violations are recorded
- Exam submits correctly

## Cleanup

`manual_proctoring/backend/server.js` is now an archive guard stub. The preserved legacy implementation lives at `manual_proctoring/backend/server.legacy.js`, and active workflows should use the main `backend/` service instead.
