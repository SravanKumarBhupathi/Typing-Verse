# TYPEVERSE — Production Deployment Guide

## 1. Building for Production

Run the TypeScript linter and Vite production bundler:

```bash
npm run lint
npm run build
```

This generates the static client bundle and PWA service worker in `/dist`.

## 2. Running the Production Server

Start the unified Node/Express + WebSocket server:

```bash
NODE_ENV=production npm start
```

The server listens on `0.0.0.0:3000` (or `process.env.PORT`), serving:
- Static assets and PWA manifest/service-worker from `/dist`
- Real-time multiplayer WebSockets on `/ws`
- Anti-cheat score validation and room discovery APIs on `/api/*`

## 3. Cloud Run / Docker / Render Deployment

- Ensure WebSocket connection upgrades (`Connection: Upgrade`, `Upgrade: websocket`) are enabled (supported natively on Google Cloud Run, Render, Fly.io, and Railway).
- Set session affinity if scaling beyond 1 instance, or connect the Supabase Realtime adapter via `VITE_SUPABASE_URL`.
