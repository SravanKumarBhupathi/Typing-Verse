import React, { useState, useRef, useEffect } from 'react';
import { ACADEMY_LESSONS } from '../data/curriculumData';
import { computeLiveMetrics } from '../engine/typingEngine';
import { LessonDefinition, LessonProgressRecord, UserProfile, UserSettings } from '../types/typeverse';
import { soundEngine } from '../utils/soundEngine';
import { VirtualKeyboard } from './VirtualKeyboard';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Lock,
  RotateCcw,
  Star,
  Unlock,
} from 'lucide-react';

interface AcademyViewProps {
  profile: UserProfile;
  settings: UserSettings;
  lessonProgress: Record<string, LessonProgressRecord>;
  onCompleteLesson: (
    lessonId: string,
    wpm: number,
    accuracy: number,
    targetWpm: number,
    targetAccuracy: number,
    xpReward: number
  ) => void;
  initialLessonId?: string | null;
}

export const AcademyView: React.FC<AcademyViewProps> = ({
  settings,
  lessonProgress,
  onCompleteLesson,
  initialLessonId,
}) => {
  const [selectedStage, setSelectedStage] = useState<number>(0); // 0 = All stages
  const [freePracticeUnlockAll, setFreePracticeUnlockAll] = useState<boolean>(false);
  const [activeLesson, setActiveLesson] = useState<LessonDefinition | null>(() => {
    if (initialLessonId) {
      return ACADEMY_LESSONS.find((l) => l.id === initialLessonId) || null;
    }
    return null;
  });

  // Active lesson typing states
  const [typed, setTyped] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [errorKeystrokes, setErrorKeystrokes] = useState(0);
  const [correctedErrors, setCorrectedErrors] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lastErrorChar, setLastErrorChar] = useState<string | null>(null);
  const [completedModal, setCompletedModal] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialLessonId) {
      const found = ACADEMY_LESSONS.find((l) => l.id === initialLessonId);
      if (found) startLesson(found);
    }
  }, [initialLessonId]);

  useEffect(() => {
    if (!activeLesson || !startTime || completedModal) return;
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 100);
    return () => clearInterval(interval);
  }, [activeLesson, startTime, completedModal]);

  const startLesson = (lesson: LessonDefinition) => {
    setActiveLesson(lesson);
    setTyped('');
    setStartTime(null);
    setElapsedMs(0);
    setTotalKeystrokes(0);
    setErrorKeystrokes(0);
    setCorrectedErrors(0);
    setCombo(0);
    setMaxCombo(0);
    setLastErrorChar(null);
    setCompletedModal(false);
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const isLessonUnlocked = (index: number): boolean => {
    if (freePracticeUnlockAll || index === 0) return true;
    const prevLesson = ACADEMY_LESSONS[index - 1];
    return Boolean(lessonProgress[prevLesson.id]?.completed);
  };

  if (activeLesson) {
    const target = activeLesson.practiceText;
    const metrics = computeLiveMetrics({
      typed,
      target,
      elapsedMs: startTime ? Math.max(500, Date.now() - startTime) : 500,
      totalKeystrokes,
      errorKeystrokes,
      correctedErrors,
      wpmHistory: [],
      firstKeyLatencyMs: 180,
      combo,
      maxCombo,
    });

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (completedModal) return;
      if (e.key === 'Backspace') {
        if (typed.length > 0) {
          const prevCharIdx = typed.length - 1;
          if (typed[prevCharIdx] !== target[prevCharIdx]) {
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
        const effectiveStart = startTime ?? now;
        if (!startTime) {
          setStartTime(now);
        }

        const expectedChar = target[typed.length];
        const isCorrect = e.key === expectedChar;
        const nextTyped = typed + e.key;
        const nextTotalKs = totalKeystrokes + 1;
        const nextErrKs = isCorrect ? errorKeystrokes : errorKeystrokes + 1;

        setTotalKeystrokes(nextTotalKs);
        if (isCorrect) {
          const nextCombo = combo + 1;
          setCombo(nextCombo);
          setMaxCombo((m) => Math.max(m, nextCombo));
          setLastErrorChar(null);
          soundEngine.playKeystroke(settings, false);
        } else {
          setErrorKeystrokes(nextErrKs);
          setCombo(0);
          setLastErrorChar(expectedChar);
          soundEngine.playKeystroke(settings, true);
        }

        setTyped(nextTyped);

        if (nextTyped.length >= target.length) {
          const finalMetrics = computeLiveMetrics({
            typed: nextTyped,
            target,
            elapsedMs: Math.max(1000, now - effectiveStart),
            totalKeystrokes: nextTotalKs,
            errorKeystrokes: nextErrKs,
            correctedErrors,
            wpmHistory: [],
            firstKeyLatencyMs: 180,
            combo: isCorrect ? combo + 1 : 0,
            maxCombo: Math.max(maxCombo, isCorrect ? combo + 1 : 0),
          });
          soundEngine.playGameSfx(settings, 'victory');
          onCompleteLesson(
            activeLesson.id,
            finalMetrics.netWpm,
            finalMetrics.accuracy,
            activeLesson.targetWpm,
            activeLesson.targetAccuracy,
            activeLesson.xpReward
          );
          setCompletedModal(true);
        }
      }
    };

    const currentLessonIndex = ACADEMY_LESSONS.findIndex((l) => l.id === activeLesson.id);
    const nextLesson =
      currentLessonIndex >= 0 && currentLessonIndex + 1 < ACADEMY_LESSONS.length
        ? ACADEMY_LESSONS[currentLessonIndex + 1]
        : null;

    const nextExpectedChar = target[typed.length] || '';

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => setActiveLesson(null)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-cyan-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Academy Curriculum
          </button>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span>{activeLesson.stageTitle}</span>
            <span aria-hidden="true"> · </span>
            <span>Lesson {activeLesson.lessonNumber} of {ACADEMY_LESSONS.length}</span>
            <span aria-hidden="true"> · </span>
            <span>Reward: +{activeLesson.xpReward} XP</span>
          </div>
        </div>

        {/* Lesson Guidance Banner */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {activeLesson.lessonNumber}. {activeLesson.title}
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeLesson.explanation}
              </p>
              <div className="mt-3 text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                Ergonomic Posture Cue: {activeLesson.postureTip}
              </div>
            </div>
            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-end border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Focus Keys:{' '}
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {activeLesson.focusKeys.map((k) => (k === ' ' ? 'SPACE' : k)).join(' · ')}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Recommended Goal:{' '}
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {activeLesson.targetAccuracy}%+ Accuracy
                </span>{' '}
                ·{' '}
                <span className="font-mono font-semibold text-cyan-600 dark:text-cyan-400">
                  {activeLesson.targetWpm}+ WPM
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Beginners are never penalized for calm, deliberate speed—focus on accuracy first!
              </div>
            </div>
          </div>
        </div>

        {/* Live Telemetry Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-3.5">
            <div className="text-xs text-slate-500 dark:text-slate-400">Net WPM</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-cyan-600 dark:text-cyan-400">
              {Math.round(metrics.netWpm)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-3.5">
            <div className="text-xs text-slate-500 dark:text-slate-400">Accuracy</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {metrics.accuracy}%
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-3.5">
            <div className="text-xs text-slate-500 dark:text-slate-400">Combo Streak</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-violet-600 dark:text-violet-400">
              {metrics.combo}x
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-3.5">
            <div className="text-xs text-slate-500 dark:text-slate-400">Progress</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {Math.round(metrics.progressPct)}%
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-3.5 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Errors</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-rose-500">
                {metrics.incorrectChars}
              </div>
            </div>
            <button
              onClick={() => startLesson(activeLesson)}
              title="Restart Lesson"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-cyan-500 transition-all duration-150"
            style={{ width: `${metrics.progressPct}%` }}
          />
        </div>

        {/* Interactive Typing Box */}
        <div
          onClick={() => inputRef.current?.focus()}
          className="rounded-xl border-2 border-cyan-500/40 bg-white dark:bg-[#0B1120] p-6 cursor-text relative"
        >
          <div className="font-mono text-xl sm:text-2xl leading-relaxed tracking-wide select-none break-words">
            {target.split('').map((char, idx) => {
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
            aria-label="Lesson typing input"
            className="opacity-0 absolute inset-0 w-full h-full cursor-text"
            autoFocus
          />
        </div>

        {/* Virtual Keyboard with Finger Highlighting */}
        {settings.showVirtualKeyboard && (
          <VirtualKeyboard
            nextChar={nextExpectedChar}
            lastErrorChar={lastErrorChar}
            showFingerGuide={settings.showFingerGuide}
            theme={settings.keyboardTheme}
          />
        )}

        {/* Lesson Completion Modal */}
        {completedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400">
                  Lesson {activeLesson.lessonNumber} Complete
                </span>
                <div className="flex items-center gap-1 text-amber-400">
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        metrics.accuracy >= 85 && (s === 1 || (s === 2 && metrics.netWpm >= activeLesson.targetWpm) || (s === 3 && metrics.accuracy >= activeLesson.targetAccuracy))
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                {activeLesson.title}
              </h3>

              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-slate-100 dark:bg-slate-900 p-3">
                  <div className="text-xs text-slate-500">Net WPM</div>
                  <div className="text-xl font-bold font-mono text-cyan-500">
                    {Math.round(metrics.netWpm)}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-100 dark:bg-slate-900 p-3">
                  <div className="text-xs text-slate-500">Accuracy</div>
                  <div className="text-xl font-bold font-mono text-emerald-500">
                    {metrics.accuracy}%
                  </div>
                </div>
                <div className="rounded-lg bg-slate-100 dark:bg-slate-900 p-3">
                  <div className="text-xs text-slate-500">XP Earned</div>
                  <div className="text-xl font-bold font-mono text-violet-400">
                    +{activeLesson.xpReward}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={() => startLesson(activeLesson)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Retry Lesson
                </button>
                {nextLesson ? (
                  <button
                    onClick={() => startLesson(nextLesson)}
                    className="flex-1 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-xs font-semibold text-slate-950 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    Next Lesson
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveLesson(null)}
                    className="flex-1 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-xs font-semibold text-slate-950 transition-colors"
                  >
                    Finish Curriculum
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const stages = [
    { num: 0, label: 'All Stages (21)' },
    { num: 1, label: 'Stage 1: Beginner' },
    { num: 2, label: 'Stage 2: Foundation' },
    { num: 3, label: 'Stage 3: Word Mastery' },
    { num: 4, label: 'Stage 4: Sentences' },
    { num: 5, label: 'Stage 5: Advanced' },
    { num: 6, label: 'Stage 6: Expert' },
  ];

  const completedCount = Object.values(lessonProgress).filter((l) => l.completed).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Complete Typing Academy
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Structured 6-Stage touch-typing curriculum with interactive finger placement and ergonomic posture guidance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Completed: <strong className="text-cyan-500">{completedCount} / {ACADEMY_LESSONS.length}</strong>
          </div>
          <button
            onClick={() => setFreePracticeUnlockAll((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            {freePracticeUnlockAll ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                Free Practice: All Unlocked
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Progressive Unlock Mode
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Stage Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800">
        {stages.map((st) => (
          <button
            key={st.num}
            onClick={() => setSelectedStage(st.num)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              selectedStage === st.num
                ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Curriculum Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ACADEMY_LESSONS.map((lesson, idx) => {
          if (selectedStage !== 0 && lesson.stageNumber !== selectedStage) return null;
          const prog = lessonProgress[lesson.id];
          const unlocked = isLessonUnlocked(idx);

          return (
            <div
              key={lesson.id}
              className={`rounded-xl border p-5 flex flex-col justify-between transition-colors ${
                unlocked
                  ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] hover:border-cyan-500/60'
                  : 'border-slate-200/60 dark:border-slate-800/50 bg-slate-100/60 dark:bg-slate-900/40 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span>
                    Stage {lesson.stageNumber} · Lesson {lesson.lessonNumber}
                  </span>
                  {prog?.completed ? (
                    <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Passed ({prog.bestWpm} WPM)
                    </span>
                  ) : unlocked ? (
                    <span className="text-cyan-500 font-medium">Ready</span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Lock className="w-3 h-3" />
                      Locked
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {lesson.title}
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {lesson.subtitle}
                </p>

                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Keys: {lesson.focusKeys.map((k) => (k === ' ' ? 'SPACE' : k)).join(' ')} · Goal: {lesson.targetWpm} WPM / {lesson.targetAccuracy}%
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        (prog?.stars || 0) >= s
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300 dark:text-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <button
                  disabled={!unlocked}
                  onClick={() => startLesson(lesson)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    unlocked
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {prog?.completed ? 'Practice Again' : 'Start Lesson'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
