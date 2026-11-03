import { TextCategory, TypingResultRecord } from '../types/typeverse';

/**
 * STANDARD TYPING FORMULAS (Documented & Transparent):
 * - 1 Standard Word = 5 characters (including spaces and punctuation).
 * - Gross WPM = (Total Characters Typed / 5) / (Elapsed Minutes)
 * - Net WPM = Math.max(0, Gross WPM - (Uncorrected Errors / Elapsed Minutes))
 * - Accuracy (%) = (Correct Keystrokes / Total Keystrokes) * 100
 * - CPM = Total Correct Characters / Elapsed Minutes
 * - Consistency (%) = 100 - CoefficientOfVariation(Windowed WPM samples)
 */

export const TEXT_CORPUS: Record<Exclude<TextCategory, 'custom'>, string[]> = {
  easy: [
    'the sun rises over the calm blue ocean while gentle waves wash across the sandy shore each morning',
    'practice makes steady progress when you keep your hands relaxed and your eyes focused on the screen',
    'a quiet forest path leads toward the clear mountain stream where tall pine trees sway in the breeze',
    'reading good books and writing clear notes every day helps students learn new ideas with confidence'
  ],
  medium: [
    'Building muscle memory on a keyboard requires prioritizing clean accuracy before pushing for higher velocity across longer paragraphs.',
    'Modern ergonomic setups align the wrists neutrally above the home row so each finger travels minimal distance between consecutive keys.',
    'Every competitive match rewards composure under pressure; recovering smoothly from a single typo preserves both rhythm and combo multiplier.',
    'When practicing complex words, look two or three syllables ahead of your cursor so your fingers prepare the upcoming sequence automatically.'
  ],
  hard: [
    'Precision telemetry indicates that maintaining 97.5% accuracy yields higher net throughput than erratic bursts plagued by frequent backspace penalties.',
    'Architectural resilience in distributed systems depends on deterministic state transitions, idempotent message handlers, and sub-millisecond orchestration.',
    'Championship typists synchronize visual lookahead with peripheral proprioception, eliminating hesitation on hyphenated compounds and nested clauses.',
    'Cryptographic verification protocols ensure leaderboard integrity by cross-checking keystroke cadence distributions against reported gross velocity.'
  ],
  expert: [
    'export function calculateNetWpm(chars: number, uncorrected: number, seconds: number): number { return Math.max(0, (chars / 5 - uncorrected) / (seconds / 60)); }',
    'In high-frequency execution pipelines (p99 < 1.8ms), lock-free ring buffers prevent thread contention while preserving strict sequential consistency.',
    'Synthesizing harmonic oscillators via WebAudio requires exponential gain ramps (0.001f at t + 0.035s) to eliminate zero-crossing acoustic artifacts!',
    'const query = "SELECT profile_id, MAX(net_wpm) AS peak_wpm FROM typing_results WHERE accuracy >= 96.0 GROUP BY profile_id ORDER BY peak_wpm DESC LIMIT 50;";'
  ],
  quotes: [
    'Quality is not an act, it is a habit. We are what we repeatedly do, and excellence emerges from deliberate daily practice.',
    'Simplicity is about subtracting the obvious and adding the meaningful so that every interaction feels effortless and purposeful.',
    'The secret of getting ahead is getting started; break complex challenges into small steps and master the fundamentals first.',
    'It is not that I am so smart, it is just that I stay with problems longer and refine every detail until the system works.'
  ],
  general: [
    'Global communication networks connect millions of learners, engineers, and creators across continents in real time through written language.',
    'Sustainable urban design integrates public transit corridors, shaded pedestrian plazas, and renewable microgrids into cohesive neighborhoods.',
    'Oceanographic expeditions map deep-sea hydrothermal vents, revealing resilient ecosystems thriving thousands of meters below sunlight.',
    'Digital libraries preserve centuries of scientific manuscripts, allowing researchers to search historical archives within milliseconds.'
  ],
  technical: [
    'PostgreSQL Row Level Security policies enforce tenant isolation at the database engine layer using parameterized session claims.',
    'React fiber reconciliation schedules high-priority input events ahead of background transitions to keep frame times under sixteen milliseconds.',
    'WebSocket frames minimize protocol overhead compared to HTTP polling, enabling bi-directional state synchronization for multiplayer arenas.',
    'IndexedDB provides asynchronous transactional object storage in the browser for offline progressive web applications and telemetry logs.'
  ],
  numbers: [
    'Flight 4829 departed Gate 17B at 06:45 UTC, cruising at 36,000 feet with a ground speed of 548 knots over Sector 904.',
    'Quarterly metrics showed 14,920 active sessions, 98.4% uptime across 64 nodes, and a 27.5% reduction in average latency to 11.3ms.',
    'Order #83910-2026 includes 250 units at $19.75 each, totaling $4,937.50 before applying the 8.25% regional tax adjustment.',
    'Benchmark v4.12 recorded 1,048,576 operations in 3.84 seconds (273,066 ops/sec) with 0 memory leaks across 128 worker threads.'
  ],
  symbols: [
    'if (score >= 1200 && accuracy > 95.5) { awardBadge("Rank #1 [Apex]"); } else { retryQueue.push({ id: "@user_09", delta: -4.2 }); }',
    'Regex pattern /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/ validates standard email addresses without backtracking traps!',
    'Path variables: $HOME/.config/typeverse/settings.json | flags: --strict --port=3000 --env="production" &>> /var/log/app.log',
    'Formula check: [(45 * 2.5) / (100 - 15%)] + {delta_x ^ 2} != 0; verify pointers *ptr && &ref -> next_node.'
  ]
};

export const GAME_WORD_POOLS: Record<'easy' | 'medium' | 'hard' | 'expert' | 'boss', string[]> = {
  easy: [
    'star', 'nova', 'beam', 'shield', 'orbit', 'pulse', 'laser', 'drift', 'spark', 'comet',
    'wave', 'core', 'flux', 'dash', 'glow', 'wind', 'fire', 'bolt', 'rune', 'ward',
    'fast', 'code', 'type', 'key', 'node', 'link', 'sync', 'grid', 'apex', 'zero'
  ],
  medium: [
    'nebula', 'photon', 'reactor', 'eclipse', 'horizon', 'gravity', 'vortex', 'phantom',
    'circuit', 'bastion', 'glacial', 'tempest', 'arcane', 'alchemy', 'sentinel', 'velocity',
    'catalyst', 'spectrum', 'quantum', 'kinetic', 'firewall', 'protocol', 'overdrive', 'valkyrie'
  ],
  hard: [
    'singularity', 'chronosphere', 'electromagnetic', 'superconductor', 'constellation',
    'incantation', 'metamorphosis', 'cryptographic', 'reverberation', 'interstellar',
    'stratosphere', 'acceleration', 'equilibrium', 'transmutation', 'cybernetics', 'hypervelocity'
  ],
  expert: [
    'asynchronous', 'decentralized', 'thermodynamics', 'magnetosphere', 'bioluminescence',
    'countermeasure', 'multidimensional', 'photosynthesis', 'eigenfunction', 'microarchitecture',
    'parallelogram', 'reconnaissance', 'synchronization', 'unprecedented', 'vulnerabilities'
  ],
  boss: [
    'celestial sovereign armada',
    'quantum overdrive protocol',
    'primordial arcane cataclysm',
    'hypervelocity neural nexus',
    'obsidian fortress juggernaut'
  ]
};

export function generatePromptText(category: TextCategory, durationSec: number, customText?: string): string {
  if (category === 'custom' && customText && customText.trim().length >= 15) {
    return customText.trim().replace(/\s+/g, ' ');
  }
  const pool = TEXT_CORPUS[category === 'custom' ? 'medium' : category] || TEXT_CORPUS.medium;
  const targetChars = Math.max(160, Math.min(1800, durationSec * 9));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  let combined = shuffled.join(' ');
  while (combined.length < targetChars) {
    combined += ' ' + pool[Math.floor(Math.random() * pool.length)];
  }
  return combined;
}

export interface LiveTypingMetrics {
  elapsedSec: number;
  grossWpm: number;
  netWpm: number;
  accuracy: number;
  cpm: number;
  errorRate: number;
  consistency: number;
  reactionTimeMs: number;
  combo: number;
  maxCombo: number;
  correctChars: number;
  incorrectChars: number;
  correctedErrors: number;
  uncorrectedErrors: number;
  progressPct: number;
}

export function computeLiveMetrics(params: {
  typed: string;
  target: string;
  elapsedMs: number;
  totalKeystrokes: number;
  errorKeystrokes: number;
  correctedErrors: number;
  wpmHistory: number[];
  firstKeyLatencyMs: number;
  combo: number;
  maxCombo: number;
}): LiveTypingMetrics {
  const {
    typed,
    target,
    elapsedMs,
    totalKeystrokes,
    errorKeystrokes,
    correctedErrors,
    wpmHistory,
    firstKeyLatencyMs,
    combo,
    maxCombo
  } = params;

  const elapsedSec = Math.max(0.5, elapsedMs / 1000);
  const elapsedMin = elapsedSec / 60;

  let correctChars = 0;
  let uncorrectedErrors = 0;
  for (let i = 0; i < typed.length; i++) {
    if (typed[i] === target[i]) {
      correctChars++;
    } else {
      uncorrectedErrors++;
    }
  }

  const grossWpm = Math.round(((typed.length / 5) / elapsedMin) * 10) / 10;
  const netWpm = Math.max(0, Math.round((((typed.length / 5) - uncorrectedErrors) / elapsedMin) * 10) / 10);
  const cpm = Math.round(correctChars / elapsedMin);

  const accuracy =
    totalKeystrokes > 0
      ? Math.max(0, Math.min(100, Math.round(((totalKeystrokes - errorKeystrokes) / totalKeystrokes) * 1000) / 10))
      : 100;

  const errorRate = Math.round((100 - accuracy) * 10) / 10;

  let consistency = 92;
  if (wpmHistory.length >= 3) {
    const mean = wpmHistory.reduce((a, b) => a + b, 0) / wpmHistory.length;
    if (mean > 0) {
      const variance = wpmHistory.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / wpmHistory.length;
      const stdDev = Math.sqrt(variance);
      const cv = (stdDev / mean) * 100;
      consistency = Math.max(25, Math.min(100, Math.round(100 - cv)));
    }
  }

  const progressPct = target.length > 0 ? Math.min(100, Math.round((typed.length / target.length) * 1000) / 10) : 0;

  return {
    elapsedSec: Math.round(elapsedSec * 10) / 10,
    grossWpm,
    netWpm,
    accuracy,
    cpm,
    errorRate,
    consistency,
    reactionTimeMs: firstKeyLatencyMs || 210,
    combo,
    maxCombo,
    correctChars,
    incorrectChars: errorKeystrokes,
    correctedErrors,
    uncorrectedErrors,
    progressPct,
  };
}

export interface AdaptiveRecommendation {
  headline: string;
  diagnosticSummary: string;
  weakKeys: string[];
  recommendedLessonIds: string[];
  recommendedGameId: string;
  recommendedGameReason: string;
  customDrillText: string;
}

export function generateAdaptiveRecommendations(
  results: TypingResultRecord[],
  avgWpm: number,
  avgAccuracy: number
): AdaptiveRecommendation {
  const aggregatedErrors: Record<string, number> = {};
  for (const r of results.slice(0, 25)) {
    for (const [k, count] of Object.entries(r.keyErrors || {})) {
      const upper = k.toUpperCase();
      if (/^[A-Z0-9;,./'-]$/.test(upper)) {
        aggregatedErrors[upper] = (aggregatedErrors[upper] || 0) + count;
      }
    }
  }

  const sortedWeak = Object.entries(aggregatedErrors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => k);

  const weakKeys = sortedWeak.length > 0 ? sortedWeak : ['R', 'T', 'Y', 'U'];

  // Build targeted drill text using the user's weak keys
  const keyWordMap: Record<string, string[]> = {
    A: ['adapt', 'arcade', 'atlas', 'alpha'],
    S: ['system', 'signal', 'steady', 'sphere'],
    D: ['defend', 'dynamic', 'domain', 'direct'],
    F: ['focus', 'frame', 'future', 'flight'],
    J: ['journey', 'justice', 'junction', 'jet'],
    K: ['kernel', 'kinetic', 'keyboard', 'key'],
    L: ['logic', 'laser', 'level', 'launch'],
    R: ['rhythm', 'reactor', 'record', 'render'],
    T: ['target', 'tactile', 'tempo', 'transit'],
    Y: ['yield', 'system', 'synergy', 'syntax'],
    U: ['ultra', 'update', 'uniform', 'uplink'],
    E: ['engine', 'energy', 'element', 'exact'],
    I: ['impact', 'index', 'insight', 'ignite'],
    O: ['orbit', 'output', 'optimal', 'origin'],
    P: ['pulse', 'pattern', 'precise', 'photon'],
  };

  const drillWords: string[] = [];
  for (let i = 0; i < 18; i++) {
    const k = weakKeys[i % weakKeys.length];
    const candidates = keyWordMap[k] || ['focus', 'rhythm', 'target', 'steady'];
    drillWords.push(candidates[i % candidates.length]);
  }

  const customDrillText = drillWords.join(' ');

  if (avgWpm < 30 || avgAccuracy < 88) {
    return {
      headline: 'Foundation & Precision Reinforcement',
      diagnosticSummary: `Your current average is ${Math.round(avgWpm)} WPM at ${Math.round(avgAccuracy)}% accuracy. Strengthening finger anchoring on ${weakKeys.join(', ')} will prevent cascading errors and unlock smoother velocity.`,
      weakKeys,
      recommendedLessonIds: ['stage1-lesson5', 'stage2-lesson1', 'stage3-lesson5'],
      recommendedGameId: 'meteor-defender',
      recommendedGameReason: 'Beginner Meteor Defender isolates single-word bursts so you can lock in 96%+ accuracy between waves.',
      customDrillText,
    };
  }

  if (avgWpm < 55) {
    return {
      headline: 'Transitioning from Letter-by-Letter to Word Flow',
      diagnosticSummary: `At ${Math.round(avgWpm)} WPM and ${Math.round(avgAccuracy)}% accuracy, your highest error concentration occurs on ${weakKeys.join(', ')}. Practicing digraph transitions and rhythm pacing will elevate you past 60 WPM.`,
      weakKeys,
      recommendedLessonIds: ['stage3-lesson3', 'stage4-lesson1', 'stage4-lesson3'],
      recommendedGameId: 'type-racer',
      recommendedGameReason: 'Type Racer rewards sustained multi-word cadence and penalizes erratic acceleration.',
      customDrillText,
    };
  }

  return {
    headline: 'High-Velocity Consistency & Complex Syntax Mastery',
    diagnosticSummary: `Strong baseline of ${Math.round(avgWpm)} WPM (${Math.round(avgAccuracy)}% accuracy). Fine-tuning precision on ${weakKeys.join(', ')} under high cognitive load will push your net throughput into Grandmaster territory.`,
    weakKeys,
    recommendedLessonIds: ['stage5-lesson3', 'stage6-lesson2', 'stage6-lesson4'],
    recommendedGameId: 'cyber-duel',
    recommendedGameReason: 'Cyber Duel tests high-speed accuracy under direct head-to-head pressure where every keystroke charges counter-attacks.',
    customDrillText,
  };
}
