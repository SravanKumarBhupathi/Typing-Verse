import React from 'react';

interface VirtualKeyboardProps {
  nextChar: string;
  lastErrorChar?: string | null;
  showFingerGuide?: boolean;
  theme?: 'obsidian-cyan' | 'violet-pulse' | 'solar-flare' | 'emerald-matrix';
}

type FingerId =
  | 'left-pinky'
  | 'left-ring'
  | 'left-middle'
  | 'left-index'
  | 'thumbs'
  | 'right-index'
  | 'right-middle'
  | 'right-ring'
  | 'right-pinky';

interface KeyDef {
  label: string;
  shiftLabel?: string;
  code: string;
  width?: string;
  finger: FingerId;
  homeAnchor?: boolean;
}

const FINGER_META: Record<FingerId, { name: string; colorClass: string; badgeBg: string }> = {
  'left-pinky': {
    name: 'Left Pinky',
    colorClass: 'border-rose-500/40 text-rose-300',
    badgeBg: 'bg-rose-500',
  },
  'left-ring': {
    name: 'Left Ring',
    colorClass: 'border-amber-500/40 text-amber-300',
    badgeBg: 'bg-amber-500',
  },
  'left-middle': {
    name: 'Left Middle',
    colorClass: 'border-emerald-500/40 text-emerald-300',
    badgeBg: 'bg-emerald-500',
  },
  'left-index': {
    name: 'Left Index',
    colorClass: 'border-cyan-500/40 text-cyan-300',
    badgeBg: 'bg-cyan-500',
  },
  thumbs: {
    name: 'Thumbs (Spacebar)',
    colorClass: 'border-slate-400/40 text-slate-300',
    badgeBg: 'bg-slate-400',
  },
  'right-index': {
    name: 'Right Index',
    colorClass: 'border-sky-500/40 text-sky-300',
    badgeBg: 'bg-sky-500',
  },
  'right-middle': {
    name: 'Right Middle',
    colorClass: 'border-teal-500/40 text-teal-300',
    badgeBg: 'bg-teal-500',
  },
  'right-ring': {
    name: 'Right Ring',
    colorClass: 'border-violet-500/40 text-violet-300',
    badgeBg: 'bg-violet-500',
  },
  'right-pinky': {
    name: 'Right Pinky',
    colorClass: 'border-fuchsia-500/40 text-fuchsia-300',
    badgeBg: 'bg-fuchsia-500',
  },
};

const KEYBOARD_ROWS: KeyDef[][] = [
  [
    { label: '`', shiftLabel: '~', code: '`', finger: 'left-pinky' },
    { label: '1', shiftLabel: '!', code: '1', finger: 'left-pinky' },
    { label: '2', shiftLabel: '@', code: '2', finger: 'left-ring' },
    { label: '3', shiftLabel: '#', code: '3', finger: 'left-middle' },
    { label: '4', shiftLabel: '$', code: '4', finger: 'left-index' },
    { label: '5', shiftLabel: '%', code: '5', finger: 'left-index' },
    { label: '6', shiftLabel: '^', code: '6', finger: 'right-index' },
    { label: '7', shiftLabel: '&', code: '7', finger: 'right-index' },
    { label: '8', shiftLabel: '*', code: '8', finger: 'right-middle' },
    { label: '9', shiftLabel: '(', code: '9', finger: 'right-ring' },
    { label: '0', shiftLabel: ')', code: '0', finger: 'right-pinky' },
    { label: '-', shiftLabel: '_', code: '-', finger: 'right-pinky' },
    { label: '=', shiftLabel: '+', code: '=', finger: 'right-pinky' },
    { label: 'Bksp', code: 'BACKSPACE', width: 'w-20', finger: 'right-pinky' },
  ],
  [
    { label: 'Tab', code: 'TAB', width: 'w-16', finger: 'left-pinky' },
    { label: 'Q', code: 'Q', finger: 'left-pinky' },
    { label: 'W', code: 'W', finger: 'left-ring' },
    { label: 'E', code: 'E', finger: 'left-middle' },
    { label: 'R', code: 'R', finger: 'left-index' },
    { label: 'T', code: 'T', finger: 'left-index' },
    { label: 'Y', code: 'Y', finger: 'right-index' },
    { label: 'U', code: 'U', finger: 'right-index' },
    { label: 'I', code: 'I', finger: 'right-middle' },
    { label: 'O', code: 'O', finger: 'right-ring' },
    { label: 'P', code: 'P', finger: 'right-pinky' },
    { label: '[', shiftLabel: '{', code: '[', finger: 'right-pinky' },
    { label: ']', shiftLabel: '}', code: ']', finger: 'right-pinky' },
    { label: '\\', shiftLabel: '|', code: '\\', width: 'w-14', finger: 'right-pinky' },
  ],
  [
    { label: 'Caps', code: 'CAPS', width: 'w-18', finger: 'left-pinky' },
    { label: 'A', code: 'A', finger: 'left-pinky' },
    { label: 'S', code: 'S', finger: 'left-ring' },
    { label: 'D', code: 'D', finger: 'left-middle' },
    { label: 'F', code: 'F', finger: 'left-index', homeAnchor: true },
    { label: 'G', code: 'G', finger: 'left-index' },
    { label: 'H', code: 'H', finger: 'right-index' },
    { label: 'J', code: 'J', finger: 'right-index', homeAnchor: true },
    { label: 'K', code: 'K', finger: 'right-middle' },
    { label: 'L', code: 'L', finger: 'right-ring' },
    { label: ';', shiftLabel: ':', code: ';', finger: 'right-pinky' },
    { label: "'", shiftLabel: '"', code: "'", finger: 'right-pinky' },
    { label: 'Enter', code: 'ENTER', width: 'w-20', finger: 'right-pinky' },
  ],
  [
    { label: 'Shift', code: 'LSHIFT', width: 'w-24', finger: 'left-pinky' },
    { label: 'Z', code: 'Z', finger: 'left-pinky' },
    { label: 'X', code: 'X', finger: 'left-ring' },
    { label: 'C', code: 'C', finger: 'left-middle' },
    { label: 'V', code: 'V', finger: 'left-index' },
    { label: 'B', code: 'B', finger: 'left-index' },
    { label: 'N', code: 'N', finger: 'right-index' },
    { label: 'M', code: 'M', finger: 'right-index' },
    { label: ',', shiftLabel: '<', code: ',', finger: 'right-middle' },
    { label: '.', shiftLabel: '>', code: '.', finger: 'right-ring' },
    { label: '/', shiftLabel: '?', code: '/', finger: 'right-pinky' },
    { label: 'Shift', code: 'RSHIFT', width: 'w-24', finger: 'right-pinky' },
  ],
  [
    { label: 'Spacebar', code: ' ', width: 'w-72', finger: 'thumbs' },
  ],
];

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  nextChar,
  lastErrorChar,
  showFingerGuide = true,
  theme = 'obsidian-cyan',
}) => {
  const upperNext = nextChar === ' ' ? ' ' : nextChar.toUpperCase();
  const needsShift =
    (nextChar >= 'A' && nextChar <= 'Z') ||
    ['~', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '{', '}', '|', ':', '"', '<', '>', '?'].includes(
      nextChar
    );

  // Find active key and finger
  let activeFinger: FingerId = 'thumbs';
  for (const row of KEYBOARD_ROWS) {
    for (const k of row) {
      if (k.code === upperNext || k.shiftLabel === nextChar) {
        activeFinger = k.finger;
      }
    }
  }

  const needsRightShift = needsShift && activeFinger.startsWith('left-');
  const needsLeftShift = needsShift && activeFinger.startsWith('right-');

  const activeHighlightMap = {
    'obsidian-cyan': 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_16px_rgba(6,182,212,0.55)]',
    'violet-pulse': 'bg-violet-500 text-white border-violet-300 shadow-[0_0_16px_rgba(139,92,246,0.55)]',
    'solar-flare': 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.55)]',
    'emerald-matrix': 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.55)]',
  };

  return (
    <div className="w-full rounded-xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0B1120] p-4 select-none">
      {showFingerGuide && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2.5 border-b border-slate-200 dark:border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">Target Key:</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-cyan-300">
              {nextChar === ' ' ? 'SPACE' : nextChar || '—'}
            </span>
            <span className="text-slate-400" aria-hidden="true">·</span>
            <span className="text-slate-500 dark:text-slate-400">Assigned Finger:</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {FINGER_META[activeFinger].name}
            </span>
            {(needsLeftShift || needsRightShift) && (
              <>
                <span className="text-slate-400" aria-hidden="true">·</span>
                <span className="text-amber-600 dark:text-amber-300 font-medium">
                  + {needsLeftShift ? 'Left Pinky (Shift)' : 'Right Pinky (Shift)'}
                </span>
              </>
            )}
          </div>
          <div className="hidden xl:flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Pinky: Rose/Fuchsia</span>
            <span aria-hidden="true">·</span>
            <span>Ring: Amber/Violet</span>
            <span aria-hidden="true">·</span>
            <span>Middle: Emerald/Teal</span>
            <span aria-hidden="true">·</span>
            <span>Index: Cyan/Sky</span>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-1.5 overflow-x-auto py-1">
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex items-center justify-center gap-1.5 min-w-[660px]">
            {row.map((k) => {
              const isTarget =
                k.code === upperNext ||
                k.shiftLabel === nextChar ||
                (k.code === 'LSHIFT' && needsLeftShift) ||
                (k.code === 'RSHIFT' && needsRightShift);

              const isError =
                lastErrorChar &&
                (k.code === lastErrorChar.toUpperCase() || k.shiftLabel === lastErrorChar);

              const widthClass = k.width || 'w-11';
              const fingerStyle = showFingerGuide
                ? FINGER_META[k.finger].colorClass
                : 'border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300';

              return (
                <div
                  key={k.code + k.label}
                  className={`relative h-11 ${widthClass} rounded-lg border flex flex-col items-center justify-center font-mono text-xs font-semibold transition-transform duration-100 ${
                    isError
                      ? 'bg-rose-600 text-white border-rose-400 scale-95'
                      : isTarget
                      ? `${activeHighlightMap[theme]} scale-105`
                      : `bg-slate-100 dark:bg-slate-900/90 ${fingerStyle}`
                  }`}
                >
                  {k.shiftLabel && (
                    <span className="text-[9px] opacity-60 leading-none mb-0.5">{k.shiftLabel}</span>
                  )}
                  <span className="leading-none">{k.label}</span>
                  {k.homeAnchor && (
                    <span
                      className={`absolute bottom-1 w-3 h-0.5 rounded-full ${
                        isTarget ? 'bg-slate-950' : 'bg-cyan-400'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
