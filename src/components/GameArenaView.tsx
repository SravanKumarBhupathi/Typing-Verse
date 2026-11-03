import React, { useState, useEffect, useRef } from 'react';
import { GAME_WORD_POOLS, TEXT_CORPUS } from '../engine/typingEngine';
import {
  DifficultyTier,
  GameId,
  GameResultRecord,
  UserProfile,
  UserSettings,
} from '../types/typeverse';
import { soundEngine } from '../utils/soundEngine';
import {
  ArrowLeft,
  Flame,
  Gamepad2,
  Heart,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Zap,
} from 'lucide-react';

interface GameArenaViewProps {
  profile: UserProfile;
  settings: UserSettings;
  initialGameId?: GameId | null;
  onSaveGameResult: (result: GameResultRecord) => void;
}

interface GameCatalogItem {
  id: GameId;
  title: string;
  genre: string;
  tagline: string;
  instructions: string[];
  accentColor: string;
  borderAccent: string;
}

export const GAME_CATALOG: GameCatalogItem[] = [
  {
    id: 'meteor-defender',
    title: 'Meteor Defender',
    genre: 'Space Arcade Survival',
    tagline: 'Command an orbital starfighter and vaporize incoming word-meteors.',
    instructions: [
      'Meteors approach your orbital station with target words.',
      'Type a word completely to lock laser cannons and destroy the meteor.',
      'Higher WPM increases laser firing rate; high accuracy boosts weapon damage.',
      'Every 3rd wave spawns an armored Boss Meteor requiring a multi-word sequence.',
    ],
    accentColor: 'text-cyan-400',
    borderAccent: 'border-cyan-500/40',
  },
  {
    id: 'type-racer',
    title: 'Type Racer GT',
    genre: 'High-Speed Circuit Racing',
    tagline: 'Accelerate your electric GT cruiser down the midnight circuit against 3 rivals.',
    instructions: [
      'Type the scrolling race telemetry prompt to accelerate toward the 1,000m finish line.',
      'Faster net typing speed directly increases vehicle velocity (km/h).',
      'Maintaining 96%+ accuracy activates Nitro Slipstream stability.',
      'Mistakes cause brief tire drag and break your acceleration multiplier.',
    ],
    accentColor: 'text-sky-400',
    borderAccent: 'border-sky-500/40',
  },
  {
    id: 'spell-caster',
    title: 'Spell Caster',
    genre: 'Fantasy Arcane Combat',
    tagline: 'Channel elemental runes and defeat dark sanctum bosses with precision incantations.',
    instructions: [
      'Enemies materialize with arcane spell words above their shields.',
      'Type the incantation accurately to cast Fireball, Frost Lance, or Astral Nova.',
      'Longer words deal heavier base damage; 97%+ accuracy triggers 1.5x Critical Strikes.',
      'Defeat waves of minions and Boss Dragons before your Sanctum HP reaches zero.',
    ],
    accentColor: 'text-violet-400',
    borderAccent: 'border-violet-500/40',
  },
  {
    id: 'word-defender',
    title: 'Word Defender',
    genre: 'Tactical Tower Defense',
    tagline: 'Hold a 3-lane citadel perimeter against advancing mechanized word squads.',
    instructions: [
      'Hostile units march across Top, Center, and Bottom lanes toward your Citadel Tower.',
      'Type any unit’s word to fire automated rail-turrets down that lane.',
      'Prioritize units closest to the left perimeter wall.',
      'High combos charge an orbital perimeter shield pulse.',
    ],
    accentColor: 'text-emerald-400',
    borderAccent: 'border-emerald-500/40',
  },
  {
    id: 'cyber-duel',
    title: 'Cyber Duel',
    genre: 'Competitive 1v1 Combat',
    tagline: 'Face an arena striker head-to-head where every accurate word charges your counter-attack.',
    instructions: [
      'Both duelists receive equivalent combat prompts in real time.',
      'Accurate typing charges your Kinetic Strike meter and deals direct HP damage to your rival.',
      'Mistakes weaken attack charge and leave your guard open.',
      'Deplete the opponent’s 100 HP bar before they deplete yours!',
    ],
    accentColor: 'text-amber-400',
    borderAccent: 'border-amber-500/40',
  },
  {
    id: 'word-survival',
    title: 'Word Survival',
    genre: 'Countdown Endurance Arcade',
    tagline: 'Defuse volatile countdown nodes before their individual timers detonate.',
    instructions: [
      'Volatile word nodes spawn with individual countdown fuses.',
      'Type the word on any node before its timer hits 0.0s to defuse it.',
      'Expired nodes detonate and reduce your containment core integrity.',
      'Survive as many escalating waves as possible!',
    ],
    accentColor: 'text-rose-400',
    borderAccent: 'border-rose-500/40',
  },
];

interface ActiveEntity {
  id: string;
  word: string;
  typedLen: number;
  x: number;
  y: number;
  lane: number;
  speed: number;
  maxTimer: number;
  timer: number;
  isBoss: boolean;
}

export const GameArenaView: React.FC<GameArenaViewProps> = ({
  settings,
  initialGameId,
  onSaveGameResult,
}) => {
  const [selectedGameId, setSelectedGameId] = useState<GameId | null>(initialGameId || null);
  const [difficulty, setDifficulty] = useState<DifficultyTier>('medium');
  const [phase, setPhase] = useState<'menu' | 'countdown' | 'playing' | 'paused' | 'gameover'>('menu');
  const [countdownNum, setCountdownNum] = useState<number>(3);

  // Shared Telemetry HUD state
  const [score, setScore] = useState<number>(0);
  const [wave, setWave] = useState<number>(1);
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [enemyHp, setEnemyHp] = useState<number>(100);
  const [manaOrNitro, setManaOrNitro] = useState<number>(50);
  const [wpm, setWpm] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(100);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [currentInput, setCurrentInput] = useState<string>('');
  const [wonGame, setWonGame] = useState<boolean>(false);

  // For Type Racer / Cyber Duel continuous prompt mode
  const [continuousPrompt, setContinuousPrompt] = useState<string>('');
  const [continuousTyped, setContinuousTyped] = useState<string>('');
  const [raceDistance, setRaceDistance] = useState<number>(0);
  const [rivalDistances, setRivalDistances] = useState<number[]>([0, 0, 0]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mutable refs for 60fps requestAnimationFrame loop
  const entitiesRef = useRef<ActiveEntity[]>([]);
  const lasersRef = useRef<{ x1: number; y1: number; x2: number; y2: number; alpha: number; color: string }[]>([]);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; alpha: number; color: string }[]>([]);
  const statsRef = useRef({
    startTime: 0,
    totalKeys: 0,
    correctKeys: 0,
    combo: 0,
    maxCombo: 0,
    score: 0,
    wave: 1,
    playerHp: 100,
    enemyHp: 100,
    mana: 50,
    wordsCleared: 0,
    raceDist: 0,
    rivals: [0, 0, 0],
  });

  useEffect(() => {
    if (initialGameId) {
      setSelectedGameId(initialGameId);
      setPhase('menu');
    }
  }, [initialGameId]);

  const pickGameWord = (diff: DifficultyTier, isBoss = false): string => {
    if (isBoss) {
      const bosses = GAME_WORD_POOLS.boss;
      return bosses[Math.floor(Math.random() * bosses.length)];
    }
    const pool = GAME_WORD_POOLS[diff] || GAME_WORD_POOLS.medium;
    const usedWords = new Set(entitiesRef.current.map((e) => e.word));
    const available = pool.filter((w) => !usedWords.has(w));
    const list = available.length > 0 ? available : pool;
    return list[Math.floor(Math.random() * list.length)];
  };

  const spawnEntity = (gameId: GameId, diff: DifficultyTier, currentWave: number, isBoss = false) => {
    const speedMult = diff === 'easy' ? 0.65 : diff === 'medium' ? 1.0 : diff === 'hard' ? 1.35 : 1.7;
    const word = pickGameWord(diff, isBoss);
    const id = 'ent_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

    if (gameId === 'meteor-defender') {
      entitiesRef.current.push({
        id,
        word,
        typedLen: 0,
        x: isBoss ? 360 : 90 + Math.random() * 540,
        y: -25,
        lane: 0,
        speed: (isBoss ? 14 : 24 + currentWave * 2.5) * speedMult,
        maxTimer: 15,
        timer: 15,
        isBoss,
      });
    } else if (gameId === 'word-defender') {
      const lane = Math.floor(Math.random() * 3);
      const laneY = lane === 0 ? 95 : lane === 1 ? 190 : 285;
      entitiesRef.current.push({
        id,
        word,
        typedLen: 0,
        x: 720,
        y: laneY,
        lane,
        speed: (28 + currentWave * 3) * speedMult,
        maxTimer: 15,
        timer: 15,
        isBoss,
      });
    } else if (gameId === 'spell-caster') {
      entitiesRef.current.push({
        id,
        word,
        typedLen: 0,
        x: isBoss ? 540 : 480 + Math.random() * 160,
        y: isBoss ? 180 : 85 + Math.random() * 200,
        lane: 0,
        speed: (12 + currentWave * 1.8) * speedMult,
        maxTimer: isBoss ? 14 : 10,
        timer: isBoss ? 14 : 10,
        isBoss,
      });
    } else if (gameId === 'word-survival') {
      const maxT = Math.max(4.5, (isBoss ? 11 : 8.5 - currentWave * 0.35) / Math.sqrt(speedMult));
      entitiesRef.current.push({
        id,
        word,
        typedLen: 0,
        x: 110 + Math.random() * 500,
        y: 75 + Math.random() * 220,
        lane: 0,
        speed: 0,
        maxTimer: maxT,
        timer: maxT,
        isBoss,
      });
    }
  };

  const beginCountdown = () => {
    setPhase('countdown');
    setCountdownNum(3);
    soundEngine.playGameSfx(settings, 'countdown');
  };

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownNum <= 0) {
      startGameplaySession();
      return;
    }
    const t = setTimeout(() => {
      if (countdownNum > 1) soundEngine.playGameSfx(settings, 'countdown');
      setCountdownNum((c) => c - 1);
    }, 800);
    return () => clearTimeout(t);
  }, [phase, countdownNum]);

  const startGameplaySession = () => {
    if (!selectedGameId) return;
    entitiesRef.current = [];
    lasersRef.current = [];
    particlesRef.current = [];

    statsRef.current = {
      startTime: Date.now(),
      totalKeys: 0,
      correctKeys: 0,
      combo: 0,
      maxCombo: 0,
      score: 0,
      wave: 1,
      playerHp: 100,
      enemyHp: 100,
      mana: 50,
      wordsCleared: 0,
      raceDist: 0,
      rivals: [0, 0, 0],
    };

    setScore(0);
    setWave(1);
    setPlayerHp(100);
    setEnemyHp(100);
    setManaOrNitro(50);
    setWpm(0);
    setAccuracy(100);
    setCombo(0);
    setMaxCombo(0);
    setCurrentInput('');
    setRaceDistance(0);
    setRivalDistances([0, 0, 0]);
    setWonGame(false);

    if (selectedGameId === 'type-racer' || selectedGameId === 'cyber-duel') {
      const pool = TEXT_CORPUS[difficulty] || TEXT_CORPUS.medium;
      const joined = [...pool].sort(() => Math.random() - 0.5).join(' ');
      setContinuousPrompt(joined);
      setContinuousTyped('');
    } else {
      spawnEntity(selectedGameId, difficulty, 1, false);
      spawnEntity(selectedGameId, difficulty, 1, false);
    }

    setPhase('playing');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const endGameSession = (victory: boolean) => {
    if (!selectedGameId) return;
    setPhase('gameover');
    setWonGame(victory);
    soundEngine.playGameSfx(settings, victory ? 'victory' : 'explosion');

    const elapsedSec = Math.max(5, Math.round((Date.now() - statsRef.current.startTime) / 1000));
    const finalWpm = Math.round(((statsRef.current.correctKeys / 5) / (elapsedSec / 60)) * 10) / 10;
    const finalAcc =
      statsRef.current.totalKeys > 0
        ? Math.round((statsRef.current.correctKeys / statsRef.current.totalKeys) * 1000) / 10
        : 100;

    const xpEarned = Math.min(
      320,
      Math.round(statsRef.current.score * 0.08 + finalWpm * 1.2 + (victory ? 75 : 25))
    );

    onSaveGameResult({
      id: 'gm_' + Date.now(),
      gameId: selectedGameId,
      difficulty,
      score: statsRef.current.score,
      waveOrDistance:
        selectedGameId === 'type-racer'
          ? Math.round(statsRef.current.raceDist)
          : statsRef.current.wave,
      wpm: finalWpm,
      accuracy: finalAcc,
      maxCombo: statsRef.current.maxCombo,
      durationSec: elapsedSec,
      won: victory,
      xpEarned,
      createdAt: new Date().toISOString(),
    });
  };

  // Main 60FPS Canvas Game Loop
  useEffect(() => {
    if (phase !== 'playing' || !selectedGameId) return;

    let animationFrameId: number;
    let lastTimestamp = performance.now();
    let spawnAccumulator = 0;
    let hudSyncAccumulator = 0;

    const diffRivalSpeed =
      difficulty === 'easy' ? 14 : difficulty === 'medium' ? 22 : difficulty === 'hard' ? 31 : 40;

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTimestamp) / 1000);
      lastTimestamp = now;
      spawnAccumulator += dt;
      hudSyncAccumulator += dt;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      // Update game logic
      if (selectedGameId === 'type-racer') {
        statsRef.current.rivals = statsRef.current.rivals.map(
          (d, i) => d + (diffRivalSpeed * (0.9 + i * 0.1)) * dt
        );
        if (statsRef.current.raceDist >= 1000) {
          endGameSession(true);
          return;
        }
        if (statsRef.current.rivals.some((r) => r >= 1000)) {
          endGameSession(false);
          return;
        }
      } else if (selectedGameId === 'cyber-duel') {
        // Rival attacks periodically based on difficulty
        const rivalDps =
          difficulty === 'easy' ? 1.8 : difficulty === 'medium' ? 2.8 : difficulty === 'hard' ? 4.0 : 5.4;
        statsRef.current.playerHp = Math.max(0, statsRef.current.playerHp - rivalDps * dt);
        if (statsRef.current.enemyHp <= 0) {
          endGameSession(true);
          return;
        }
        if (statsRef.current.playerHp <= 0) {
          endGameSession(false);
          return;
        }
      } else {
        // Entity-based games: Meteor Defender, Spell Caster, Word Defender, Word Survival
        const spawnInterval = Math.max(
          1.2,
          (difficulty === 'easy' ? 3.2 : difficulty === 'medium' ? 2.5 : difficulty === 'hard' ? 2.0 : 1.6) -
            statsRef.current.wave * 0.08
        );

        if (spawnAccumulator >= spawnInterval && entitiesRef.current.length < 7) {
          spawnAccumulator = 0;
          const isBoss =
            statsRef.current.wordsCleared > 0 &&
            statsRef.current.wordsCleared % 8 === 0 &&
            !entitiesRef.current.some((e) => e.isBoss);
          spawnEntity(selectedGameId, difficulty, statsRef.current.wave, isBoss);
        }

        const remainingEntities: ActiveEntity[] = [];
        for (const ent of entitiesRef.current) {
          if (selectedGameId === 'meteor-defender') {
            ent.y += ent.speed * dt;
            if (ent.y >= 335) {
              statsRef.current.playerHp = Math.max(0, statsRef.current.playerHp - (ent.isBoss ? 35 : 18));
              statsRef.current.combo = 0;
              soundEngine.playGameSfx(settings, 'hit');
              continue;
            }
          } else if (selectedGameId === 'word-defender') {
            ent.x -= ent.speed * dt;
            if (ent.x <= 85) {
              statsRef.current.playerHp = Math.max(0, statsRef.current.playerHp - (ent.isBoss ? 30 : 15));
              statsRef.current.combo = 0;
              soundEngine.playGameSfx(settings, 'hit');
              continue;
            }
          } else if (selectedGameId === 'spell-caster' || selectedGameId === 'word-survival') {
            ent.timer -= dt;
            if (ent.timer <= 0) {
              statsRef.current.playerHp = Math.max(0, statsRef.current.playerHp - (ent.isBoss ? 30 : 16));
              statsRef.current.combo = 0;
              soundEngine.playGameSfx(settings, 'hit');
              continue;
            }
          }
          remainingEntities.push(ent);
        }
        entitiesRef.current = remainingEntities;

        if (statsRef.current.playerHp <= 0) {
          endGameSession(false);
          return;
        }
      }

      // Sync React HUD at ~8Hz
      if (hudSyncAccumulator >= 0.12) {
        hudSyncAccumulator = 0;
        const elapsedMin = Math.max(0.03, (Date.now() - statsRef.current.startTime) / 60000);
        const currentWpm = Math.round((statsRef.current.correctKeys / 5) / elapsedMin);
        const currentAcc =
          statsRef.current.totalKeys > 0
            ? Math.round((statsRef.current.correctKeys / statsRef.current.totalKeys) * 100)
            : 100;
        setWpm(currentWpm);
        setAccuracy(currentAcc);
        setScore(statsRef.current.score);
        setWave(statsRef.current.wave);
        setPlayerHp(Math.round(statsRef.current.playerHp));
        setEnemyHp(Math.round(statsRef.current.enemyHp));
        setManaOrNitro(Math.round(statsRef.current.mana));
        setCombo(statsRef.current.combo);
        setMaxCombo(statsRef.current.maxCombo);
        setRaceDistance(Math.round(statsRef.current.raceDist));
        setRivalDistances(statsRef.current.rivals.map((r) => Math.round(r)));
      }

      // Render Canvas
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Background
        ctx.fillStyle = '#070B14';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Subtle grid
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
        ctx.lineWidth = 1;
        for (let gx = 0; gx < canvas.width; gx += 48) {
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, canvas.height);
          ctx.stroke();
        }
        for (let gy = 0; gy < canvas.height; gy += 48) {
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(canvas.width, gy);
          ctx.stroke();
        }

        if (selectedGameId === 'meteor-defender') {
          // Starfighter at bottom center
          const shipX = canvas.width / 2;
          const shipY = 342;
          ctx.fillStyle = '#06B6D4';
          ctx.beginPath();
          ctx.moveTo(shipX, shipY - 18);
          ctx.lineTo(shipX - 18, shipY + 14);
          ctx.lineTo(shipX + 18, shipY + 14);
          ctx.closePath();
          ctx.fill();

          // Orbital shield line
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 335);
          ctx.lineTo(canvas.width, 335);
          ctx.stroke();
        } else if (selectedGameId === 'word-defender') {
          // Citadel wall on left
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(16, 30, 65, 310);
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 2;
          ctx.strokeRect(16, 30, 65, 310);

          // 3 lane dividers
          [95, 190, 285].forEach((ly) => {
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
            ctx.beginPath();
            ctx.moveTo(85, ly);
            ctx.lineTo(canvas.width, ly);
            ctx.stroke();
            // Turret node
            ctx.fillStyle = '#10B981';
            ctx.beginPath();
            ctx.arc(65, ly, 8, 0, Math.PI * 2);
            ctx.fill();
          });
        } else if (selectedGameId === 'spell-caster') {
          // Archmage aura on left
          ctx.strokeStyle = '#8B5CF6';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(95, 190, 36, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#A78BFA';
          ctx.font = '600 12px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('ARCHMAGE', 95, 194);
        } else if (selectedGameId === 'type-racer') {
          // 4 Racing lanes
          const lanes = [
            { label: 'YOU (GT-01)', dist: statsRef.current.raceDist, color: '#06B6D4' },
            { label: 'APEX RIVAL', dist: statsRef.current.rivals[2], color: '#8B5CF6' },
            { label: 'PULSE BOT', dist: statsRef.current.rivals[1], color: '#F59E0B' },
            { label: 'SCOUT GT', dist: statsRef.current.rivals[0], color: '#10B981' },
          ];
          lanes.forEach((ln, idx) => {
            const y = 65 + idx * 78;
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
            ctx.strokeRect(40, y - 22, 680, 44);
            const carX = 55 + Math.min(1, ln.dist / 1000) * 620;
            ctx.fillStyle = ln.color;
            ctx.fillRect(carX, y - 12, 38, 24);
            ctx.fillStyle = '#F8FAFC';
            ctx.font = '600 11px "JetBrains Mono", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`${ln.label} · ${Math.min(1000, Math.round(ln.dist))}m / 1000m`, 52, y - 27);
          });
        } else if (selectedGameId === 'cyber-duel') {
          // Left Player Striker vs Right Cyber Rival
          ctx.fillStyle = '#06B6D4';
          ctx.fillRect(110, 140, 60, 90);
          ctx.fillStyle = '#F59E0B';
          ctx.fillRect(590, 140, 60, 90);

          // Health Bars
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(70, 90, 160, 14);
          ctx.fillStyle = '#06B6D4';
          ctx.fillRect(70, 90, 1.6 * Math.max(0, statsRef.current.playerHp), 14);

          ctx.fillStyle = '#1E293B';
          ctx.fillRect(530, 90, 160, 14);
          ctx.fillStyle = '#F59E0B';
          ctx.fillRect(530, 90, 1.6 * Math.max(0, statsRef.current.enemyHp), 14);

          ctx.fillStyle = '#F8FAFC';
          ctx.font = '600 12px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`YOU: ${Math.round(statsRef.current.playerHp)} HP`, 70, 82);
          ctx.fillText(`RIVAL: ${Math.round(statsRef.current.enemyHp)} HP`, 530, 82);
        }

        // Draw entities with word labels
        for (const ent of entitiesRef.current) {
          // Node circle
          ctx.beginPath();
          ctx.arc(ent.x, ent.y, ent.isBoss ? 24 : 15, 0, Math.PI * 2);
          ctx.fillStyle = ent.isBoss ? 'rgba(244, 63, 94, 0.25)' : 'rgba(6, 182, 212, 0.2)';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = ent.isBoss ? '#F43F5E' : '#06B6D4';
          ctx.stroke();

          // Timer ring for Spell Caster / Word Survival
          if (selectedGameId === 'word-survival' || selectedGameId === 'spell-caster') {
            const ratio = Math.max(0, ent.timer / ent.maxTimer);
            ctx.beginPath();
            ctx.arc(ent.x, ent.y, ent.isBoss ? 28 : 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
            ctx.strokeStyle = ratio < 0.3 ? '#F43F5E' : '#A78BFA';
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }

          // Word Plate
          ctx.font = '600 13px "JetBrains Mono", monospace';
          const textW = ctx.measureText(ent.word).width + 16;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.fillRect(ent.x - textW / 2, ent.y - 38, textW, 22);
          ctx.strokeStyle = ent.isBoss ? '#F43F5E' : 'rgba(56, 189, 248, 0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(ent.x - textW / 2, ent.y - 38, textW, 22);

          ctx.fillStyle = '#F8FAFC';
          ctx.textAlign = 'center';
          ctx.fillText(ent.word, ent.x, ent.y - 23);
        }

        // Draw active lasers
        lasersRef.current = lasersRef.current.filter((l) => l.alpha > 0.05);
        for (const l of lasersRef.current) {
          ctx.strokeStyle = l.color;
          ctx.globalAlpha = l.alpha;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(l.x1, l.y1);
          ctx.lineTo(l.x2, l.y2);
          ctx.stroke();
          l.alpha -= dt * 4;
        }
        ctx.globalAlpha = 1;

        // Draw explosion particles
        particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0.05);
        for (const p of particlesRef.current) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.alpha -= dt * 2.2;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillRect(p.x, p.y, 4, 4);
        }
        ctx.globalAlpha = 1;
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [phase, selectedGameId, difficulty, settings]);

  // Handle typing input in games
  const handleGameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (phase !== 'playing' || !selectedGameId) return;
    const val = e.target.value;

    // Continuous prompt games (Type Racer & Cyber Duel)
    if (selectedGameId === 'type-racer' || selectedGameId === 'cyber-duel') {
      statsRef.current.totalKeys += 1;
      const expectedChar = continuousPrompt[continuousTyped.length];
      const typedChar = val[val.length - 1];

      if (typedChar === expectedChar) {
        statsRef.current.correctKeys += 1;
        statsRef.current.combo += 1;
        statsRef.current.maxCombo = Math.max(statsRef.current.maxCombo, statsRef.current.combo);
        const nextTyped = continuousTyped + typedChar;
        setContinuousTyped(nextTyped);
        soundEngine.playKeystroke(settings, false);

        if (selectedGameId === 'type-racer') {
          const boost = 5.2 + Math.min(4, statsRef.current.combo * 0.08);
          statsRef.current.raceDist += boost;
          statsRef.current.score += Math.round(boost * 4);
        } else {
          // Cyber Duel damage
          const dmg = 1.15 + Math.min(1.2, statsRef.current.combo * 0.03);
          statsRef.current.enemyHp = Math.max(0, statsRef.current.enemyHp - dmg);
          statsRef.current.score += 18;
          if (typedChar === ' ') {
            lasersRef.current.push({
              x1: 170,
              y1: 185,
              x2: 590,
              y2: 185,
              alpha: 1,
              color: '#06B6D4',
            });
            soundEngine.playGameSfx(settings, 'laser');
          }
        }
      } else {
        statsRef.current.combo = 0;
        soundEngine.playKeystroke(settings, true);
      }
      return;
    }

    // Word-lock games: Meteor Defender, Spell Caster, Word Defender, Word Survival
    const cleanVal = val.trimStart();
    statsRef.current.totalKeys += 1;

    const matchingEntity = entitiesRef.current.find((ent) =>
      ent.word.toLowerCase().startsWith(cleanVal.toLowerCase())
    );

    if (matchingEntity) {
      statsRef.current.correctKeys += 1;
      statsRef.current.combo += 1;
      statsRef.current.maxCombo = Math.max(statsRef.current.maxCombo, statsRef.current.combo);
      soundEngine.playKeystroke(settings, false);

      // Exact word completion
      if (cleanVal.toLowerCase() === matchingEntity.word.toLowerCase()) {
        setCurrentInput('');
        entitiesRef.current = entitiesRef.current.filter((e) => e.id !== matchingEntity.id);
        statsRef.current.wordsCleared += 1;
        const wordBonus = matchingEntity.word.length * 25 + statsRef.current.combo * 5;
        statsRef.current.score += matchingEntity.isBoss ? wordBonus * 2 : wordBonus;
        statsRef.current.mana = Math.min(100, statsRef.current.mana + 12);

        if (statsRef.current.wordsCleared % 5 === 0) {
          statsRef.current.wave += 1;
        }

        // Visual laser + explosion particles
        const originX = selectedGameId === 'meteor-defender' ? 380 : 95;
        const originY = selectedGameId === 'meteor-defender' ? 335 : 190;
        lasersRef.current.push({
          x1: originX,
          y1: originY,
          x2: matchingEntity.x,
          y2: matchingEntity.y,
          alpha: 1,
          color: selectedGameId === 'spell-caster' ? '#A78BFA' : '#06B6D4',
        });

        for (let p = 0; p < 12; p++) {
          particlesRef.current.push({
            x: matchingEntity.x,
            y: matchingEntity.y,
            vx: (Math.random() - 0.5) * 140,
            vy: (Math.random() - 0.5) * 140,
            alpha: 1,
            color: matchingEntity.isBoss ? '#F43F5E' : '#06B6D4',
          });
        }

        soundEngine.playGameSfx(
          settings,
          selectedGameId === 'spell-caster' ? 'spell' : 'laser'
        );

        // Immediately spawn a replacement if board is empty
        if (entitiesRef.current.length === 0) {
          spawnEntity(selectedGameId, difficulty, statsRef.current.wave, false);
        }

        // Victory threshold at Wave 8
        if (statsRef.current.wave >= 8) {
          endGameSession(true);
        }
      } else {
        setCurrentInput(cleanVal);
      }
    } else {
      statsRef.current.combo = 0;
      soundEngine.playKeystroke(settings, true);
      setCurrentInput(cleanVal);
    }
  };

  if (!selectedGameId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Skill-Driven Game Arena
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Six distinct arcade games powered directly by your real typing velocity, accuracy, and combo discipline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAME_CATALOG.map((game) => (
            <div
              key={game.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-6 flex flex-col justify-between hover:border-cyan-500/60 transition-colors"
            >
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span>{game.genre}</span>
                  <span aria-hidden="true"> · </span>
                  <span>Live Telemetry</span>
                </div>
                <h2 className={`text-xl font-bold ${game.accentColor}`}>{game.title}</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {game.tagline}
                </p>
                <ul className="mt-4 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {game.instructions.slice(0, 2).map((inst, i) => (
                    <li key={i}>• {inst}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500">Easy · Med · Hard · Expert</span>
                <button
                  onClick={() => {
                    setSelectedGameId(game.id);
                    setPhase('menu');
                  }}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  Enter Game
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const activeGameMeta = GAME_CATALOG.find((g) => g.id === selectedGameId) || GAME_CATALOG[0];

  return (
    <div className="space-y-5">
      {/* Top Game Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => {
            setSelectedGameId(null);
            setPhase('menu');
          }}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Game Arena
        </button>

        <div className="flex items-center gap-2">
          {(['easy', 'medium', 'hard', 'expert'] as DifficultyTier[]).map((d) => (
            <button
              key={d}
              disabled={phase === 'playing' || phase === 'countdown'}
              onClick={() => setDifficulty(d)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                difficulty === d
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Live Game HUD */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-3">
          <div className="text-xs text-slate-500">Score</div>
          <div className="text-xl font-bold font-mono tabular-nums text-cyan-400">{score}</div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-3">
          <div className="text-xs text-slate-500">
            {selectedGameId === 'type-racer' ? 'Distance' : 'Wave'}
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {selectedGameId === 'type-racer' ? `${raceDistance}m` : `Wave ${wave}`}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-3">
          <div className="text-xs text-slate-500">Live WPM</div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-400">{wpm}</div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-3">
          <div className="text-xs text-slate-500">Accuracy</div>
          <div className="text-xl font-bold font-mono tabular-nums text-sky-400">{accuracy}%</div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-3">
          <div className="text-xs text-slate-500">Combo</div>
          <div className="text-xl font-bold font-mono tabular-nums text-violet-400">{combo}x</div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">Hull / HP</div>
            <div className="text-xl font-bold font-mono tabular-nums text-rose-400">{playerHp}%</div>
          </div>
          {phase === 'playing' && (
            <button
              onClick={() => setPhase('paused')}
              className="p-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
              title="Pause Game"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Game Viewport */}
      <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#070B14] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={760}
          height={360}
          onClick={() => inputRef.current?.focus()}
          className="w-full h-[340px] sm:h-[380px] block cursor-crosshair"
        />

        {/* MENU OVERLAY */}
        {phase === 'menu' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="max-w-lg w-full text-center space-y-4">
              <div className="text-xs font-medium text-cyan-400">{activeGameMeta.genre}</div>
              <h2 className="text-3xl font-bold text-white">{activeGameMeta.title}</h2>
              <div className="text-left rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-2 text-xs text-slate-300">
                {activeGameMeta.instructions.map((line, idx) => (
                  <p key={idx}>
                    <strong className="text-cyan-400">0{idx + 1}.</strong> {line}
                  </p>
                ))}
              </div>
              <button
                onClick={beginCountdown}
                className="px-8 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-colors"
              >
                Start Game ({difficulty.toUpperCase()})
              </button>
            </div>
          </div>
        )}

        {/* COUNTDOWN OVERLAY */}
        {phase === 'countdown' && (
          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center">
            <div className="text-xs uppercase tracking-widest text-cyan-400 mb-2">
              Prepare Fingers on Home Row
            </div>
            <div className="text-6xl font-bold font-mono text-white">{countdownNum}</div>
          </div>
        )}

        {/* PAUSED OVERLAY */}
        {phase === 'paused' && (
          <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center gap-4">
            <h3 className="text-2xl font-bold text-white">Game Paused</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setPhase('playing');
                  setTimeout(() => inputRef.current?.focus(), 40);
                }}
                className="px-5 py-2.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-semibold"
              >
                Resume
              </button>
              <button
                onClick={beginCountdown}
                className="px-5 py-2.5 rounded-lg border border-slate-700 text-white text-xs font-semibold"
              >
                Restart
              </button>
            </div>
          </div>
        )}

        {/* GAME OVER / VICTORY OVERLAY */}
        {phase === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 flex items-center justify-center p-6">
            <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-[#0B1120] p-6 text-center space-y-4">
              <div className="text-xs font-semibold text-cyan-400">
                {wonGame ? 'MISSION ACCOMPLISHED' : 'SESSION COMPLETE'}
              </div>
              <h3 className="text-2xl font-bold text-white">
                {wonGame ? `Victory in ${activeGameMeta.title}!` : `${activeGameMeta.title} Results`}
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-900">
                  <div className="text-slate-400">Final Score</div>
                  <div className="text-lg font-bold font-mono text-cyan-400">{score}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900">
                  <div className="text-slate-400">Net WPM / Acc</div>
                  <div className="text-lg font-bold font-mono text-emerald-400">
                    {wpm} WPM · {accuracy}%
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={beginCountdown}
                  className="px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors"
                >
                  Play Again
                </button>
                <button
                  onClick={() => setSelectedGameId(null)}
                  className="px-5 py-2.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                  Switch Game
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Typing Control Bar Below Canvas */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-4">
        {selectedGameId === 'type-racer' || selectedGameId === 'cyber-duel' ? (
          <div>
            <div className="text-xs text-slate-500 mb-2">
              Continuous Combat/Race Prompt (Type to accelerate / strike):
            </div>
            <div
              onClick={() => inputRef.current?.focus()}
              className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 font-mono text-base leading-relaxed select-none cursor-text"
            >
              {continuousPrompt
                .slice(Math.max(0, continuousTyped.length - 25), continuousTyped.length + 75)
                .split('')
                .map((ch, idx) => {
                  const offset = Math.max(0, continuousTyped.length - 25);
                  const realIdx = offset + idx;
                  const cls =
                    realIdx < continuousTyped.length
                      ? 'text-cyan-400'
                      : realIdx === continuousTyped.length
                      ? 'bg-cyan-500 text-slate-950 font-bold px-0.5 rounded'
                      : 'text-slate-400';
                  return (
                    <span key={realIdx} className={cls}>
                      {ch}
                    </span>
                  );
                })}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={continuousTyped}
              onChange={handleGameInputChange}
              aria-label="Continuous game typing input"
              className="sr-only"
              autoFocus
            />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <input
                ref={inputRef}
                type="text"
                value={currentInput}
                onChange={handleGameInputChange}
                placeholder="Type any active target word on the screen..."
                aria-label="Target word typing input"
                className="w-full rounded-lg border border-cyan-500/50 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 font-mono text-base text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400"
                autoFocus
              />
            </div>
            <button
              onClick={beginCountdown}
              className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restart Wave
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
