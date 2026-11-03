# TYPEVERSE — System Architecture

## 1. High-Level Overview

TYPEVERSE uses a modular full-stack TypeScript architecture designed for sub-millisecond typing input responsiveness, 60fps HTML5 Canvas arcade rendering, and real-time multiplayer synchronization:

- **Frontend SPA**: React 19 + TypeScript + Tailwind CSS v4 + Lucide Icons + Vite.
- **Central Typing Engine (`src/engine/typingEngine.ts`)**: Pure, deterministic functions computing Gross WPM, Net WPM, Accuracy, CPM, Consistency (Coefficient of Variation), Reaction Time, and per-key error distributions without blocking keystroke input.
- **Synthesized Audio Engine (`src/utils/soundEngine.ts`)**: Browser-native Web Audio API oscillator synthesis for mechanical switch acoustics (`tactile`, `clicky`, `linear`) and arcade sound effects with zero external MP3 dependencies.
- **Full-Stack Express + WebSocket Server (`server.ts`)**:
  - Hosts `/ws` WebSocket endpoint for server-authoritative Friend Multiplayer lobbies, room code uniqueness enforcement, synchronized countdowns, and live progress broadcasting.
  - Hosts `/api/validate-score` anti-cheat verification endpoint that checks WPM bounds (`<= 260 WPM`), keystroke-to-WPM consistency, and duplicate submission tokens.
- **Dual Persistence Layer (`src/services/storageService.ts`)**:
  - Seamlessly supports guest & offline persistence via browser `localStorage` and connects to `@supabase/supabase-js` when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are provided.

## 2. Directory Structure

- `/server.ts` — Express HTTP + WebSocket multiplayer server + anti-cheat API.
- `/src/types/typeverse.ts` — Strongly-typed domain models across all 15 sections.
- `/src/engine/typingEngine.ts` — WPM/Accuracy formulas, text corpus, and rule-based Adaptive Learning Engine.
- `/src/data/curriculumData.ts` — 21 structured lessons across 6 stages, 5 Bot profiles, 10 Career Ranks, and 12 Achievements.
- `/src/services/storageService.ts` — Unified persistence, rank evaluator, ghost checkpoints, and daily/weekly quests.
- `/src/components/` — Modular view and UI components (`LandingView`, `AcademyView`, `TypingTestView`, `GameArenaView`, `MultiplayerAndCompetitiveViews`, `ProgressionAndProfileViews`, `VirtualKeyboard`, `PWAInstallButton`).
