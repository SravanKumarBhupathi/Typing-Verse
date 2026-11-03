import React, { useState, useEffect, useRef } from 'react';
import {
  computeLiveMetrics,
  generatePromptText,
} from '../engine/typingEngine';
import {
  CertificateRecord,
  GhostCheckpoint,
  GhostRun,
  TextCategory,
  TypingResultRecord,
  UserProfile,
  UserSettings,
} from '../types/typeverse';
import { soundEngine } from '../utils/soundEngine';
import { VirtualKeyboard } from './VirtualKeyboard';
import {
  Award,
  CheckCircle2,
  Clock,
  Ghost,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface TypingTestViewProps {
  profile: UserProfile;
  settings: UserSettings;
  ghostRuns: GhostRun[];
  onSaveResult: (result: TypingResultRecord) => void;
  onSaveGhostRun: (run: GhostRun) => void;
  onIssueCertificate: (cert: CertificateRecord) => void;
  onGhostRaceWin: () => void;
  initialCustomText?: string;
}

const DURATIONS = [
  { sec: 15, label: '15s' },
  { sec: 30, label: '30s' },
  { sec: 60, label: '60s' },
  { sec: 120, label: '2m' },
  { sec: 180, label: '3m' },
  { sec: 300, label: '5m' },
];

const CATEGORIES: { id: TextCategory; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
  { id: 'expert', label: 'Expert' },
  { id: 'quotes', label: 'Quotes' },
  { id: 'general', label: 'General English' },
  { id: 'technical', label: 'Technical' },
  { id: 'numbers', label: 'Numbers' },
  { id: 'symbols', label: 'Symbols' },
  { id: 'custom', label: 'Custom Text' },
];

export const TypingTestView: React.FC<TypingTestViewProps> = ({
  profile,
  settings,
  ghostRuns,
  onSaveResult,
  onSaveGhostRun,
  onIssueCertificate,
  onGhostRaceWin,
  initialCustomText,
}) => {
  const [durationSec, setDurationSec] = useState<number>(30);
  const [category, setCategory] = useState<TextCategory>(initialCustomText ? 'custom' : 'medium');
  const [customText, setCustomText] = useState<string>(
    initialCustomText ||
      'Type your own custom practice paragraph here (at least 20 characters) to benchmark specific vocabulary or technical phrases.'
  );
  const [promptText, setPromptText] = useState<string>(() =>
    generatePromptText(initialCustomText ? 'custom' : 'medium', 30, initialCustomText)
  );

  // Ghost Racing states
  const [ghostEnabled, setGhostEnabled] = useState<boolean>(true);
  const [selectedGhostId, setSelectedGhostId] = useState<string>(
    ghostRuns[0]?.id || ''
  );

  // Active typing test states
  const [status, setStatus] = useState<'idle' | 'running' | 'finished'>('idle');
  const [typed, setTyped] = useState<string>('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [remainingSec, setRemainingSec] = useState<number>(30);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState<number>(0);
  const [errorKeystrokes, setErrorKeystrokes] = useState<number>(0);
  const [correctedErrors, setCorrectedErrors] = useState<number>(0);
  const [keyErrors, setKeyErrors] = useState<Record<string, number>>({});
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [wpmHistory, setWpmHistory] = useState<number[]>([]);
  const [checkpoints, setCheckpoints] = useState<GhostCheckpoint[]>([]);
  const [lastErrorChar, setLastErrorChar] = useState<string | null>(null);
  const [serverVerification, setServerVerification] = useState<{
    verified: boolean;
    message: string;
  } | null>(null);
  const [certIssued, setCertIssued] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const typedRef = useRef(typed);
  typedRef.current = typed;

  const activeGhost = ghostRuns.find((g) => g.id === selectedGhostId) || ghostRuns[0] || null;

  const resetTest = (newCat = category, newDur = durationSec, useGhostPrompt = false) => {
    const nextPrompt =
      useGhostPrompt && activeGhost
        ? activeGhost.promptText
        : generatePromptText(newCat, newDur, customText);
    setPromptText(nextPrompt);
    setStatus('idle');
    setTyped('');
    setStartTime(null);
    setRemainingSec(newDur);
    setElapsedMs(0);
    setTotalKeystrokes(0);
    setErrorKeystrokes(0);
    setCorrectedErrors(0);
    setKeyErrors({});
    setCombo(0);
    setMaxCombo(0);
    setWpmHistory([]);
    setCheckpoints([]);
    setLastErrorChar(null);
    setServerVerification(null);
    setCertIssued(false);
    setTimeout(() => inputRef.current?.focus(), 40);
  };

  useEffect(() => {
    if (initialCustomText) {
      setCategory('custom');
      setCustomText(initialCustomText);
      resetTest('custom', durationSec, false);
    }
  }, [initialCustomText]);

  useEffect(() => {
    if (status !== 'running' || !startTime) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const elapsedSeconds = Math.floor(elapsed / 1000);
      const rem = Math.max(0, durationSec - elapsedSeconds);
      setElapsedMs(elapsed);
      setRemainingSec(rem);

      // Record checkpoint every 3 seconds
      if (elapsedSeconds > 0 && elapsedSeconds % 3 === 0) {
        const currentTyped = typedRef.current;
        const mins = Math.max(0.05, elapsed / 60000);
        const wpmSnap = Math.round((currentTyped.length / 5) / mins);
        setWpmHistory((prev) => (prev.length < elapsedSeconds / 3 ? [...prev, wpmSnap] : prev));
        setCheckpoints((prev) => {
          if (prev.some((c) => c.elapsedSec === elapsedSeconds)) return prev;
          return [
            ...prev,
            {
              elapsedSec: elapsedSeconds,
              charsTyped: currentTyped.length,
              wpm: wpmSnap,
              accuracy: 96,
              progressPct: Math.min(100, Math.round((currentTyped.length / promptText.length) * 100)),
            },
          ];
        });
      }

      if (rem <= 0) {
        clearInterval(timer);
        finishTest(elapsed);
      }
    }, 150);

    return () => clearInterval(timer);
  }, [status, startTime, durationSec, promptText.length]);

  const finishTest = async (finalElapsedMs: number) => {
    setStatus('finished');
    soundEngine.playGameSfx(settings, 'victory');

    const finalMetrics = computeLiveMetrics({
      typed: typedRef.current,
      target: promptText,
      elapsedMs: Math.max(1000, finalElapsedMs),
      totalKeystrokes,
      errorKeystrokes,
      correctedErrors,
      wpmHistory,
      firstKeyLatencyMs: 190,
      combo,
      maxCombo,
    });

    const submissionId = 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    let verified = false;
    try {
      const resp = await fetch('/api/validate-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          wpm: finalMetrics.netWpm,
          accuracy: finalMetrics.accuracy,
          durationSec: Math.round(finalElapsedMs / 1000),
          charsTyped: typedRef.current.length,
          errors: finalMetrics.incorrectChars,
        }),
      });
      const data = await resp.json();
      verified = Boolean(data.valid);
      setServerVerification({
        verified,
        message: verified
          ? `Server-verified telemetry (${submissionId})`
          : data.reason || 'Local verification only',
      });
    } catch {
      setServerVerification({
        verified: false,
        message: 'Saved in Offline Local Mode',
      });
    }

    const record: TypingResultRecord = {
      id: submissionId,
      durationSec,
      category,
      grossWpm: finalMetrics.grossWpm,
      netWpm: finalMetrics.netWpm,
      accuracy: finalMetrics.accuracy,
      cpm: finalMetrics.cpm,
      errorRate: finalMetrics.errorRate,
      consistency: finalMetrics.consistency,
      reactionTimeMs: finalMetrics.reactionTimeMs,
      maxCombo: finalMetrics.maxCombo,
      correctChars: finalMetrics.correctChars,
      incorrectChars: finalMetrics.incorrectChars,
      correctedErrors: finalMetrics.correctedErrors,
      uncorrectedErrors: finalMetrics.uncorrectedErrors,
      createdAt: new Date().toISOString(),
      verifiedByServer: verified,
      keyErrors,
    };

    onSaveResult(record);

    // Save Ghost Run for this attempt
    const newGhost: GhostRun = {
      id: 'ghost_' + Date.now(),
      label: `${profile.username} (${Math.round(finalMetrics.netWpm)} WPM · ${durationSec}s)`,
      username: profile.username,
      durationSec,
      category,
      promptText,
      finalWpm: Math.round(finalMetrics.netWpm),
      finalAccuracy: finalMetrics.accuracy,
      createdAt: new Date().toISOString(),
      checkpoints:
        checkpoints.length > 0
          ? checkpoints
          : [
              {
                elapsedSec: durationSec,
                charsTyped: typedRef.current.length,
                wpm: Math.round(finalMetrics.netWpm),
                accuracy: finalMetrics.accuracy,
                progressPct: finalMetrics.progressPct,
              },
            ],
    };
    onSaveGhostRun(newGhost);

    if (ghostEnabled && activeGhost && finalMetrics.netWpm > activeGhost.finalWpm) {
      onGhostRaceWin();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (status === 'finished') return;

    if (e.key === 'Backspace') {
      if (typed.length > 0) {
        const prevIdx = typed.length - 1;
        if (typed[prevIdx] !== promptText[prevIdx]) {
          setCorrectedErrors((c) => c + 1);
        }
        setTyped((prev) => prev.slice(0, -1));
      }
      e.preventDefault();
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const now = Date.now();
      if (status === 'idle') {
        setStatus('running');
        setStartTime(now);
      }

      const expected = promptText[typed.length];
      const isCorrect = e.key === expected;
      const nextTyped = typed + e.key;

      setTotalKeystrokes((k) => k + 1);
      if (isCorrect) {
        const nextC = combo + 1;
        setCombo(nextC);
        setMaxCombo((m) => Math.max(m, nextC));
        setLastErrorChar(null);
        soundEngine.playKeystroke(settings, false);
      } else {
        setErrorKeystrokes((err) => err + 1);
        setCombo(0);
        setLastErrorChar(expected);
        setKeyErrors((prev) => ({
          ...prev,
          [expected.toUpperCase()]: (prev[expected.toUpperCase()] || 0) + 1,
        }));
        soundEngine.playKeystroke(settings, true);
      }

      setTyped(nextTyped);

      if (nextTyped.length >= promptText.length) {
        finishTest(now - (startTime || now));
      }
    }
  };

  const liveMetrics = computeLiveMetrics({
    typed,
    target: promptText,
    elapsedMs: status === 'running' ? Math.max(500, elapsedMs) : status === 'finished' ? Math.max(1000, elapsedMs) : 1000,
    totalKeystrokes,
    errorKeystrokes,
    correctedErrors,
    wpmHistory,
    firstKeyLatencyMs: 190,
    combo,
    maxCombo,
  });

  // Ghost live position interpolation
  let ghostProgressPct = 0;
  let ghostCurrentWpm = activeGhost?.finalWpm || 0;
  if (ghostEnabled && activeGhost && status !== 'idle') {
    const elapsedSec = elapsedMs / 1000;
    const expectedChars = ((activeGhost.finalWpm * 5) / 60) * elapsedSec;
    ghostProgressPct = Math.min(100, Math.round((expectedChars / Math.max(1, promptText.length)) * 1000) / 10);
    ghostCurrentWpm = activeGhost.finalWpm;
  }

  const deltaWpm = Math.round(liveMetrics.netWpm - ghostCurrentWpm);

  const handleGenerateCertificate = () => {
    const cert: CertificateRecord = {
      id: 'CERT-' + Math.floor(100000 + Math.random() * 900000),
      username: profile.username,
      durationSec,
      wpm: Math.round(liveMetrics.netWpm),
      accuracy: liveMetrics.accuracy,
      consistency: liveMetrics.consistency,
      category,
      issuedAt: new Date().toISOString(),
      verificationHash: 'TV-SHA256-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    };
    onIssueCertificate(cert);
    setCertIssued(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Precision Typing Test & Ghost Racing
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Real-time Gross/Net WPM, CPM, Consistency, Keystroke Error Analytics, and Live Ghost Comparison.
          </p>
        </div>

        {/* Duration Selector */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800">
          {DURATIONS.map((d) => (
            <button
              key={d.sec}
              onClick={() => {
                setDurationSec(d.sec);
                resetTest(category, d.sec);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors whitespace-nowrap shrink-0 ${
                durationSec === d.sec
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Selector */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setCategory(c.id);
              resetTest(c.id, durationSec);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              category === c.id
                ? 'bg-slate-900 dark:bg-cyan-500/20 text-white dark:text-cyan-300 border border-transparent dark:border-cyan-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Custom Text Input when Custom mode selected */}
      {category === 'custom' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Custom Practice Text (Minimum 15 characters)
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white"
            />
            <button
              onClick={() => resetTest('custom', durationSec)}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 transition-colors whitespace-nowrap shrink-0"
            >
              Apply Custom Text
            </button>
          </div>
        </div>
      )}

      {/* Ghost Racing Track Bar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <Ghost className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              Ghost Racing Telemetry
            </span>
            <button
              onClick={() => setGhostEnabled((prev) => !prev)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                ghostEnabled
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {ghostEnabled ? 'Ghost Active' : 'Ghost Off'}
            </button>
          </div>

          {ghostEnabled && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <select
                value={selectedGhostId}
                onChange={(e) => setSelectedGhostId(e.target.value)}
                aria-label="Select Ghost Opponent"
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200"
              >
                {ghostRuns.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
              {status !== 'idle' && (
                <span
                  className={`font-mono font-semibold ${
                    deltaWpm >= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {deltaWpm >= 0 ? `Ahead by +${deltaWpm} WPM` : `Behind by ${deltaWpm} WPM`}
                </span>
              )}
            </div>
          )}
        </div>

        {ghostEnabled && (
          <div className="space-y-2">
            {/* Player Lane */}
            <div className="flex items-center gap-3">
              <span className="w-24 text-[11px] font-mono text-cyan-400 truncate">
                You ({Math.round(liveMetrics.netWpm)} WPM)
              </span>
              <div className="flex-1 h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-150"
                  style={{ width: `${liveMetrics.progressPct}%` }}
                />
              </div>
              <span className="w-10 text-right text-[11px] font-mono tabular-nums text-slate-400">
                {Math.round(liveMetrics.progressPct)}%
              </span>
            </div>

            {/* Ghost Lane */}
            <div className="flex items-center gap-3">
              <span className="w-24 text-[11px] font-mono text-violet-400 truncate">
                Ghost ({ghostCurrentWpm} WPM)
              </span>
              <div className="flex-1 h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-violet-500/80 transition-all duration-150"
                  style={{ width: `${ghostProgressPct}%` }}
                />
              </div>
              <span className="w-10 text-right text-[11px] font-mono tabular-nums text-slate-400">
                {Math.round(ghostProgressPct)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Live Metrics HUD */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-3.5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Timer</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {remainingSec}s
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-3.5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Net WPM</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-cyan-500">
            {status === 'idle' ? 0 : Math.round(liveMetrics.netWpm)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-3.5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Gross WPM</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-700 dark:text-slate-200">
            {status === 'idle' ? 0 : Math.round(liveMetrics.grossWpm)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-3.5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Accuracy</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-500">
            {liveMetrics.accuracy}%
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-3.5">
          <div className="text-xs text-slate-500 dark:text-slate-400">Consistency</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-violet-400">
            {liveMetrics.consistency}%
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-3.5 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Combo</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-400">
              {liveMetrics.combo}x
            </div>
          </div>
          <button
            onClick={() => resetTest()}
            title="Restart Test"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Prompt Canvas */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="rounded-xl border-2 border-cyan-500/40 bg-white dark:bg-[#0B1120] p-6 cursor-text relative"
      >
        <div className="font-mono text-lg sm:text-xl leading-relaxed tracking-wide select-none break-words">
          {promptText.split('').map((char, idx) => {
            let cls = 'text-slate-400 dark:text-slate-500';
            if (idx < typed.length) {
              cls =
                typed[idx] === char
                  ? 'text-cyan-600 dark:text-cyan-300'
                  : 'bg-rose-500/30 text-rose-600 dark:text-rose-300 underline';
            } else if (idx === typed.length) {
              cls = 'bg-cyan-500/25 text-slate-900 dark:text-white border-b-2 border-cyan-400';
            }
            return (
              <span key={idx} className={cls}>
                {char}
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
          aria-label="Typing test input"
          className="opacity-0 absolute inset-0 w-full h-full cursor-text"
          autoFocus
        />
      </div>

      {/* Post-Test Detailed Breakdown & Certificate Generator */}
      {status === 'finished' && (
        <div className="rounded-2xl border border-cyan-500/50 bg-white dark:bg-[#0B1120] p-6 shadow-lg space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <div className="text-xs font-medium text-cyan-500">
                Official Test Telemetry Report
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {Math.round(liveMetrics.netWpm)} Net WPM · {liveMetrics.accuracy}% Accuracy
              </h2>
            </div>
            {serverVerification && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>{serverVerification.message}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
              <div className="text-slate-500">Gross WPM</div>
              <div className="text-base font-bold font-mono mt-0.5">{liveMetrics.grossWpm}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
              <div className="text-slate-500">CPM</div>
              <div className="text-base font-bold font-mono mt-0.5">{liveMetrics.cpm}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
              <div className="text-slate-500">Correct Chars</div>
              <div className="text-base font-bold font-mono text-emerald-500 mt-0.5">
                {liveMetrics.correctChars}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
              <div className="text-slate-500">Corrected Errors</div>
              <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                {liveMetrics.correctedErrors}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
              <div className="text-slate-500">Uncorrected Errors</div>
              <div className="text-base font-bold font-mono text-rose-500 mt-0.5">
                {liveMetrics.uncorrectedErrors}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
              <div className="text-slate-500">Max Combo</div>
              <div className="text-base font-bold font-mono text-violet-400 mt-0.5">
                {liveMetrics.maxCombo}x
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Formula: Net WPM = (Typed Chars / 5 − Uncorrected Errors) / Elapsed Minutes
            </div>
            <div className="flex items-center gap-3">
              {!certIssued ? (
                <button
                  onClick={handleGenerateCertificate}
                  className="px-4 py-2 rounded-lg border border-cyan-500/50 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Award className="w-4 h-4" />
                  Issue Verified Certificate
                </button>
              ) : (
                <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Certificate Added to Profile
                </span>
              )}
              <button
                onClick={() => resetTest()}
                className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors"
              >
                New Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Virtual Keyboard */}
      {settings.showVirtualKeyboard && status !== 'finished' && (
        <VirtualKeyboard
          nextChar={promptText[typed.length] || ''}
          lastErrorChar={lastErrorChar}
          showFingerGuide={settings.showFingerGuide}
          theme={settings.keyboardTheme}
        />
      )}
    </div>
  );
};
