# Manual Proctoring Electron App

This Electron client now uses the main backend only. `manual_proctoring/backend/server.js` has been archived and now exits immediately if run.

## Run

Start the main backend first:

```bash
cd backend
npm run dev
```

Then start the Electron app:

```bash
cd manual_proctoring
npm install
npm start
```

## Backend

- API base URL: `http://localhost:5000`
- Manual compatibility routes live in:
  - `backend/src/modules/manual-proctoring/manual-proctoring.routes.ts`
  - `backend/src/modules/manual-proctoring/manual-proctoring.compat.ts`

## Demo Login

- Email: `user`
- Password: `password`

## Notes

- The question paper is served by the main backend.
- Manual warning logs are written under `backend/logs/manual-proctoring/`.
- The AI proctoring service still runs separately at `http://localhost:8000`.
