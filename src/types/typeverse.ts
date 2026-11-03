export type NavSection =
  | 'home'
  | 'dashboard'
  | 'learn'
  | 'test'
  | 'games'
  | 'bots'
  | 'friends'
  | 'challenges'
  | 'tournaments'
  | 'leaderboards'
  | 'progress'
  | 'achievements'
  | 'career'
  | 'profile'
  | 'settings';

export type DifficultyTier = 'easy' | 'medium' | 'hard' | 'expert';

export type TextCategory =
  | 'easy'
  | 'medium'
  | 'hard'
  | 'expert'
  | 'quotes'
  | 'general'
  | 'technical'
  | 'numbers'
  | 'symbols'
  | 'custom';

export type GameId =
  | 'meteor-defender'
  | 'type-racer'
  | 'spell-caster'
  | 'word-defender'
  | 'cyber-duel'
  | 'word-survival';

export type BotDifficultyId = 'easy' | 'medium' | 'hard' | 'expert' | 'adaptive';

export interface UserSettings {
  theme: 'dark' | 'light';
  soundEnabled: boolean;
  keySoundProfile: 'tactile' | 'linear' | 'clicky' | 'muted';
  gameSfxEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
  reducedMotion: boolean;
  showVirtualKeyboard: boolean;
  showFingerGuide: boolean;
  keyboardTheme: 'obsidian-cyan' | 'violet-pulse' | 'solar-flare' | 'emerald-matrix';
}

export interface UserProfile {
  id: string;
  playerCode: string;
  username: string;
  email?: string;
  isGuest: boolean;
  avatar: string;
  frame: string;
  title: string;
  createdAt: string;
  xp: number;
  level: number;
  rankIndex: number;
  rankName: string;
  streakDays: number;
  lastActiveDate: string;
  totalPracticeSeconds: number;
  testsCompleted: number;
  gamesPlayed: number;
  matchesTotal: number;
  matchesWon: number;
  bestWpm: number;
  avgWpm: number;
  avgAccuracy: number;
  unlockedAvatars: string[];
  unlockedFrames: string[];
  unlockedTitles: string[];
  unlockedKeyboardThemes: string[];
}

export interface KeyErrorStat {
  key: string;
  attempts: number;
  errors: number;
  avgLatencyMs: number;
}

export interface GhostCheckpoint {
  elapsedSec: number;
  charsTyped: number;
  wpm: number;
  accuracy: number;
  progressPct: number;
}

export interface GhostRun {
  id: string;
  label: string;
  username: string;
  durationSec: number;
  category: TextCategory;
  promptText: string;
  finalWpm: number;
  finalAccuracy: number;
  createdAt: string;
  checkpoints: GhostCheckpoint[];
}

export interface TypingResultRecord {
  id: string;
  durationSec: number;
  category: TextCategory;
  grossWpm: number;
  netWpm: number;
  accuracy: number;
  cpm: number;
  errorRate: number;
  consistency: number;
  reactionTimeMs: number;
  maxCombo: number;
  correctChars: number;
  incorrectChars: number;
  correctedErrors: number;
  uncorrectedErrors: number;
  createdAt: string;
  verifiedByServer: boolean;
  keyErrors: Record<string, number>;
}

export interface GameResultRecord {
  id: string;
  gameId: GameId;
  difficulty: DifficultyTier;
  score: number;
  waveOrDistance: number;
  wpm: number;
  accuracy: number;
  maxCombo: number;
  durationSec: number;
  won: boolean;
  xpEarned: number;
  createdAt: string;
}

export interface LessonDefinition {
  id: string;
  stageNumber: 1 | 2 | 3 | 4 | 5 | 6;
  stageTitle: string;
  lessonNumber: number;
  title: string;
  subtitle: string;
  explanation: string;
  postureTip: string;
  focusKeys: string[];
  targetWpm: number;
  targetAccuracy: number;
  practiceText: string;
  xpReward: number;
}

export interface LessonProgressRecord {
  lessonId: string;
  completed: boolean;
  bestWpm: number;
  bestAccuracy: number;
  attempts: number;
  stars: 0 | 1 | 2 | 3;
  updatedAt: string;
}

export interface BotOpponent {
  id: string;
  name: string;
  difficulty: BotDifficultyId;
  wpmRange: [number, number];
  targetAccuracy: number;
  avatarColor: string;
  personality: string;
  mistakeProbability: number;
  correctionDelayMs: number;
}

export interface CustomChallenge {
  id: string;
  creatorName: string;
  mode: 'same-text' | 'same-duration' | 'speed' | 'accuracy' | 'game-score';
  gameId?: GameId;
  difficulty: DifficultyTier;
  durationSec: number;
  promptText: string;
  targetWpm: number;
  targetAccuracy: number;
  targetScore: number;
  createdAt: string;
  attempts: {
    id: string;
    playerName: string;
    wpm: number;
    accuracy: number;
    score: number;
    completedAt: string;
  }[];
}

export interface TournamentMatch {
  id: string;
  round: number;
  matchOrder: number;
  player1: string;
  player2: string;
  player1Wpm?: number;
  player2Wpm?: number;
  player1Acc?: number;
  player2Acc?: number;
  winner?: string;
  status: 'pending' | 'ready' | 'completed';
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  format: 'knockout' | 'single-elimination' | 'round-robin' | 'best-of-three';
  gameMode: 'typing-test' | GameId;
  difficulty: DifficultyTier;
  maxParticipants: number;
  startTime: string;
  registrationDeadline: string;
  isPrivate: boolean;
  inviteCode: string;
  status: 'registration' | 'active' | 'completed';
  participants: string[];
  matches: TournamentMatch[];
  winner?: string;
}

export interface CertificateRecord {
  id: string;
  username: string;
  durationSec: number;
  wpm: number;
  accuracy: number;
  consistency: number;
  category: string;
  issuedAt: string;
  verificationHash: string;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  category: 'speed' | 'accuracy' | 'multiplayer' | 'games' | 'consistency';
  xpReward: number;
  requirementText: string;
}

export interface DailyChallengeItem {
  id: string;
  type: 'daily' | 'weekly';
  title: string;
  description: string;
  current: number;
  target: number;
  xpReward: number;
  completed: boolean;
}

export interface CareerRankDefinition {
  index: number;
  name: string;
  minWpm: number;
  minAccuracy: number;
  minLessonsCompleted: number;
  minGamesPlayed: number;
  minTestsCompleted: number;
  rewardTitle: string;
  rewardFrame: string;
  badgeColor: string;
}
