import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CAREER_RANKS,
  ACHIEVEMENTS_LIST,
} from '../data/curriculumData';
import {
  CertificateRecord,
  CustomChallenge,
  DailyChallengeItem,
  GameResultRecord,
  GhostRun,
  LessonProgressRecord,
  Tournament,
  TypingResultRecord,
  UserProfile,
  UserSettings,
} from '../types/typeverse';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabaseClient: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const STORAGE_KEYS = {
  PROFILE: 'typeverse_profile_v1',
  SETTINGS: 'typeverse_settings_v1',
  TYPING_RESULTS: 'typeverse_typing_results_v1',
  GAME_RESULTS: 'typeverse_game_results_v1',
  LESSON_PROGRESS: 'typeverse_lesson_progress_v1',
  ACHIEVEMENTS: 'typeverse_unlocked_achievements_v1',
  GHOST_RUNS: 'typeverse_ghost_runs_v1',
  CHALLENGES: 'typeverse_custom_challenges_v1',
  TOURNAMENTS: 'typeverse_tournaments_v1',
  CERTIFICATES: 'typeverse_certificates_v1',
  XP_LEDGER: 'typeverse_xp_ledger_v1',
  REGISTERED_USERS: 'typeverse_registered_accounts_v1',
};

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  soundEnabled: true,
  keySoundProfile: 'tactile',
  gameSfxEnabled: true,
  musicEnabled: false,
  volume: 0.65,
  reducedMotion: false,
  showVirtualKeyboard: true,
  showFingerGuide: true,
  keyboardTheme: 'obsidian-cyan',
};

export function createInitialProfile(): UserProfile {
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: 'usr_' + Math.random().toString(36).slice(2, 10),
    playerCode: `TV-${randomDigits}`,
    username: `Pilot_${randomDigits.toString().slice(0, 4)}`,
    isGuest: true,
    avatar: 'cyan-visor',
    frame: 'slate-standard',
    title: 'Novice Initiate',
    createdAt: new Date().toISOString(),
    xp: 120,
    level: 1,
    rankIndex: 1,
    rankName: 'Rookie',
    streakDays: 1,
    lastActiveDate: today,
    totalPracticeSeconds: 0,
    testsCompleted: 0,
    gamesPlayed: 0,
    matchesTotal: 0,
    matchesWon: 0,
    bestWpm: 0,
    avgWpm: 0,
    avgAccuracy: 95,
    unlockedAvatars: ['cyan-visor', 'violet-mage', 'emerald-ranger', 'amber-striker'],
    unlockedFrames: ['slate-standard', 'emerald-trim'],
    unlockedTitles: ['Novice Initiate'],
    unlockedKeyboardThemes: ['obsidian-cyan', 'violet-pulse', 'solar-flare', 'emerald-matrix'],
  };
}

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch {}
}

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) {
      const initial = createInitialProfile();
      saveProfile(initial);
      return initial;
    }
    const parsed: UserProfile = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (parsed.lastActiveDate !== today) {
      const last = new Date(parsed.lastActiveDate);
      const now = new Date(today);
      const diffDays = Math.round((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      parsed.streakDays = diffDays === 1 ? parsed.streakDays + 1 : 1;
      parsed.lastActiveDate = today;
      saveProfile(parsed);
    }
    return parsed;
  } catch {
    return createInitialProfile();
  }
}

export function saveProfile(profile: UserProfile) {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch {}
}

export function evaluateCareerRank(
  profile: UserProfile,
  lessonsCompletedCount: number
): UserProfile {
  let highestRank = CAREER_RANKS[0];
  for (const r of CAREER_RANKS) {
    if (
      profile.bestWpm >= r.minWpm &&
      profile.avgAccuracy >= r.minAccuracy &&
      lessonsCompletedCount >= r.minLessonsCompleted &&
      profile.gamesPlayed >= r.minGamesPlayed &&
      profile.testsCompleted >= r.minTestsCompleted
    ) {
      highestRank = r;
    }
  }

  const updated = { ...profile };
  updated.rankIndex = highestRank.index;
  updated.rankName = highestRank.name;
  updated.level = Math.max(1, Math.floor(Math.sqrt(updated.xp / 80)) + 1);

  if (!updated.unlockedTitles.includes(highestRank.rewardTitle)) {
    updated.unlockedTitles.push(highestRank.rewardTitle);
  }
  if (!updated.unlockedFrames.includes(highestRank.rewardFrame)) {
    updated.unlockedFrames.push(highestRank.rewardFrame);
  }
  return updated;
}

export function loadTypingResults(): TypingResultRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TYPING_RESULTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTypingResult(result: TypingResultRecord): {
  profile: UserProfile;
  newlyUnlockedAchievements: string[];
} {
  const results = [result, ...loadTypingResults()].slice(0, 200);
  try {
    localStorage.setItem(STORAGE_KEYS.TYPING_RESULTS, JSON.stringify(results));
  } catch {}

  let profile = loadProfile();
  const xpEarned = Math.min(250, Math.round(result.netWpm * 1.2 + (result.accuracy >= 96 ? 30 : 10)));
  profile.xp += xpEarned;
  profile.testsCompleted += 1;
  profile.totalPracticeSeconds += result.durationSec;
  profile.bestWpm = Math.max(profile.bestWpm, Math.round(result.netWpm));

  const recentWpms = results.slice(0, 20).map((r) => r.netWpm);
  const recentAccs = results.slice(0, 20).map((r) => r.accuracy);
  profile.avgWpm = Math.round((recentWpms.reduce((a, b) => a + b, 0) / recentWpms.length) * 10) / 10;
  profile.avgAccuracy = Math.round((recentAccs.reduce((a, b) => a + b, 0) / recentAccs.length) * 10) / 10;

  const lessonsDone = Object.values(loadLessonProgress()).filter((l) => l.completed).length;
  profile = evaluateCareerRank(profile, lessonsDone);
  saveProfile(profile);

  const newlyUnlockedAchievements = checkAndUnlockAchievements(profile, result.accuracy === 100, false, false);
  return { profile, newlyUnlockedAchievements };
}

export function loadGameResults(): GameResultRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GAME_RESULTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGameResult(result: GameResultRecord): {
  profile: UserProfile;
  newlyUnlockedAchievements: string[];
} {
  const list = [result, ...loadGameResults()].slice(0, 200);
  try {
    localStorage.setItem(STORAGE_KEYS.GAME_RESULTS, JSON.stringify(list));
  } catch {}

  let profile = loadProfile();
  profile.xp += result.xpEarned;
  profile.gamesPlayed += 1;
  profile.totalPracticeSeconds += result.durationSec;
  profile.bestWpm = Math.max(profile.bestWpm, Math.round(result.wpm));

  const lessonsDone = Object.values(loadLessonProgress()).filter((l) => l.completed).length;
  profile = evaluateCareerRank(profile, lessonsDone);
  saveProfile(profile);

  const newlyUnlockedAchievements = checkAndUnlockAchievements(profile, result.accuracy === 100, false, false);
  return { profile, newlyUnlockedAchievements };
}

export function recordCompetitiveMatch(won: boolean, wpm: number, accuracy: number, durationSec: number): UserProfile {
  let profile = loadProfile();
  profile.matchesTotal += 1;
  if (won) profile.matchesWon += 1;
  profile.totalPracticeSeconds += durationSec;
  profile.bestWpm = Math.max(profile.bestWpm, Math.round(wpm));
  profile.xp += won ? 140 : 60;

  const lessonsDone = Object.values(loadLessonProgress()).filter((l) => l.completed).length;
  profile = evaluateCareerRank(profile, lessonsDone);
  saveProfile(profile);
  checkAndUnlockAchievements(profile, accuracy === 100, false, false);
  return profile;
}

export function loadLessonProgress(): Record<string, LessonProgressRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LESSON_PROGRESS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLessonCompletion(
  lessonId: string,
  wpm: number,
  accuracy: number,
  targetWpm: number,
  targetAccuracy: number,
  xpReward: number
): UserProfile {
  const map = loadLessonProgress();
  const prev = map[lessonId];
  const passed = accuracy >= Math.max(80, targetAccuracy - 5);
  let stars: 0 | 1 | 2 | 3 = 0;
  if (passed) {
    stars = wpm >= targetWpm + 8 && accuracy >= targetAccuracy + 2 ? 3 : wpm >= targetWpm && accuracy >= targetAccuracy ? 2 : 1;
  }

  map[lessonId] = {
    lessonId,
    completed: prev?.completed || passed,
    bestWpm: Math.max(prev?.bestWpm || 0, Math.round(wpm)),
    bestAccuracy: Math.max(prev?.bestAccuracy || 0, Math.round(accuracy * 10) / 10),
    attempts: (prev?.attempts || 0) + 1,
    stars: Math.max(prev?.stars || 0, stars) as 0 | 1 | 2 | 3,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEYS.LESSON_PROGRESS, JSON.stringify(map));
  } catch {}

  let profile = loadProfile();
  // Anti-farming: full XP on first completion, 25% practice XP on repeat completions
  const awardedXp = prev?.completed ? Math.round(xpReward * 0.25) : xpReward;
  profile.xp += awardedXp;
  profile.totalPracticeSeconds += 45;
  profile.bestWpm = Math.max(profile.bestWpm, Math.round(wpm));

  const lessonsDone = Object.values(map).filter((l) => l.completed).length;
  profile = evaluateCareerRank(profile, lessonsDone);
  saveProfile(profile);
  checkAndUnlockAchievements(profile, accuracy === 100, false, false);
  return profile;
}

export function loadUnlockedAchievements(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function checkAndUnlockAchievements(
  profile: UserProfile,
  hadPerfectAccuracy: boolean,
  wonTournament: boolean,
  wonGhostRace: boolean
): string[] {
  const unlocked = new Set(loadUnlockedAchievements());
  const newlyUnlocked: string[] = [];

  const grant = (id: string) => {
    if (!unlocked.has(id)) {
      unlocked.add(id);
      newlyUnlocked.push(id);
      const def = ACHIEVEMENTS_LIST.find((a) => a.id === id);
      if (def) {
        profile.xp += def.xpReward;
      }
    }
  };

  if (profile.testsCompleted >= 1) grant('first-test');
  if (profile.bestWpm >= 20) grant('wpm-20');
  if (profile.bestWpm >= 40) grant('wpm-40');
  if (profile.bestWpm >= 60) grant('wpm-60');
  if (profile.bestWpm >= 100) grant('wpm-100');
  if (hadPerfectAccuracy) grant('perfect-accuracy');
  if (profile.matchesWon >= 1) grant('first-multiplayer-win');
  if (profile.matchesWon >= 10) grant('ten-wins');
  if (profile.streakDays >= 7) grant('seven-day-streak');
  if (profile.gamesPlayed >= 5) grant('game-explorer');
  if (wonTournament) grant('tournament-champion');
  if (wonGhostRace) grant('ghost-race-champion');

  if (newlyUnlocked.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(Array.from(unlocked)));
      saveProfile(profile);
    } catch {}
  }

  return newlyUnlocked;
}

export function loadGhostRuns(): GhostRun[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GHOST_RUNS);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Seed default Pacer Ghost so users can immediately race a Ghost on their very first session
  const defaultGhost: GhostRun = {
    id: 'ghost_default_pacer',
    label: 'Personal Target Pacer (48 WPM)',
    username: 'Pacer_Ghost',
    durationSec: 30,
    category: 'medium',
    promptText:
      'Building muscle memory on a keyboard requires prioritizing clean accuracy before pushing for higher velocity across longer paragraphs.',
    finalWpm: 48,
    finalAccuracy: 97.5,
    createdAt: new Date().toISOString(),
    checkpoints: [
      { elapsedSec: 3, charsTyped: 12, wpm: 46, accuracy: 98, progressPct: 9 },
      { elapsedSec: 6, charsTyped: 24, wpm: 48, accuracy: 98, progressPct: 18 },
      { elapsedSec: 9, charsTyped: 36, wpm: 48, accuracy: 97, progressPct: 27 },
      { elapsedSec: 12, charsTyped: 48, wpm: 49, accuracy: 97.5, progressPct: 36 },
      { elapsedSec: 15, charsTyped: 60, wpm: 48, accuracy: 98, progressPct: 45 },
      { elapsedSec: 18, charsTyped: 72, wpm: 48, accuracy: 97.5, progressPct: 54 },
      { elapsedSec: 21, charsTyped: 84, wpm: 48, accuracy: 97.5, progressPct: 63 },
      { elapsedSec: 24, charsTyped: 96, wpm: 48, accuracy: 97.5, progressPct: 72 },
      { elapsedSec: 27, charsTyped: 108, wpm: 48, accuracy: 97.5, progressPct: 81 },
      { elapsedSec: 30, charsTyped: 120, wpm: 48, accuracy: 97.5, progressPct: 90 },
    ],
  };
  return [defaultGhost];
}

export function saveGhostRun(run: GhostRun) {
  const existing = loadGhostRuns();
  const updated = [run, ...existing].slice(0, 25);
  try {
    localStorage.setItem(STORAGE_KEYS.GHOST_RUNS, JSON.stringify(updated));
  } catch {}
}

export function loadCustomChallenges(): CustomChallenge[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHALLENGES);
    if (raw) return JSON.parse(raw);
  } catch {}

  const starter: CustomChallenge[] = [
    {
      id: 'CH-8042',
      creatorName: 'Elena_Vanguard',
      mode: 'same-text',
      difficulty: 'medium',
      durationSec: 30,
      promptText:
        'Every competitive match rewards composure under pressure; recovering smoothly from a single typo preserves both rhythm and combo multiplier.',
      targetWpm: 54,
      targetAccuracy: 96.5,
      targetScore: 520,
      createdAt: new Date(Date.now() - 3600_000 * 5).toISOString(),
      attempts: [
        {
          id: 'att_1',
          playerName: 'Elena_Vanguard',
          wpm: 54,
          accuracy: 96.5,
          score: 520,
          completedAt: new Date(Date.now() - 3600_000 * 5).toISOString(),
        },
      ],
    },
    {
      id: 'CH-9175',
      creatorName: 'Kaelen_99',
      mode: 'accuracy',
      difficulty: 'hard',
      durationSec: 60,
      promptText:
        'Architectural resilience in distributed systems depends on deterministic state transitions, idempotent message handlers, and sub-millisecond orchestration.',
      targetWpm: 68,
      targetAccuracy: 98.2,
      targetScore: 668,
      createdAt: new Date(Date.now() - 3600_000 * 14).toISOString(),
      attempts: [
        {
          id: 'att_2',
          playerName: 'Kaelen_99',
          wpm: 68,
          accuracy: 98.2,
          score: 668,
          completedAt: new Date(Date.now() - 3600_000 * 14).toISOString(),
        },
      ],
    },
  ];
  return starter;
}

export function saveCustomChallenge(challenge: CustomChallenge) {
  const list = loadCustomChallenges();
  const idx = list.findIndex((c) => c.id === challenge.id);
  if (idx >= 0) {
    list[idx] = challenge;
  } else {
    list.unshift(challenge);
  }
  try {
    localStorage.setItem(STORAGE_KEYS.CHALLENGES, JSON.stringify(list));
  } catch {}
}

export function loadTournaments(): Tournament[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TOURNAMENTS);
    if (raw) return JSON.parse(raw);
  } catch {}

  const initial: Tournament[] = [
    {
      id: 'TRN-APEX-01',
      name: 'Cyber Velocity Invitational',
      description: '4-Player Single Elimination sprint bracket on Medium difficulty prompts.',
      format: 'single-elimination',
      gameMode: 'typing-test',
      difficulty: 'medium',
      maxParticipants: 4,
      startTime: new Date().toISOString(),
      registrationDeadline: new Date(Date.now() + 86400_000).toISOString(),
      isPrivate: true,
      inviteCode: 'APEX01',
      status: 'active',
      participants: ['You', 'Valkyrie Pulse', 'Hyperion Striker', 'Lyra_Synth'],
      matches: [
        {
          id: 'm1',
          round: 1,
          matchOrder: 1,
          player1: 'You',
          player2: 'Valkyrie Pulse',
          status: 'ready',
        },
        {
          id: 'm2',
          round: 1,
          matchOrder: 2,
          player1: 'Hyperion Striker',
          player2: 'Lyra_Synth',
          player1Wpm: 61,
          player2Wpm: 56,
          player1Acc: 97.1,
          player2Acc: 95.8,
          winner: 'Hyperion Striker',
          status: 'completed',
        },
        {
          id: 'm3',
          round: 2,
          matchOrder: 1,
          player1: 'TBD',
          player2: 'Hyperion Striker',
          status: 'pending',
        },
      ],
    },
  ];
  return initial;
}

export function saveTournaments(list: Tournament[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.TOURNAMENTS, JSON.stringify(list));
  } catch {}
}

export function loadCertificates(): CertificateRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CERTIFICATES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function issueCertificate(cert: CertificateRecord) {
  const list = [cert, ...loadCertificates()];
  try {
    localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(list));
  } catch {}
}

export function getDailyAndWeeklyChallenges(
  profile: UserProfile,
  typingResults: TypingResultRecord[],
  lessonProgress: Record<string, LessonProgressRecord>
): DailyChallengeItem[] {
  const today = new Date().toISOString().slice(0, 10);
  const todayTests = typingResults.filter((r) => r.createdAt.slice(0, 10) === today);
  const highAccToday = todayTests.some((r) => r.accuracy >= 95);
  const completedLessonsCount = Object.values(lessonProgress).filter((l) => l.completed).length;

  return [
    {
      id: 'daily-3-tests',
      type: 'daily',
      title: 'Complete Three Tests',
      description: 'Finish 3 timed typing tests today to calibrate your daily telemetry.',
      current: Math.min(3, todayTests.length),
      target: 3,
      xpReward: 90,
      completed: todayTests.length >= 3,
    },
    {
      id: 'daily-95-acc',
      type: 'daily',
      title: 'Maintain 95% Accuracy',
      description: 'Complete a timed test today with 95.0% or higher keystroke accuracy.',
      current: highAccToday ? 1 : 0,
      target: 1,
      xpReward: 80,
      completed: highAccToday,
    },
    {
      id: 'daily-bot-win',
      type: 'daily',
      title: 'Beat One Bot or Opponent',
      description: 'Win a match in Bot Battles or Friend Multiplayer.',
      current: Math.min(1, profile.matchesWon),
      target: 1,
      xpReward: 100,
      completed: profile.matchesWon >= 1,
    },
    {
      id: 'daily-lesson',
      type: 'daily',
      title: 'Complete One Academy Lesson',
      description: 'Pass any structured lesson in the 6-Stage Typing Academy.',
      current: Math.min(1, completedLessonsCount),
      target: 1,
      xpReward: 75,
      completed: completedLessonsCount >= 1,
    },
    {
      id: 'daily-game',
      type: 'daily',
      title: 'Play One Game Arena Session',
      description: 'Complete a match in any of the 6 arcade games.',
      current: Math.min(1, profile.gamesPlayed),
      target: 1,
      xpReward: 85,
      completed: profile.gamesPlayed >= 1,
    },
    {
      id: 'weekly-5-lessons',
      type: 'weekly',
      title: 'Academy Milestone: 5 Lessons',
      description: 'Complete 5 lessons across the Typing Academy curriculum.',
      current: Math.min(5, completedLessonsCount),
      target: 5,
      xpReward: 250,
      completed: completedLessonsCount >= 5,
    },
    {
      id: 'weekly-50-wpm',
      type: 'weekly',
      title: 'Speed Milestone: 50 WPM',
      description: 'Reach a personal best of 50+ Net WPM.',
      current: Math.min(50, profile.bestWpm),
      target: 50,
      xpReward: 300,
      completed: profile.bestWpm >= 50,
    },
  ];
}
