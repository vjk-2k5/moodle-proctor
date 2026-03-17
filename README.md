# DSC Project Workspace

This repository currently contains multiple app folders. The two active proctoring projects are:

- `dsc`: a Next.js teacher dashboard UI
- `manual_proctoring`: an Electron app with an Express backend

## Login Info

### `dsc`

The login page exists at `dsc/src/app/login/page.tsx`, but it does not validate credentials yet. Any email and any password will navigate to the dashboard because this is currently a UI-only flow.

### `manual_proctoring`

The backend in `manual_proctoring/backend/server.js` contains a hardcoded demo login:

- Email: `user`
- Password: `password`

## How To Start

### 1. Run the `dsc` dashboard

Requirements:

- Node.js installed

Steps:

```bash
cd dsc
npm install
npm run dev
```

Open `http://localhost:3000`.

Notes:

- Visiting `/` redirects to `/login`
- The current login form is demo-only and accepts any credentials

### 2. Run the `manual_proctoring` app

This project needs two terminals.

Requirements:

- Node.js installed

Terminal 1, start the backend:

```bash
cd manual_proctoring/backend
npm install
npm start
```

The backend runs at `http://localhost:5000`.

Terminal 2, start the Electron app:

```bash
cd manual_proctoring
npm install
npm start
```

The Electron window opens to the login screen.

Use these demo credentials:

- Email: `user`
- Password: `password`

## Project Notes

- `dsc` already has local generated files like `.next` and `node_modules`
- `manual_proctoring/backend` writes runtime logs to `manual_proctoring/backend/logs`
- Those generated files are now covered by the root `.gitignore`
