# WebRTC + MediaSoup Implementation Notes

## Status

The repository now contains a WebRTC / MediaSoup integration slice across `backend/` and `frontend/`.

Current state:

- MediaSoup config and backend route/service scaffolding exist
- the backend WebRTC code typechecks again
- peer ownership is now tied to the authenticated backend user
- the frontend no longer sends obviously invalid signaling payload shapes
- the implementation is still an in-progress scaffold rather than a finished streaming feature

## Backend Pieces

Files:

- `backend/src/config/mediasoup.ts`
- `backend/src/modules/webrtc/index.ts`
- `backend/src/modules/webrtc/webrtc.routes.ts`
- `backend/src/modules/webrtc/webrtc.service.ts`
- `backend/src/modules/webrtc/webrtc.types.ts`

Implemented responsibilities:

- create and inspect rooms
- add and remove peers
- create transports
- connect transports
- create producers
- list consumable producers
- create consumers
- resume consumers

## Frontend Pieces

Files:

- `frontend/src/hooks/useWebRTC.ts`
- `frontend/src/components/StudentsGrid.tsx`
- `frontend/src/components/VideoStream.tsx`
- `frontend/src/components/LiveStreamGrid.tsx`

Implemented responsibilities:

- join a monitoring room
- create a stable teacher peer identity
- call the backend room and peer endpoints
- render participant state and placeholder stream tiles

## Important Constraints

This is not yet a full mediasoup browser-client implementation.

That means:

- route and service contracts are now much more coherent than before
- backend compilation is restored
- room and peer lifecycle work is easier to evolve
- true production-grade live video still needs deeper client-side mediasoup negotiation work

## API Shape

Current WebRTC endpoints:

- `POST /api/webrtc/rooms`
- `GET /api/webrtc/rooms/:roomId`
- `POST /api/webrtc/rooms/:roomId/peers`
- `POST /api/webrtc/rooms/:roomId/peers/:peerId/connect-transport`
- `POST /api/webrtc/rooms/:roomId/peers/:peerId/produce`
- `GET /api/webrtc/rooms/:roomId/peers/:peerId/consumers`
- `POST /api/webrtc/rooms/:roomId/peers/:peerId/consume`
- `POST /api/webrtc/rooms/:roomId/peers/:peerId/consumers/:producerId/resume`
- `DELETE /api/webrtc/rooms/:roomId/peers/:peerId`

## Practical Next Step

If you want the WebRTC work to move from “structurally correct” to “actually stream video reliably,” the next major task is implementing a proper mediasoup client flow in the frontend rather than relying on placeholder browser-side signaling objects.
