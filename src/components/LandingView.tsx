import React, { useState, useEffect, useRef } from 'react';
import { GameId, NavSection, UserProfile, UserSettings } from '../types/typeverse';
import { soundEngine } from '../utils/soundEngine';
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  ChevronDown,
  Gamepad2,
  Keyboard,
  Shield,
  Swords,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

interface LandingViewProps {
  profile: UserProfile;
  settings: UserSettings;
  onNavigate: (section: NavSection) => void;
  onLaunchGame: (gameId: GameId) => void;
}

const HERO_DEMO_SENTENCES = [
  'Type faster with surgical accuracy to command starfighters and outpace rivals.',
  'Every keystroke charges your spells and propels your vehicle across the finish line.',
  'Master the home row in the academy and rise from Rookie to Immortal Typing Legend.',
];

export const LandingView: React.FC<LandingViewProps> = ({
  profile,
  settings,
  onNavigate,
  onLaunchGame,
}) => {
  const [demoIdx, setDemoIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveAcc, setLiveAcc] = useState(100);
  const [errors, setErrors] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const targetPrompt = HERO_DEMO_SENTENCES[demoIdx];

  useEffect(() => {
    if (!startTime || typed.length === 0) return;
    const elapsedMin = Math.max(0.02, (Date.now() - startTime) / 60000);
    let correct = 0;
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] === targetPrompt[i]) correct++;
    }
    setLiveWpm(Math.round((correct / 5) / elapsedMin));
    setLiveAcc(Math.max(0, Math.round(((typed.length - errors) / Math.max(1, typed.length)) * 100)));
  }, [typed, startTime, targetPrompt, errors]);

  const handleDemoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!startTime && val.length === 1) {
      setStartTime(Date.now());
    }
    if (val.length > typed.length) {
      const charIdx = val.length - 1;
      const isErr = val[charIdx] !== targetPrompt[charIdx];
      if (isErr) setErrors((prev) => prev + 1);
      soundEngine.playKeystroke(settings, isErr);
    }
    if (val.length <= targetPrompt.length) {
      setTyped(val);
    }
    if (val === targetPrompt) {
      soundEngine.playGameSfx(settings, 'victory');
    }
  };

  const resetDemo = (nextPrompt = false) => {
    if (nextPrompt) {
      setDemoIdx((prev) => (prev + 1) % HERO_DEMO_SENTENCES.length);
    }
    setTyped('');
    setStartTime(null);
    setLiveWpm(0);
    setLiveAcc(100);
    setErrors(0);
    inputRef.current?.focus();
  };

  const featuredGames: {
    id: GameId;
    title: string;
    genre: string;
    mechanic: string;
    accent: string;
  }[] = [
    {
      id: 'meteor-defender',
      title: 'Meteor Defender',
      genre: 'Orbital Survival',
      mechanic: 'Typing velocity controls laser fire rate; accuracy amplifies shield integrity against boss meteors.',
      accent: 'text-cyan-400',
    },
    {
      id: 'type-racer',
      title: 'Type Racer GT',
      genre: 'Circuit Racing',
      mechanic: 'Sustained word cadence accelerates your GT cruiser; typos trigger temporary traction drag.',
      accent: 'text-sky-400',
    },
    {
      id: 'spell-caster',
      title: 'Spell Caster',
      genre: 'Arcane Combat',
      mechanic: 'Longer incantations unleash high-damage elemental runes; 98%+ accuracy triggers critical strikes.',
      accent: 'text-violet-400',
    },
    {
      id: 'word-defender',
      title: 'Word Defender',
      genre: 'Tactical Tower Defense',
      mechanic: 'Eliminate multi-lane siege units before they breach your citadel perimeter.',
      accent: 'text-emerald-400',
    },
    {
      id: 'cyber-duel',
      title: 'Cyber Duel',
      genre: '1v1 Arena Combat',
      mechanic: 'Head-to-head synchronized prompts where every accurate word charges your kinetic counter-strike.',
      accent: 'text-amber-400',
    },
    {
      id: 'word-survival',
      title: 'Word Survival',
      genre: 'Endurance Arcade',
      mechanic: 'Defuse volatile countdown words before detonation across escalating velocity waves.',
      accent: 'text-rose-400',
    },
  ];

  const faqs = [
    {
      q: 'How does real typing performance control gameplay in TYPEVERSE?',
      a: 'Every game connects directly to the central TYPEVERSE telemetry engine. Higher Net WPM increases weapon fire rates, vehicle acceleration, and combo multipliers, while high accuracy enables critical hits and preserves shield energy.',
    },
    {
      q: 'Can I use TYPEVERSE without creating an account?',
      a: 'Yes. Guest Mode is active immediately and saves your academy progress, typing test history, ghost runs, and achievements locally. You can upgrade your guest profile to a registered account at any time without losing XP.',
    },
    {
      q: 'How are WPM and Accuracy calculated?',
      a: 'We use international competitive standards: 1 word equals 5 characters. Gross WPM = (All Typed Characters / 5) / Minutes. Net WPM deducts uncorrected errors per minute. All competitive scores are verified by server-side anti-cheat bounds.',
    },
    {
      q: 'Does TYPEVERSE work offline as an installable app?',
      a: 'Yes. TYPEVERSE is a compliant Progressive Web App (PWA). You can install it to your desktop or mobile home screen to practice all 21 Academy lessons, Timed Typing Tests, Ghost Racing, and Single-Player Bot/Arcade modes offline.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070B14] dark:text-slate-100">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="flex items-center justify-between gap-8 px-6 lg:px-12 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#070B14]/90 backdrop-blur-md sticky top-0 z-40">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('home');
          }}
          className="text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 font-display"
        >
          TYPEVERSE
        </a>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            onClick={() => onNavigate('learn')}
            className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
          >
            Academy
          </button>
          <button
            onClick={() => onNavigate('test')}
            className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
          >
            Typing Test
          </button>
          <button
            onClick={() => onNavigate('games')}
            className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
          >
            Game Arena
          </button>
          <button
            onClick={() => onNavigate('friends')}
            className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
          >
            Multiplayer
          </button>
          <button
            onClick={() => onNavigate('leaderboards')}
            className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
          >
            Leaderboards
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-500 rounded-lg hover:bg-cyan-400 transition-colors whitespace-nowrap shrink-0"
          >
            Enter Dashboard
          </button>
        </div>
      </header>

      {/* HERO SECTION WITH INTERACTIVE LIVE TYPING DEMO */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 pt-14 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-xs font-medium text-cyan-600 dark:text-cyan-400 mb-4">
              <span>Type. Compete. Level Up.</span>
              <span aria-hidden="true">·</span>
              <span>6-Stage Curriculum</span>
              <span aria-hidden="true">·</span>
              <span>6 Arcade Games</span>
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold tracking-tight text-slate-900 dark:text-white leading-[1.08]"
              style={{ textWrap: 'balance' }}
            >
              Turn Real Keyboard Mastery Into Competitive Esports.
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              TYPEVERSE unites a structured 21-lesson touch-typing academy with six skill-based arcade games, realistic bot battles, ghost racing, and live multiplayer rooms where every keystroke counts.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={() => onNavigate('learn')}
                className="px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                Start Learning
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('games')}
                className="px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-cyan-500 dark:hover:border-cyan-400 text-slate-800 dark:text-slate-100 font-semibold text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Gamepad2 className="w-4 h-4 text-cyan-500" />
                Play Games
              </button>
              <button
                onClick={() => onNavigate('test')}
                className="px-5 py-3 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Take 30s Speed Test
              </button>
            </div>

            <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-3 gap-6">
              <div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  21 Lessons
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Stages 1–6 Touch Curriculum
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono tabular-nums text-cyan-600 dark:text-cyan-400">
                  6 Games
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  100% Driven by Real WPM
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono tabular-nums text-violet-600 dark:text-violet-400">
                  10 Ranks
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Rookie to Typing Legend
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: INTERACTIVE LIVE TYPING CONSOLE */}
          <div className="lg:col-span-6 flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-6 sm:p-8 shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Interactive Telemetry Sandbox
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Click below and type the prompt to test zero-latency keystroke tracking
                  </p>
                </div>
                <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">WPM </span>
                    <span className="text-base font-bold text-cyan-600 dark:text-cyan-400">{liveWpm}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">ACC </span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{liveAcc}%</span>
                  </div>
                </div>
              </div>

              {/* Prompt Display */}
              <div
                onClick={() => inputRef.current?.focus()}
                className="mt-5 p-5 rounded-xl bg-slate-50 dark:bg-[#070B14] border border-slate-200 dark:border-slate-800/90 font-mono text-base sm:text-lg leading-relaxed cursor-text select-none"
              >
                {targetPrompt.split('').map((char, idx) => {
                  let colorClass = 'text-slate-400 dark:text-slate-500';
                  if (idx < typed.length) {
                    colorClass =
                      typed[idx] === char
                        ? 'text-cyan-600 dark:text-cyan-300'
                        : 'bg-rose-500/25 text-rose-500 dark:text-rose-300 underline';
                  } else if (idx === typed.length) {
                    colorClass =
                      'bg-cyan-500/20 text-slate-900 dark:text-white border-b-2 border-cyan-500';
                  }
                  return (
                    <span key={idx} className={colorClass}>
                      {char}
                    </span>
                  );
                })}
              </div>

              <input
                ref={inputRef}
                type="text"
                value={typed}
                onChange={handleDemoChange}
                placeholder="Start typing the sentence above..."
                aria-label="Live typing speed demonstration input"
                className="mt-4 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 font-mono text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-slate-500 dark:text-slate-400">
                Active Pilot: <strong className="text-slate-800 dark:text-slate-200">{profile.username}</strong> · Rank: <strong className="text-cyan-600 dark:text-cyan-400">{profile.rankName}</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => resetDemo(false)}
                  className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  Reset
                </button>
                <button
                  onClick={() => resetDemo(true)}
                  className="px-3 py-1.5 rounded-md bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
                >
                  Next Prompt
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED GAME ARENA SECTION */}
      <section className="py-16 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090E1A]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <div className="text-xs font-medium text-cyan-600 dark:text-cyan-400 mb-2">
                Skill-Driven Arcade Ecosystem
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                01. Six Distinct Games Powered by Your Keyboard
              </h2>
            </div>
            <button
              onClick={() => onNavigate('games')}
              className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              Open Full Game Arena
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredGames.map((g) => (
              <div
                key={g.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1120] p-6 flex flex-col justify-between hover:border-cyan-500/60 transition-colors"
              >
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <span>{g.genre}</span>
                    <span aria-hidden="true"> · </span>
                    <span>Real-Time WPM Scaling</span>
                  </div>
                  <h3 className={`text-xl font-bold ${g.accent} mb-2`}>{g.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {g.mechanic}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    4 Difficulty Tiers + Bosses
                  </span>
                  <button
                    onClick={() => onLaunchGame(g.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500 text-cyan-600 dark:text-cyan-300 hover:text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    Play Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW TYPEVERSE WORKS & 6-STAGE ACADEMY PREVIEW */}
      <section className="py-16 border-t border-slate-200 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-medium text-violet-600 dark:text-violet-400 mb-2">
              Structured Curriculum & Adaptive Engine
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              02. Complete 6-Stage Typing Academy & Competitive Modes
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Whether you are learning home-row finger placement for the first time or training for 120+ WPM esports finals, TYPEVERSE adapts to your weak keys and error patterns.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-6">
              <BookOpen className="w-6 h-6 text-cyan-500 mb-4" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Stages 1–6 Curriculum
              </h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Progress from Home Row anchors (F & J) through Top/Bottom rows, Digraph mastery, Sentence punctuation, Code symbols, and High-Velocity sprints.
              </p>
              <button
                onClick={() => onNavigate('learn')}
                className="mt-4 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                Explore Curriculum →
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-6">
              <Users className="w-6 h-6 text-violet-500 mb-4" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Live Multiplayer & Bots
              </h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Create instant 6-character room codes to race friends across browsers via WebSockets, or battle 5 realistic Bot tiers with adaptive speed scaling.
              </p>
              <button
                onClick={() => onNavigate('friends')}
                className="mt-4 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
              >
                Create or Join Room →
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-6">
              <Zap className="w-6 h-6 text-emerald-500 mb-4" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Ghost Racing & Challenges
              </h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Race checkpoint-by-checkpoint against your own Personal Best ghost vehicle, or generate shareable Challenge links to test friends on identical prompts.
              </p>
              <button
                onClick={() => onNavigate('challenges')}
                className="mt-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Open Challenge Arena →
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-6">
              <Trophy className="w-6 h-6 text-amber-500 mb-4" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Tournaments & Certificates
              </h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Compete in Knockout and Round-Robin brackets, climb 10 Career Ranks, and export verified typing achievement certificates.
              </p>
              <button
                onClick={() => onNavigate('tournaments')}
                className="mt-4 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
              >
                View Tournaments →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-16 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090E1A]">
        <div className="max-w-4xl mx-auto px-6 lg:px-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-8">
            03. Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1120] overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/60 dark:border-slate-800/60 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CLEAN FOOTER */}
      <footer className="py-10 border-t border-slate-200 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <strong className="text-slate-900 dark:text-white font-display">TYPEVERSE</strong> · Type. Compete. Level Up.
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <button onClick={() => onNavigate('learn')} className="hover:text-cyan-400 transition-colors">
              Academy
            </button>
            <button onClick={() => onNavigate('games')} className="hover:text-cyan-400 transition-colors">
              Game Arena
            </button>
            <button onClick={() => onNavigate('bots')} className="hover:text-cyan-400 transition-colors">
              Bot Battles
            </button>
            <button onClick={() => onNavigate('career')} className="hover:text-cyan-400 transition-colors">
              Career Ranks
            </button>
            <button onClick={() => onNavigate('settings')} className="hover:text-cyan-400 transition-colors">
              Settings
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
