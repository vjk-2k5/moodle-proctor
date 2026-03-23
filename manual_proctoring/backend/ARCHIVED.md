# Archived Legacy Backend

This folder is no longer an active runtime backend.

## What changed

- `server.js` is now a guard stub that exits immediately.
- The original Express demo backend was archived to `server.legacy.js`.
- The Electron app should use the unified backend in `backend/`.

## Use this instead

```bash
cd backend
npm run dev
```

## Why this exists

The manual proctoring client was migrated to the compatibility layer in:

- `backend/src/modules/manual-proctoring/manual-proctoring.routes.ts`
- `backend/src/modules/manual-proctoring/manual-proctoring.compat.ts`

This archive is kept only as historical reference.
