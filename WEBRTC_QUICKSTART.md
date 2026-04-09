# WebRTC Quick Start

## Purpose

This repo now includes an initial WebRTC + MediaSoup slice for teacher-side live monitoring.

Treat it as a development scaffold:

- backend routes and service wiring exist
- frontend monitoring components exist
- backend typechecking is restored
- full browser-side mediasoup streaming is still not production-complete

## What Exists

Backend:

- `backend/src/config/mediasoup.ts`
- `backend/src/modules/webrtc/`
- WebRTC room, peer, producer, and consumer routes

Frontend:

- `frontend/src/hooks/useWebRTC.ts`
- `frontend/src/components/StudentsGrid.tsx`
- `frontend/src/components/VideoStream.tsx`
- `frontend/src/components/LiveStreamGrid.tsx`

## Install

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Run

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

## Validate

1. Open `http://localhost:3000/dashboard`.
2. Confirm the backend starts without WebRTC registration errors.
3. Confirm the MediaSoup worker initializes.
4. Confirm room and peer lifecycle requests succeed.

## Current Caveat

The current implementation is structurally aligned enough for ongoing development, but reliable end-to-end live media still needs a proper mediasoup browser-client integration and runtime dependency install verification.
