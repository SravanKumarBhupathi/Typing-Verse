/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  CertificateRecord,
  CustomChallenge,
  GameId,
  GameResultRecord,
  GhostRun,
  LessonProgressRecord,
  NavSection,
  Tournament,
  TypingResultRecord,
  UserProfile,
  UserSettings,
} from './types/typeverse';
import {
  checkAndUnlockAchievements,
  issueCertificate,
  loadCertificates,
  loadCustomChallenges,
  loadGameResults,
  loadGhostRuns,
  loadLessonProgress,
  loadProfile,
  loadSettings,
  loadTournaments,
  loadTypingResults,
  loadUnlockedAchievements,
  recordCompetitiveMatch,
  saveCustomChallenge,
  saveGameResult,
  saveGhostRun,
  saveLessonCompletion,
  saveProfile,
  saveSettings,
  saveTournaments,
  saveTypingResult,
} from './services/storageService';
import { LandingView } from './components/LandingView';
import { AcademyView } from './components/AcademyView';
import { TypingTestView } from './components/TypingTestView';
import { GameArenaView } from './components/GameArenaView';
import {
  BotBattlesView,
  ChallengeArenaView,
  FriendMultiplayerView,
  TournamentsView,
} from './components/MultiplayerAndCompetitiveViews';
import {
  AchievementsView,
  DashboardView,
  LeaderboardsView,
  MyProgressView,
  ProfileView,
  SettingsView,
  TypingCareerView,
} from './components/ProgressionAndProfileViews';
import { OfflineConnectivityBanner, PWAInstallButton } from './components/PWAInstallButton';
import { soundEngine } from './utils/soundEngine';
import {
  Award,
  BarChart3,
  BookOpen,
  Bot,
  Compass,
  Gamepad2,
  Home,
  Keyboard,
  LayoutDashboard,
  Medal,
  Menu,
  Moon,
  Settings,
  Share2,
  Sun,
  Swords,
  Trophy,
  User,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Persistent State
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const [typingResults, setTypingResults] = useState<TypingResultRecord[]>(() => loadTypingResults());
  const [gameResults, setGameResults] = useState<GameResultRecord[]>(() => loadGameResults());
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgressRecord>>(() =>
    loadLessonProgress()
  );
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(() =>
    loadUnlockedAchievements()
  );
  const [ghostRuns, setGhostRuns] = useState<GhostRun[]>(() => loadGhostRuns());
  const [challenges, setChallenges] = useState<CustomChallenge[]>(() => loadCustomChallenges());
  const [tournaments, setTournaments] = useState<Tournament[]>(() => loadTournaments());
  const [certificates, setCertificates] = useState<CertificateRecord[]>(() => loadCertificates());

  // Cross-view contextual parameters
  const [targetLessonId, setTargetLessonId] = useState<string | null>(null);
  const [targetGameId, setTargetGameId] = useState<GameId | null>(null);
  const [targetRoomCode, setTargetRoomCode] = useState<string | null>(null);
  const [customDrillText, setCustomDrillText] = useState<string | undefined>(undefined);
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  // Sync URL query params (?room=CODE or ?challenge=ID)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const challengeParam = params.get('challenge');
    if (roomParam) {
      setTargetRoomCode(roomParam.toUpperCase());
      setActiveSection('friends');
    } else if (challengeParam) {
      setActiveSection('challenges');
    }
  }, []);

  // Sync Dark / Light theme & Reduced Motion on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    soundEngine.syncAmbientMusic(settings);
  }, [settings]);

  const triggerToast = (msg: string) => {
    setToastBanner(msg);
    setTimeout(() => setToastBanner(null), 4000);
  };

  const handleUpdateSettings = (next: UserSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const handleUpdateProfile = (next: UserProfile) => {
    setProfile(next);
    saveProfile(next);
  };

  const handleSaveTypingResult = (result: TypingResultRecord) => {
    const { profile: nextProf, newlyUnlockedAchievements } = saveTypingResult(result);
    setProfile(nextProf);
    setTypingResults(loadTypingResults());
    setUnlockedAchievements(loadUnlockedAchievements());
    if (newlyUnlockedAchievements.length > 0) {
      soundEngine.playGameSfx(settings, 'achievement');
      triggerToast(`Achievement Unlocked: ${newlyUnlockedAchievements.join(', ')}!`);
    }
  };

  const handleSaveGameResult = (result: GameResultRecord) => {
    const { profile: nextProf, newlyUnlockedAchievements } = saveGameResult(result);
    setProfile(nextProf);
    setGameResults(loadGameResults());
    setUnlockedAchievements(loadUnlockedAchievements());
    if (newlyUnlockedAchievements.length > 0) {
      soundEngine.playGameSfx(settings, 'achievement');
      triggerToast(`Achievement Unlocked: ${newlyUnlockedAchievements.join(', ')}!`);
    }
  };

  const handleCompleteLesson = (
    lessonId: string,
    wpm: number,
    accuracy: number,
    targetWpm: number,
    targetAccuracy: number,
    xpReward: number
  ) => {
    const nextProf = saveLessonCompletion(
      lessonId,
      wpm,
      accuracy,
      targetWpm,
      targetAccuracy,
      xpReward
    );
    setProfile(nextProf);
    setLessonProgress(loadLessonProgress());
    setUnlockedAchievements(loadUnlockedAchievements());
  };

  const handleRecordMatch = (won: boolean, wpm: number, accuracy: number, durationSec: number) => {
    const nextProf = recordCompetitiveMatch(won, wpm, accuracy, durationSec);
    setProfile(nextProf);
    setUnlockedAchievements(loadUnlockedAchievements());
  };

  const navItems: { id: NavSection; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'learn', label: 'Learn Typing', icon: BookOpen },
    { id: 'test', label: 'Typing Test', icon: Keyboard },
    { id: 'games', label: 'Game Arena', icon: Gamepad2 },
    { id: 'bots', label: 'Bot Battles', icon: Bot },
    { id: 'friends', label: 'Play With Friends', icon: Users },
    { id: 'challenges', label: 'Challenge Arena', icon: Share2 },
    { id: 'tournaments', label: 'Tournaments', icon: Swords },
    { id: 'leaderboards', label: 'Leaderboards', icon: Trophy },
    { id: 'progress', label: 'My Progress', icon: BarChart3 },
    { id: 'achievements', label: 'Achievements', icon: Award },
    { id: 'career', label: 'Typing Career', icon: Medal },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Render Landing Page when on 'home'
  if (activeSection === 'home') {
    return (
      <>
        <LandingView
          profile={profile}
          settings={settings}
          onNavigate={(sec) => {
            setTargetLessonId(null);
            setTargetGameId(null);
            setActiveSection(sec);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onLaunchGame={(gId) => {
            setTargetGameId(gId);
            setActiveSection('games');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
        <OfflineConnectivityBanner />
      </>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-[#070B14] dark:text-slate-100">
      {/* DESKTOP SIDEBAR NAVIGATION (15 Main Sections) */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090E1A] shrink-0 sticky top-0 h-screen">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <button
            onClick={() => setActiveSection('home')}
            className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display whitespace-nowrap"
          >
            TYPEVERSE
          </button>
          <span className="text-xs font-mono text-cyan-500">Lv.{profile.level}</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setTargetLessonId(null);
                  setTargetGameId(null);
                  setCustomDrillText(undefined);
                  setActiveSection(item.id);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
              {profile.username}
            </span>
            <span className="font-mono text-cyan-400">{profile.xp} XP</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Rank: {profile.rankName} · Best: {profile.bestWpm} WPM
          </div>
        </div>
      </aside>

      {/* MAIN WORKSPACE CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Workspace Top Toolbar */}
        <header className="h-15 px-4 sm:px-8 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#090E1A]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              <strong className="text-slate-900 dark:text-white">{profile.username}</strong>
              <span aria-hidden="true"> · </span>
              <span>{profile.rankName}</span>
              <span aria-hidden="true"> · </span>
              <span className="font-mono text-cyan-500">{profile.xp} XP</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <PWAInstallButton />

            <button
              onClick={() =>
                handleUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled })
              }
              title={settings.soundEnabled ? 'Mute Audio' : 'Enable Audio'}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {settings.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>

            <button
              onClick={() =>
                handleUpdateSettings({
                  ...settings,
                  theme: settings.theme === 'dark' ? 'light' : 'dark',
                })
              }
              title="Toggle Light / Dark Theme"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {settings.theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090E1A] px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                    activeSection === item.id
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Toast Notification */}
        {toastBanner && (
          <div className="mx-6 mt-4 rounded-xl border border-cyan-500/50 bg-cyan-500/15 px-4 py-3 text-xs font-semibold text-cyan-300 flex items-center justify-between">
            <span>{toastBanner}</span>
            <button onClick={() => setToastBanner(null)} className="text-slate-400 hover:text-white">
              Dismiss
            </button>
          </div>
        )}

        {/* Active View Container */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8">
          {activeSection === 'dashboard' && (
            <DashboardView
              profile={profile}
              typingResults={typingResults}
              gameResults={gameResults}
              lessonProgress={lessonProgress}
              unlockedAchievements={unlockedAchievements}
              onNavigate={setActiveSection}
              onStartLesson={(lid) => {
                setTargetLessonId(lid);
                setActiveSection('learn');
              }}
              onLaunchGame={(gid) => {
                setTargetGameId(gid);
                setActiveSection('games');
              }}
            />
          )}

          {activeSection === 'learn' && (
            <AcademyView
              profile={profile}
              settings={settings}
              lessonProgress={lessonProgress}
              onCompleteLesson={handleCompleteLesson}
              initialLessonId={targetLessonId}
            />
          )}

          {activeSection === 'test' && (
            <TypingTestView
              profile={profile}
              settings={settings}
              ghostRuns={ghostRuns}
              onSaveResult={handleSaveTypingResult}
              onSaveGhostRun={(run) => {
                saveGhostRun(run);
                setGhostRuns(loadGhostRuns());
              }}
              onIssueCertificate={(cert) => {
                issueCertificate(cert);
                setCertificates(loadCertificates());
                triggerToast(`Verified Certificate ${cert.id} Issued!`);
              }}
              onGhostRaceWin={() => {
                const newly = checkAndUnlockAchievements(profile, false, false, true);
                setUnlockedAchievements(loadUnlockedAchievements());
                if (newly.length > 0) {
                  triggerToast(`Achievement Unlocked: Ghost Race Champion!`);
                }
              }}
              initialCustomText={customDrillText}
            />
          )}

          {activeSection === 'games' && (
            <GameArenaView
              profile={profile}
              settings={settings}
              initialGameId={targetGameId}
              onSaveGameResult={handleSaveGameResult}
            />
          )}

          {activeSection === 'bots' && (
            <BotBattlesView
              profile={profile}
              settings={settings}
              onRecordMatch={handleRecordMatch}
            />
          )}

          {activeSection === 'friends' && (
            <FriendMultiplayerView
              profile={profile}
              settings={settings}
              initialRoomCode={targetRoomCode}
              onRecordMatch={handleRecordMatch}
            />
          )}

          {activeSection === 'challenges' && (
            <ChallengeArenaView
              profile={profile}
              settings={settings}
              challenges={challenges}
              onSaveChallenge={(ch) => {
                saveCustomChallenge(ch);
                setChallenges(loadCustomChallenges());
              }}
            />
          )}

          {activeSection === 'tournaments' && (
            <TournamentsView
              profile={profile}
              settings={settings}
              tournaments={tournaments}
              onSaveTournaments={(list) => {
                saveTournaments(list);
                setTournaments(list);
              }}
              onWinTournament={() => {
                checkAndUnlockAchievements(profile, false, true, false);
                setUnlockedAchievements(loadUnlockedAchievements());
                triggerToast('Tournament Champion Achievement Unlocked!');
              }}
            />
          )}

          {activeSection === 'leaderboards' && (
            <LeaderboardsView
              profile={profile}
              typingResults={typingResults}
              gameResults={gameResults}
            />
          )}

          {activeSection === 'progress' && (
            <MyProgressView
              profile={profile}
              typingResults={typingResults}
              gameResults={gameResults}
              onStartCustomDrill={(drill) => {
                setCustomDrillText(drill);
                setActiveSection('test');
              }}
            />
          )}

          {activeSection === 'achievements' && (
            <AchievementsView
              profile={profile}
              unlockedAchievements={unlockedAchievements}
              typingResults={typingResults}
              lessonProgress={lessonProgress}
            />
          )}

          {activeSection === 'career' && (
            <TypingCareerView
              profile={profile}
              lessonProgress={lessonProgress}
              onUpdateProfile={handleUpdateProfile}
            />
          )}

          {activeSection === 'profile' && (
            <ProfileView
              profile={profile}
              certificates={certificates}
              onUpdateProfile={handleUpdateProfile}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
            />
          )}
        </main>
      </div>

      <OfflineConnectivityBanner />
    </div>
  );
}
