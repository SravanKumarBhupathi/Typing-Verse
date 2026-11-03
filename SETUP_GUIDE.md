# TYPEVERSE — Local & Cloud Setup Guide

## 1. Prerequisites

- **Node.js**: v20+
- **npm**: v10+

## 2. Installation & Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Start the full-stack Express + Vite + WebSocket development server on port 3000:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000` in your browser. To test real-time Friend Multiplayer locally, open a second browser window or tab, create a room in Tab 1, and join with the 6-character code in Tab 2.

## 3. Optional Supabase Cloud Setup

If you wish to enable cloud PostgreSQL persistence across devices in addition to the built-in Express WebSocket server:
1. Create a free-tier project at [supabase.com](https://supabase.com).
2. Run the SQL migration inside `DATABASE_SCHEMA.md` in the Supabase SQL Editor.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`.
