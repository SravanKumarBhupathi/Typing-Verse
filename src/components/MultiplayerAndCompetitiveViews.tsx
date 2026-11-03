import React, { useState, useEffect, useRef } from 'react';
import { BOT_OPPONENTS } from '../data/curriculumData';
import { computeLiveMetrics, generatePromptText } from '../engine/typingEngine';
import {
  BotOpponent,
  CustomChallenge,
  DifficultyTier,
  Tournament,
  UserProfile,
  UserSettings,
} from '../types/typeverse';
import { soundEngine } from '../utils/soundEngine';
import {
  Bot,
  Check,
  Copy,
  Crown,
  Link2,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Share2,
  Shield,
  Swords,
  Trophy,
  Users,
  Wifi,
} from 'lucide-react';

// ============================================================================
// 1. BOT BATTLES VIEW (5 Realistic Bot Tiers with Mistake & Backspace Behavior)
// ============================================================================
interface BotBattlesViewProps {
  profile: UserProfile;
  settings: UserSettings;
  onRecordMatch: (won: boolean, wpm: number, accuracy: number, durationSec: number) => void;
}

export const BotBattlesView: React.FC<BotBattlesViewProps> = ({
  profile,
  settings,
  onRecordMatch,
}) => {
  const [selectedBot, setSelectedBot] = useState<BotOpponent>(BOT_OPPONENTS[1]);
  const [phase, setPhase] = useState<'select' | 'countdown' | 'racing' | 'finished'>('select');
  const [countdown, setCountdown] = useState(3);
  const [promptText, setPromptText] = useState('');
  const [typed, setTyped] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalKeys, setTotalKeys] = useState(0);
  const [errorKeys, setErrorKeys] = useState(0);

  // Bot realistic typing state
  const [botTyped, setBotTyped] = useState('');
  const [botMistakeActive, setBotMistakeActive] = useState(false);
  const [botWpmLive, setBotWpmLive] = useState(0);
  const [botAccLive, setBotAccLive] = useState(96);
  const [winner, setWinner] = useState<'player' | 'bot' | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const botStateRef = useRef({
    index: 0,
    hasTypo: false,
    totalBotStrokes: 0,
    botErrors: 0,
    finished: false,
  });

  const targetAdaptiveWpm = Math.max(22, Math.min(105, Math.round((profile.avgWpm || 38) * 1.03)));

  const startBotMatch = (bot: BotOpponent) => {
    setSelectedBot(bot);
    const diffMap: Record<string, 'easy' | 'medium' | 'hard' | 'expert'> = {
      easy: 'easy',
      medium: 'medium',
      hard: 'hard',
      expert: 'expert',
      adaptive: profile.avgWpm > 60 ? 'hard' : 'medium',
    };
    const prompt = generatePromptText(diffMap[bot.difficulty] || 'medium', 30);
    setPromptText(prompt);
    setTyped('');
    setBotTyped('');
    setTotalKeys(0);
    setErrorKeys(0);
    setWinner(null);
    botStateRef.current = {
      index: 0,
      hasTypo: false,
      totalBotStrokes: 0,
      botErrors: 0,
      finished: false,
    };
    setCountdown(3);
    setPhase('countdown');
    soundEngine.playGameSfx(settings, 'countdown');
  };

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setStartTime(Date.now());
      setPhase('racing');
      setTimeout(() => inputRef.current?.focus(), 40);
      return;
    }
    const timer = setTimeout(() => {
      if (countdown > 1) soundEngine.playGameSfx(settings, 'countdown');
      setCountdown((c) => c - 1);
    }, 800);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  // Realistic character-by-character Bot Simulation Loop
  useEffect(() => {
    if (phase !== 'racing' || !startTime) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const baseWpm =
      selectedBot.difficulty === 'adaptive'
        ? targetAdaptiveWpm
        : (selectedBot.wpmRange[0] + selectedBot.wpmRange[1]) / 2;

    const meanCharIntervalMs = 60000 / (baseWpm * 5);

    const stepBot = () => {
      if (botStateRef.current.finished) return;

      // If bot made a typo on previous stroke, pause briefly and press Backspace to correct it!
      if (botStateRef.current.hasTypo) {
        botStateRef.current.hasTypo = false;
        setBotMistakeActive(false);
        setBotTyped(promptText.slice(0, botStateRef.current.index));
        timeoutId = setTimeout(stepBot, selectedBot.correctionDelayMs);
        return;
      }

      // Decide if bot makes an occasional realistic mistake
      if (Math.random() < selectedBot.mistakeProbability && botStateRef.current.index < promptText.length - 1) {
        botStateRef.current.hasTypo = true;
        botStateRef.current.totalBotStrokes += 1;
        botStateRef.current.botErrors += 1;
        setBotMistakeActive(true);
        setBotTyped(promptText.slice(0, botStateRef.current.index) + '#');
        timeoutId = setTimeout(stepBot, selectedBot.correctionDelayMs);
        return;
      }

      // Advance 1 correct character
      botStateRef.current.index += 1;
      botStateRef.current.totalBotStrokes += 1;
      const nextSlice = promptText.slice(0, botStateRef.current.index);
      setBotTyped(nextSlice);

      const elapsedMin = Math.max(0.02, (Date.now() - startTime) / 60000);
      setBotWpmLive(Math.round((botStateRef.current.index / 5) / elapsedMin));
      setBotAccLive(
        Math.round(
          ((botStateRef.current.totalBotStrokes - botStateRef.current.botErrors) /
            Math.max(1, botStateRef.current.totalBotStrokes)) *
            1000
        ) / 10
      );

      if (botStateRef.current.index >= promptText.length) {
        botStateRef.current.finished = true;
        setWinner('bot');
        setPhase('finished');
        const elapsedSec = Math.max(3, Math.round((Date.now() - startTime) / 1000));
        const pWpm = Math.round(((typed.length / 5) / (elapsedSec / 60)) * 10) / 10;
        const pAcc = totalKeys > 0 ? Math.round(((totalKeys - errorKeys) / totalKeys) * 100) : 100;
        onRecordMatch(false, pWpm, pAcc, elapsedSec);
        return;
      }

      // Natural human-like keystroke jitter (±28%)
      const jitter = 0.72 + Math.random() * 0.56;
      timeoutId = setTimeout(stepBot, meanCharIntervalMs * jitter);
    };

    timeoutId = setTimeout(stepBot, meanCharIntervalMs);
    return () => clearTimeout(timeoutId);
  }, [phase, startTime, selectedBot, promptText]);

  const handlePlayerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (phase !== 'racing') return;
    if (e.key === 'Backspace') {
      if (typed.length > 0) setTyped((prev) => prev.slice(0, -1));
      e.preventDefault();
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const expected = promptText[typed.length];
      const isCorrect = e.key === expected;
      setTotalKeys((k) => k + 1);
      if (!isCorrect) {
        setErrorKeys((err) => err + 1);
        soundEngine.playKeystroke(settings, true);
      } else {
        soundEngine.playKeystroke(settings, false);
      }

      const nextTyped = typed + e.key;
      setTyped(nextTyped);

      if (nextTyped === promptText) {
        botStateRef.current.finished = true;
        setWinner('player');
        setPhase('finished');
        soundEngine.playGameSfx(settings, 'victory');
        const elapsedSec = Math.max(3, Math.round((Date.now() - (startTime || Date.now())) / 1000));
        const pWpm = Math.round(((nextTyped.length / 5) / (elapsedSec / 60)) * 10) / 10;
        const pAcc = Math.round(((totalKeys + 1 - errorKeys) / Math.max(1, totalKeys + 1)) * 100);
        onRecordMatch(true, pWpm, pAcc, elapsedSec);
      }
    }
  };

  const playerMetrics = computeLiveMetrics({
    typed,
    target: promptText,
    elapsedMs: startTime ? Math.max(500, Date.now() - startTime) : 500,
    totalKeystrokes: totalKeys,
    errorKeystrokes: errorKeys,
    correctedErrors: 0,
    wpmHistory: [],
    firstKeyLatencyMs: 180,
    combo: 0,
    maxCombo: 0,
  });

  const botProgressPct =
    promptText.length > 0 ? Math.min(100, Math.round((botTyped.length / promptText.length) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Simulated Bot Battles
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Compete against 5 simulated bot difficulty tiers with realistic keystroke cadence, occasional typos, and backspace corrections.
          </p>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Simulated Bot Opponents · Zero Paid AI APIs · Local & Offline Ready
        </div>
      </div>

      {/* Bot Roster Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {BOT_OPPONENTS.map((bot) => {
          const isSelected = selectedBot.id === bot.id;
          return (
            <div
              key={bot.id}
              onClick={() => phase === 'select' && setSelectedBot(bot)}
              className={`rounded-xl border p-4 cursor-pointer flex flex-col justify-between transition-colors ${
                isSelected
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] hover:border-slate-400 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="uppercase font-semibold">{bot.difficulty}</span>
                  <span className="font-mono">
                    {bot.difficulty === 'adaptive'
                      ? `~${targetAdaptiveWpm} WPM`
                      : `${bot.wpmRange[0]}–${bot.wpmRange[1]} WPM`}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{bot.name}</h3>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {bot.personality}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startBotMatch(bot);
                }}
                className="mt-4 w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors"
              >
                Challenge Bot
              </button>
            </div>
          );
        })}
      </div>

      {/* Active Race Arena */}
      {phase !== 'select' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-6 space-y-6">
          {phase === 'countdown' && (
            <div className="text-center py-6">
              <div className="text-xs uppercase tracking-widest text-cyan-400">
                Synchronizing Match vs {selectedBot.name}
              </div>
              <div className="text-5xl font-bold font-mono text-slate-900 dark:text-white mt-2">
                {countdown}
              </div>
            </div>
          )}

          {/* Dual Progress Track */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-cyan-500">
                  YOU ({profile.username}) · {profile.rankName}
                </span>
                <span className="font-mono tabular-nums">
                  {Math.round(playerMetrics.netWpm)} WPM · {playerMetrics.accuracy}% Acc ·{' '}
                  {Math.round(playerMetrics.progressPct)}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-100"
                  style={{ width: `${playerMetrics.progressPct}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-violet-400">
                  {selectedBot.name} [SIMULATED BOT]{' '}
                  {botMistakeActive && (
                    <span className="text-rose-400 font-mono ml-2">· Fixing typo...</span>
                  )}
                </span>
                <span className="font-mono tabular-nums">
                  {botWpmLive} WPM · {botAccLive}% Acc · {botProgressPct}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-violet-500 transition-all duration-100"
                  style={{ width: `${botProgressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Typing Prompt */}
          <div
            onClick={() => inputRef.current?.focus()}
            className="rounded-xl border-2 border-cyan-500/40 bg-slate-50 dark:bg-[#070B14] p-5 cursor-text relative"
          >
            <div className="font-mono text-lg leading-relaxed select-none break-words">
              {promptText.split('').map((ch, idx) => {
                let cls = 'text-slate-400 dark:text-slate-500';
                if (idx < typed.length) {
                  cls =
                    typed[idx] === ch
                      ? 'text-cyan-500 dark:text-cyan-300'
                      : 'bg-rose-500/30 text-rose-400 underline';
                } else if (idx === typed.length) {
                  cls = 'bg-cyan-500/25 text-slate-900 dark:text-white border-b-2 border-cyan-400';
                }
                return (
                  <span key={idx} className={cls}>
                    {ch}
                  </span>
                );
              })}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={() => {}}
              onKeyDown={handlePlayerKeyDown}
              aria-label="Bot battle typing input"
              className="opacity-0 absolute inset-0 w-full h-full cursor-text"
              autoFocus
            />
          </div>

          {phase === 'finished' && (
            <div className="rounded-xl border border-cyan-500/40 bg-slate-50 dark:bg-slate-900 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-cyan-400">
                  {winner === 'player' ? 'VICTORY ACHIEVED' : 'BOT CROSSED FINISH FIRST'}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {winner === 'player'
                    ? `You defeated ${selectedBot.name}! (+140 XP)`
                    : `${selectedBot.name} won this round (+60 XP)`}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => startBotMatch(selectedBot)}
                  className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold"
                >
                  Rematch Bot
                </button>
                <button
                  onClick={() => setPhase('select')}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                >
                  Change Opponent
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. FRIEND MULTIPLAYER VIEW (Genuine Real-Time WebSocket Room System)
// ============================================================================
interface FriendMultiplayerViewProps {
  profile: UserProfile;
  settings: UserSettings;
  initialRoomCode?: string | null;
  onRecordMatch: (won: boolean, wpm: number, accuracy: number, durationSec: number) => void;
}

interface RoomPlayerState {
  id: string;
  username: string;
  avatar: string;
  rank: string;
  ready: boolean;
  isHost: boolean;
  connected: boolean;
  progress: number;
  wpm: number;
  accuracy: number;
  finished: boolean;
  finishTimeMs?: number;
  score: number;
}

interface RoomState {
  code: string;
  hostId: string;
  gameMode: string;
  difficulty: string;
  duration: number;
  rounds: number;
  maxPlayers: number;
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  promptText: string;
  players: RoomPlayerState[];
}

export const FriendMultiplayerView: React.FC<FriendMultiplayerViewProps> = ({
  profile,
  settings,
  initialRoomCode,
  onRecordMatch,
}) => {
  const [wsConnected, setWsConnected] = useState(false);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState(initialRoomCode || '');
  const [customCreateCode, setCustomCreateCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [publicRooms, setPublicRooms] = useState<
    { code: string; difficulty: string; playerCount: number; maxPlayers: number }[]
  >([]);

  // Local typing state inside multiplayer match
  const [typed, setTyped] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalKeys, setTotalKeys] = useState(0);
  const [errorKeys, setErrorKeys] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchLobbyRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (data.rooms) setPublicRooms(data.rooms);
    } catch {}
  };

  useEffect(() => {
    fetchLobbyRooms();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      if (initialRoomCode) {
        ws.send(
          JSON.stringify({
            type: 'room:join',
            code: initialRoomCode,
            playerId: profile.id,
            username: profile.username,
            avatar: profile.avatar,
            rank: profile.rankName,
          })
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'room:error') {
          setErrorMsg(msg.message);
        } else if (msg.type === 'room:state') {
          setErrorMsg(null);
          const nextRoom: RoomState = msg.room;
          setRoom((prev) => {
            if (prev?.status !== 'playing' && nextRoom.status === 'playing') {
              setTyped('');
              setTotalKeys(0);
              setErrorKeys(0);
              setStartTime(Date.now());
              setTimeout(() => inputRef.current?.focus(), 50);
            }
            return nextRoom;
          });
        }
      } catch {}
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleCreateRoom = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setErrorMsg('Connecting to real-time WebSocket server...');
      return;
    }
    wsRef.current.send(
      JSON.stringify({
        type: 'room:create',
        playerId: profile.id,
        username: profile.username,
        avatar: profile.avatar,
        rank: profile.rankName,
        customCode: customCreateCode.trim(),
        settings: {
          gameMode: 'type-racer',
          difficulty: 'medium',
          duration: 60,
          rounds: 1,
          maxPlayers: 4,
        },
      })
    );
  };

  const handleJoinRoom = (codeToJoin = joinCodeInput) => {
    if (!codeToJoin.trim()) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: 'room:join',
        code: codeToJoin.trim().toUpperCase(),
        playerId: profile.id,
        username: profile.username,
        avatar: profile.avatar,
        rank: profile.rankName,
      })
    );
  };

  const handleToggleReady = () => {
    if (!room || !wsRef.current) return;
    const me = room.players.find((p) => p.id === profile.id);
    if (!me) return;
    wsRef.current.send(
      JSON.stringify({
        type: 'room:ready',
        ready: !me.ready,
      })
    );
  };

  const handleUpdateRoomSettings = (patch: Partial<RoomState>) => {
    if (!room || !wsRef.current) return;
    wsRef.current.send(
      JSON.stringify({
        type: 'room:settings',
        ...patch,
      })
    );
  };

  const handleStartMatch = () => {
    if (!room || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: 'room:start' }));
  };

  const handleLeaveRoom = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'room:leave' }));
    }
    setRoom(null);
    fetchLobbyRooms();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!room || room.status !== 'playing') return;
    const target = room.promptText;

    if (e.key === 'Backspace') {
      if (typed.length > 0) setTyped((prev) => prev.slice(0, -1));
      e.preventDefault();
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const expected = target[typed.length];
      const isCorrect = e.key === expected;
      const nextTotal = totalKeys + 1;
      const nextErr = isCorrect ? errorKeys : errorKeys + 1;
      setTotalKeys(nextTotal);
      setErrorKeys(nextErr);
      soundEngine.playKeystroke(settings, !isCorrect);

      // Require accurate character to advance in synchronized race
      if (isCorrect) {
        const nextTyped = typed + e.key;
        setTyped(nextTyped);
        const elapsedMin = Math.max(0.02, (Date.now() - (startTime || Date.now())) / 60000);
        const liveWpm = Math.round((nextTyped.length / 5) / elapsedMin);
        const liveAcc = Math.round(((nextTotal - nextErr) / nextTotal) * 1000) / 10;
        const progress = Math.min(100, Math.round((nextTyped.length / target.length) * 1000) / 10);

        wsRef.current?.send(
          JSON.stringify({
            type: 'match:progress',
            wpm: liveWpm,
            accuracy: liveAcc,
            progress,
          })
        );

        if (nextTyped.length >= target.length) {
          soundEngine.playGameSfx(settings, 'victory');
          onRecordMatch(true, liveWpm, liveAcc, Math.round(elapsedMin * 60));
        }
      }
    }
  };

  const copyRoomShareLink = () => {
    if (!room) return;
    const url = `${window.location.origin}/?room=${room.code}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Real-Time Friend Multiplayer
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Create or join synchronized 6-character room codes across browsers and devices via server-authoritative WebSockets.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <Wifi className={`w-4 h-4 ${wsConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className={wsConnected ? 'text-emerald-400' : 'text-amber-400'}>
            {wsConnected ? 'WebSocket Server Connected' : 'Reconnecting WebSocket...'}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          {errorMsg}
        </div>
      )}

      {!room ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Room Card */}
          <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Create a Multiplayer Lobby
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Generate an instant 6-character room code or specify a custom room code (4–8 alphanumeric characters).
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Optional Custom Room Code
              </label>
              <input
                type="text"
                maxLength={8}
                value={customCreateCode}
                onChange={(e) => setCustomCreateCode(e.target.value.toUpperCase())}
                placeholder="Leave blank for random 6-char code"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2 text-xs font-mono uppercase text-slate-900 dark:text-white"
              />
            </div>
            <button
              onClick={handleCreateRoom}
              className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
            >
              Create Room & Open Lobby
            </button>
          </div>

          {/* Join Room Card */}
          <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Join Friend by Room Code
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Enter your friend’s 6-character room code below or select an open lobby. Open a second browser tab to test live multi-session sync!
            </p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                maxLength={8}
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="ENTER CODE (e.g. TV8492)"
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2 text-sm font-mono uppercase text-slate-900 dark:text-white"
              />
              <button
                onClick={() => handleJoinRoom(joinCodeInput)}
                className="px-5 py-2.5 rounded-lg bg-violet-500 hover:bg-violet-400 text-white font-bold text-xs transition-colors whitespace-nowrap shrink-0"
              >
                Join Room
              </button>
            </div>

            {publicRooms.length > 0 && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-500 mb-2">
                  Active Open Rooms on Server:
                </div>
                <div className="space-y-2">
                  {publicRooms.map((r) => (
                    <div
                      key={r.code}
                      className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs"
                    >
                      <span className="font-mono font-bold text-cyan-400">
                        Room #{r.code} · {r.difficulty.toUpperCase()} ({r.playerCount}/{r.maxPlayers})
                      </span>
                      <button
                        onClick={() => handleJoinRoom(r.code)}
                        className="text-cyan-400 font-semibold hover:underline"
                      >
                        Join →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ACTIVE MULTIPLAYER ROOM LOBBY & RACE VIEW */
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs text-slate-500">Multiplayer Room Code</div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-2xl font-bold font-mono tracking-wider text-cyan-400">
                  {room.code}
                </span>
                <button
                  onClick={copyRoomShareLink}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink ? 'Share Link Copied' : 'Copy Invite Link'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {room.hostId === profile.id && room.status === 'waiting' && (
                <select
                  value={room.difficulty}
                  onChange={(e) => handleUpdateRoomSettings({ difficulty: e.target.value })}
                  aria-label="Room difficulty"
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs"
                >
                  <option value="easy">Easy Prompt</option>
                  <option value="medium">Medium Prompt</option>
                  <option value="hard">Hard Prompt</option>
                  <option value="expert">Expert Prompt</option>
                </select>
              )}
              <button
                onClick={handleLeaveRoom}
                className="px-3.5 py-1.5 rounded-lg border border-rose-500/40 text-rose-400 text-xs font-semibold hover:bg-rose-500/10"
              >
                Leave Room
              </button>
            </div>
          </div>

          {/* Players & Live Progress Bars */}
          <div className="space-y-3">
            {room.players.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {p.username} {p.id === profile.id ? '(You)' : ''}
                    </span>
                    <span className="text-slate-400" aria-hidden="true">·</span>
                    <span className="text-cyan-400">{p.rank}</span>
                    {p.isHost && <span className="text-amber-400 font-semibold">· Host</span>}
                    {!p.connected && <span className="text-rose-400">· Disconnected</span>}
                  </div>
                  <div className="font-mono tabular-nums">
                    {room.status === 'waiting' ? (
                      <span className={p.ready ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                        {p.ready ? 'READY' : 'NOT READY'}
                      </span>
                    ) : (
                      <span>
                        {p.wpm} WPM · {p.accuracy}% Acc · {p.progress}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 transition-all duration-150"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Lobby Controls / Countdown / Active Prompt */}
          {room.status === 'waiting' && (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="text-xs text-slate-500">
                Share code <strong className="text-cyan-400 font-mono">{room.code}</strong> with a friend or open a second tab to race live.
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleReady}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                >
                  Toggle Ready Status
                </button>
                {room.hostId === profile.id && (
                  <button
                    onClick={handleStartMatch}
                    className="px-6 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold"
                  >
                    Start Synchronized Match
                  </button>
                )}
              </div>
            </div>
          )}

          {room.status === 'countdown' && (
            <div className="text-center py-6">
              <div className="text-xs uppercase tracking-widest text-cyan-400">
                Synchronized Match Starting...
              </div>
              <div className="text-4xl font-bold font-mono text-white mt-2">GET SET!</div>
            </div>
          )}

          {(room.status === 'playing' || room.status === 'finished') && (
            <div
              onClick={() => inputRef.current?.focus()}
              className="rounded-xl border-2 border-cyan-500/40 bg-slate-50 dark:bg-[#070B14] p-5 cursor-text relative"
            >
              <div className="font-mono text-lg leading-relaxed select-none break-words">
                {room.promptText.split('').map((ch, idx) => {
                  let cls = 'text-slate-400 dark:text-slate-500';
                  if (idx < typed.length) {
                    cls = 'text-cyan-400';
                  } else if (idx === typed.length) {
                    cls = 'bg-cyan-500/25 text-white border-b-2 border-cyan-400';
                  }
                  return (
                    <span key={idx} className={cls}>
                      {ch}
                    </span>
                  );
                })}
              </div>
              <input
                ref={inputRef}
                type="text"
                value={typed}
                onChange={() => {}}
                onKeyDown={handleKeyDown}
                aria-label="Multiplayer match typing input"
                className="opacity-0 absolute inset-0 w-full h-full cursor-text"
                autoFocus
              />
            </div>
          )}

          {room.status === 'finished' && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
              <div className="text-sm font-bold text-emerald-300">
                Winner:{' '}
                {
                  [...room.players].sort((a, b) => b.wpm - a.wpm)[0]?.username
                }{' '}
                ({[...room.players].sort((a, b) => b.wpm - a.wpm)[0]?.wpm} WPM)
              </div>
              <button
                onClick={() => wsRef.current?.send(JSON.stringify({ type: 'room:rematch' }))}
                className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold"
              >
                Rematch Lobby
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. CHALLENGE ARENA VIEW ("Challenge Anyone" Shareable Challenge System)
// ============================================================================
interface ChallengeArenaViewProps {
  profile: UserProfile;
  settings: UserSettings;
  challenges: CustomChallenge[];
  onSaveChallenge: (ch: CustomChallenge) => void;
}

export const ChallengeArenaView: React.FC<ChallengeArenaViewProps> = ({
  profile,
  settings,
  challenges,
  onSaveChallenge,
}) => {
  const [mode, setMode] = useState<CustomChallenge['mode']>('same-text');
  const [difficulty, setDifficulty] = useState<DifficultyTier>('medium');
  const [durationSec, setDurationSec] = useState<number>(30);
  const [customPrompt, setCustomPrompt] = useState<string>(
    'Every competitive match rewards composure under pressure; recovering smoothly from a single typo preserves both rhythm and combo multiplier.'
  );
  const [activeChallenge, setActiveChallenge] = useState<CustomChallenge | null>(null);
  const [typed, setTyped] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalKeys, setTotalKeys] = useState(0);
  const [errorKeys, setErrorKeys] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreateChallenge = () => {
    const id = 'CH-' + Math.floor(1000 + Math.random() * 9000);
    const newCh: CustomChallenge = {
      id,
      creatorName: profile.username,
      mode,
      difficulty,
      durationSec,
      promptText: customPrompt.trim() || generatePromptText(difficulty, durationSec),
      targetWpm: Math.max(35, profile.bestWpm || 45),
      targetAccuracy: 96,
      targetScore: Math.max(350, (profile.bestWpm || 45) * 10),
      createdAt: new Date().toISOString(),
      attempts: [],
    };
    onSaveChallenge(newCh);
    startChallengeAttempt(newCh);
  };

  const startChallengeAttempt = (ch: CustomChallenge) => {
    setActiveChallenge(ch);
    setTyped('');
    setStartTime(null);
    setTotalKeys(0);
    setErrorKeys(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!activeChallenge) return;
    const target = activeChallenge.promptText;
    if (e.key === 'Backspace') {
      if (typed.length > 0) setTyped((prev) => prev.slice(0, -1));
      e.preventDefault();
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const now = Date.now();
      const effStart = startTime ?? now;
      if (!startTime) setStartTime(now);

      const isCorrect = e.key === target[typed.length];
      const nextTotal = totalKeys + 1;
      const nextErr = isCorrect ? errorKeys : errorKeys + 1;
      setTotalKeys(nextTotal);
      setErrorKeys(nextErr);
      soundEngine.playKeystroke(settings, !isCorrect);

      const nextTyped = typed + e.key;
      setTyped(nextTyped);

      if (nextTyped.length >= target.length) {
        const elapsedMin = Math.max(0.03, (now - effStart) / 60000);
        const wpm = Math.round((nextTyped.length / 5) / elapsedMin);
        const acc = Math.round(((nextTotal - nextErr) / nextTotal) * 1000) / 10;
        const score = Math.round(wpm * (acc / 100) * 10);
        soundEngine.playGameSfx(settings, 'victory');

        const updated: CustomChallenge = {
          ...activeChallenge,
          attempts: [
            {
              id: 'att_' + Date.now(),
              playerName: profile.username,
              wpm,
              accuracy: acc,
              score,
              completedAt: new Date().toISOString(),
            },
            ...activeChallenge.attempts,
          ],
        };
        onSaveChallenge(updated);
        setActiveChallenge(updated);
      }
    }
  };

  const copyShareChallenge = (ch: CustomChallenge) => {
    const shareUrl = `${window.location.origin}/?challenge=${ch.id}`;
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopiedId(ch.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Challenge Anyone
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Create shareable typing challenges across 5 competitive modes, invite friends via unique links, and compare verified results.
        </p>
      </div>

      {activeChallenge ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-cyan-400 font-mono">
                Challenge #{activeChallenge.id} · Mode: {activeChallenge.mode.toUpperCase()}
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Created by {activeChallenge.creatorName} (Target: {activeChallenge.targetWpm} WPM)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyShareChallenge(activeChallenge)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                {copiedId === activeChallenge.id ? 'Challenge Link Copied!' : 'Copy Share Link'}
              </button>
              <button
                onClick={() => setActiveChallenge(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-semibold"
              >
                Back to Challenges
              </button>
            </div>
          </div>

          <div
            onClick={() => inputRef.current?.focus()}
            className="rounded-xl border-2 border-cyan-500/40 bg-slate-50 dark:bg-[#070B14] p-5 cursor-text relative"
          >
            <div className="font-mono text-lg leading-relaxed select-none break-words">
              {activeChallenge.promptText.split('').map((ch, idx) => {
                let cls = 'text-slate-400 dark:text-slate-500';
                if (idx < typed.length) {
                  cls =
                    typed[idx] === ch
                      ? 'text-cyan-400'
                      : 'bg-rose-500/30 text-rose-400 underline';
                } else if (idx === typed.length) {
                  cls = 'bg-cyan-500/25 text-white border-b-2 border-cyan-400';
                }
                return (
                  <span key={idx} className={cls}>
                    {ch}
                  </span>
                );
              })}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={() => {}}
              onKeyDown={handleKeyDown}
              aria-label="Challenge typing input"
              className="opacity-0 absolute inset-0 w-full h-full cursor-text"
              autoFocus
            />
          </div>

          {/* Challenge Leaderboard Comparison */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Challenge Standings & Winner Comparison
            </h3>
            <div className="space-y-2">
              {[...activeChallenge.attempts]
                .sort((a, b) => b.score - a.score)
                .map((att, idx) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-cyan-400">#{idx + 1}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {att.playerName}
                      </span>
                      {idx === 0 && (
                        <span className="text-amber-400 font-semibold">· Challenge Leader</span>
                      )}
                    </div>
                    <div className="font-mono tabular-nums">
                      {att.wpm} WPM · {att.accuracy}% Acc · {att.score} pts
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Challenge Form */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Create New Shareable Challenge
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Challenge Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as CustomChallenge['mode'])}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs"
                >
                  <option value="same-text">Same Text Challenge</option>
                  <option value="same-duration">Same Duration</option>
                  <option value="speed">Speed Challenge</option>
                  <option value="accuracy">Accuracy Challenge</option>
                  <option value="game-score">Game Score Challenge</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as DifficultyTier)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Challenge Prompt Text</label>
              <textarea
                rows={3}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 text-xs font-mono"
              />
            </div>
            <button
              onClick={handleCreateChallenge}
              className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
            >
              Generate Challenge & Set Benchmark
            </button>
          </div>

          {/* Active Challenges List */}
          <div className="lg:col-span-7 space-y-4">
            {challenges.map((ch) => (
              <div
                key={ch.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-mono text-cyan-400">
                      {ch.id} · {ch.mode.toUpperCase()} · {ch.difficulty.toUpperCase()}
                    </span>
                    <span>{ch.attempts.length} Attempts</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {ch.creatorName}’s Challenge (Target: {ch.targetWpm} WPM / {ch.targetAccuracy}%)
                  </h3>
                  <p className="mt-1.5 text-xs font-mono text-slate-500 line-clamp-2">
                    “{ch.promptText}”
                  </p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => copyShareChallenge(ch)}
                    className="text-xs font-semibold text-slate-500 hover:text-cyan-400 flex items-center gap-1.5"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    {copiedId === ch.id ? 'Link Copied!' : 'Share Challenge Link'}
                  </button>
                  <button
                    onClick={() => startChallengeAttempt(ch)}
                    className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold"
                  >
                    Accept Challenge
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4. TOURNAMENTS VIEW (Private & Public Brackets with Match Execution)
// ============================================================================
interface TournamentsViewProps {
  profile: UserProfile;
  settings: UserSettings;
  tournaments: Tournament[];
  onSaveTournaments: (list: Tournament[]) => void;
  onWinTournament: () => void;
}

export const TournamentsView: React.FC<TournamentsViewProps> = ({
  profile,
  settings,
  tournaments,
  onSaveTournaments,
  onWinTournament,
}) => {
  const [selectedTrnId, setSelectedTrnId] = useState<string>(tournaments[0]?.id || '');
  const [newName, setNewName] = useState('');
  const [newFormat, setNewFormat] = useState<Tournament['format']>('single-elimination');
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [matchPrompt, setMatchPrompt] = useState('');
  const [typed, setTyped] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const selectedTournament = tournaments.find((t) => t.id === selectedTrnId) || tournaments[0];

  const handleCreatePrivateTournament = () => {
    if (!newName.trim()) return;
    const code = 'TRN' + Math.floor(100 + Math.random() * 900);
    const created: Tournament = {
      id: code,
      name: newName.trim(),
      description: `Private ${newFormat} championship hosted by ${profile.username}.`,
      format: newFormat,
      gameMode: 'typing-test',
      difficulty: 'medium',
      maxParticipants: 4,
      startTime: new Date().toISOString(),
      registrationDeadline: new Date(Date.now() + 86400_000).toISOString(),
      isPrivate: true,
      inviteCode: code,
      status: 'active',
      participants: [profile.username, 'Valkyrie Pulse', 'Hyperion Striker', 'Circuit Scout V1'],
      matches: [
        {
          id: 'm1_' + Date.now(),
          round: 1,
          matchOrder: 1,
          player1: profile.username,
          player2: 'Valkyrie Pulse',
          status: 'ready',
        },
        {
          id: 'm2_' + Date.now(),
          round: 1,
          matchOrder: 2,
          player1: 'Hyperion Striker',
          player2: 'Circuit Scout V1',
          player1Wpm: 58,
          player2Wpm: 24,
          player1Acc: 96.5,
          player2Acc: 92.0,
          winner: 'Hyperion Striker',
          status: 'completed',
        },
        {
          id: 'm3_' + Date.now(),
          round: 2,
          matchOrder: 1,
          player1: 'TBD',
          player2: 'Hyperion Striker',
          status: 'pending',
        },
      ],
    };
    const nextList = [created, ...tournaments];
    onSaveTournaments(nextList);
    setSelectedTrnId(created.id);
    setNewName('');
  };

  const launchBracketMatch = (matchId: string) => {
    setActiveMatchId(matchId);
    setMatchPrompt(generatePromptText('medium', 20));
    setTyped('');
    setStartTime(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleMatchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!activeMatchId || !selectedTournament) return;
    if (e.key === 'Backspace') {
      if (typed.length > 0) setTyped((prev) => prev.slice(0, -1));
      e.preventDefault();
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const now = Date.now();
      const effStart = startTime ?? now;
      if (!startTime) setStartTime(now);

      const isCorrect = e.key === matchPrompt[typed.length];
      soundEngine.playKeystroke(settings, !isCorrect);
      if (isCorrect) {
        const nextTyped = typed + e.key;
        setTyped(nextTyped);
        if (nextTyped.length >= matchPrompt.length) {
          const elapsedMin = Math.max(0.03, (now - effStart) / 60000);
          const myWpm = Math.round((nextTyped.length / 5) / elapsedMin);
          const oppWpm = 42;
          const userWon = myWpm >= oppWpm;
          soundEngine.playGameSfx(settings, 'victory');

          const updatedMatches = selectedTournament.matches.map((m) => {
            if (m.id === activeMatchId) {
              return {
                ...m,
                player1Wpm: myWpm,
                player2Wpm: oppWpm,
                player1Acc: 97.5,
                player2Acc: 95.0,
                winner: userWon ? m.player1 : m.player2,
                status: 'completed' as const,
              };
            }
            return m;
          });

          // Advance to Final Round if Round 1 won
          const currentMatch = selectedTournament.matches.find((m) => m.id === activeMatchId);
          if (currentMatch?.round === 1 && userWon) {
            const finalIdx = updatedMatches.findIndex((m) => m.round === 2);
            if (finalIdx >= 0) {
              updatedMatches[finalIdx] = {
                ...updatedMatches[finalIdx],
                player1: currentMatch.player1,
                status: 'ready',
              };
            }
          }

          let trnWinner = selectedTournament.winner;
          let trnStatus = selectedTournament.status;
          if (currentMatch?.round === 2 && userWon) {
            trnWinner = currentMatch.player1;
            trnStatus = 'completed';
            onWinTournament();
          }

          const updatedTrn: Tournament = {
            ...selectedTournament,
            status: trnStatus,
            winner: trnWinner,
            matches: updatedMatches,
          };

          onSaveTournaments(
            tournaments.map((t) => (t.id === updatedTrn.id ? updatedTrn : t))
          );
          setActiveMatchId(null);
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Esports Tournaments & Brackets
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Create private tournaments, invite friends with bracket codes, and compete across Knockout, Single Elimination, Round Robin, and Best-of-Three formats.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create Private Tournament Panel */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Create Private Tournament
          </h2>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tournament Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Friday Night Velocity Cup"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Bracket Format</label>
            <select
              value={newFormat}
              onChange={(e) => setNewFormat(e.target.value as Tournament['format'])}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs"
            >
              <option value="single-elimination">Single Elimination</option>
              <option value="knockout">Knockout Sprint</option>
              <option value="round-robin">Round Robin</option>
              <option value="best-of-three">Best of Three</option>
            </select>
          </div>
          <button
            onClick={handleCreatePrivateTournament}
            className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
          >
            Create Tournament Bracket
          </button>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-500">Available Tournaments:</div>
            {tournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTrnId(t.id)}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-colors ${
                  selectedTournament?.id === t.id
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="font-bold text-slate-900 dark:text-white">{t.name}</div>
                <div className="text-slate-500 mt-0.5">
                  Code: {t.inviteCode} · {t.format} · {t.status.toUpperCase()}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Active Bracket View */}
        <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-6 space-y-5">
          {selectedTournament && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-cyan-400 font-mono">
                    Invite Code: {selectedTournament.inviteCode} · Format: {selectedTournament.format}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedTournament.name}
                  </h2>
                </div>
                {selectedTournament.winner && (
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Trophy className="w-5 h-5" />
                    Champion: {selectedTournament.winner}
                  </div>
                )}
              </div>

              {activeMatchId ? (
                <div className="space-y-4">
                  <div className="text-xs font-semibold text-cyan-400">
                    LIVE TOURNAMENT MATCH — Type the prompt accurately to advance in the bracket!
                  </div>
                  <div
                    onClick={() => inputRef.current?.focus()}
                    className="rounded-xl border-2 border-cyan-500/40 bg-slate-50 dark:bg-[#070B14] p-5 cursor-text relative"
                  >
                    <div className="font-mono text-lg leading-relaxed select-none break-words">
                      {matchPrompt.split('').map((ch, idx) => (
                        <span
                          key={idx}
                          className={
                            idx < typed.length
                              ? 'text-cyan-400'
                              : idx === typed.length
                              ? 'bg-cyan-500/25 text-white border-b-2 border-cyan-400'
                              : 'text-slate-500'
                          }
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      value={typed}
                      onChange={() => {}}
                      onKeyDown={handleMatchKeyDown}
                      aria-label="Tournament match typing input"
                      className="opacity-0 absolute inset-0 w-full h-full cursor-text"
                      autoFocus
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Semifinals (Round 1)
                    </h3>
                    <div className="space-y-3">
                      {selectedTournament.matches
                        .filter((m) => m.round === 1)
                        .map((m) => (
                          <div
                            key={m.id}
                            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 space-y-2 text-xs"
                          >
                            <div className="flex justify-between">
                              <span className="font-semibold">{m.player1}</span>
                              <span className="font-mono text-cyan-400">
                                {m.player1Wpm ? `${m.player1Wpm} WPM` : '—'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-semibold">{m.player2}</span>
                              <span className="font-mono text-violet-400">
                                {m.player2Wpm ? `${m.player2Wpm} WPM` : '—'}
                              </span>
                            </div>
                            {m.status === 'ready' && (
                              <button
                                onClick={() => launchBracketMatch(m.id)}
                                className="mt-2 w-full py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold"
                              >
                                Play Bracket Match
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Grand Finals (Round 2)
                    </h3>
                    <div className="space-y-3">
                      {selectedTournament.matches
                        .filter((m) => m.round === 2)
                        .map((m) => (
                          <div
                            key={m.id}
                            className="rounded-xl border border-amber-500/40 bg-slate-50 dark:bg-slate-900 p-4 space-y-2 text-xs"
                          >
                            <div className="flex justify-between">
                              <span className="font-semibold">{m.player1}</span>
                              <span className="font-mono text-cyan-400">
                                {m.player1Wpm ? `${m.player1Wpm} WPM` : '—'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-semibold">{m.player2}</span>
                              <span className="font-mono text-violet-400">
                                {m.player2Wpm ? `${m.player2Wpm} WPM` : '—'}
                              </span>
                            </div>
                            {m.status === 'ready' && (
                              <button
                                onClick={() => launchBracketMatch(m.id)}
                                className="mt-2 w-full py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold"
                              >
                                Play Championship Final
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
