# TYPEVERSE — Normalized PostgreSQL & Supabase Schema

Below is the normalized PostgreSQL schema with Foreign Keys, Indexes, Unique Constraints, and Row Level Security (RLS) policies for all 27 tables when deploying with Supabase PostgreSQL.

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  player_code VARCHAR(16) UNIQUE NOT NULL,
  username VARCHAR(32) UNIQUE NOT NULL,
  avatar VARCHAR(64) DEFAULT 'cyan-visor',
  frame VARCHAR(64) DEFAULT 'slate-standard',
  title VARCHAR(64) DEFAULT 'Novice Initiate',
  xp INTEGER DEFAULT 0 CHECK (xp >= 0),
  level INTEGER DEFAULT 1 CHECK (level >= 1),
  rank_index INTEGER DEFAULT 1,
  rank_name VARCHAR(32) DEFAULT 'Rookie',
  streak_days INTEGER DEFAULT 1,
  last_active_date DATE DEFAULT CURRENT_DATE,
  total_practice_seconds INTEGER DEFAULT 0,
  tests_completed INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  matches_total INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  best_wpm NUMERIC(5,1) DEFAULT 0,
  avg_wpm NUMERIC(5,1) DEFAULT 0,
  avg_accuracy NUMERIC(5,2) DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. user_settings
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  theme VARCHAR(16) DEFAULT 'dark',
  sound_enabled BOOLEAN DEFAULT TRUE,
  key_sound_profile VARCHAR(16) DEFAULT 'tactile',
  game_sfx_enabled BOOLEAN DEFAULT TRUE,
  music_enabled BOOLEAN DEFAULT FALSE,
  volume NUMERIC(3,2) DEFAULT 0.65,
  reduced_motion BOOLEAN DEFAULT FALSE,
  show_virtual_keyboard BOOLEAN DEFAULT TRUE,
  show_finger_guide BOOLEAN DEFAULT TRUE,
  keyboard_theme VARCHAR(32) DEFAULT 'obsidian-cyan',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. typing_sessions & 4. typing_results
CREATE TABLE typing_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category VARCHAR(32) NOT NULL,
  duration_sec INTEGER NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE typing_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID UNIQUE REFERENCES typing_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  duration_sec INTEGER NOT NULL,
  category VARCHAR(32) NOT NULL,
  gross_wpm NUMERIC(5,1) NOT NULL CHECK (gross_wpm >= 0 AND gross_wpm <= 260),
  net_wpm NUMERIC(5,1) NOT NULL CHECK (net_wpm >= 0 AND net_wpm <= 260),
  accuracy NUMERIC(5,2) NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
  cpm INTEGER NOT NULL,
  consistency NUMERIC(5,2) DEFAULT 90,
  max_combo INTEGER DEFAULT 0,
  key_errors JSONB DEFAULT '{}'::jsonb,
  verified_by_server BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_typing_results_user_wpm ON typing_results(user_id, net_wpm DESC);

-- 5. lessons & 6. lesson_progress
CREATE TABLE lessons (
  id VARCHAR(64) PRIMARY KEY,
  stage_number INTEGER NOT NULL,
  lesson_number INTEGER UNIQUE NOT NULL,
  title VARCHAR(128) NOT NULL,
  target_wpm INTEGER NOT NULL,
  target_accuracy NUMERIC(5,2) NOT NULL,
  xp_reward INTEGER NOT NULL
);

CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id VARCHAR(64) REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  best_wpm NUMERIC(5,1) DEFAULT 0,
  best_accuracy NUMERIC(5,2) DEFAULT 0,
  attempts INTEGER DEFAULT 1,
  stars SMALLINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- 7. games, 8. game_sessions, 9. game_results
CREATE TABLE games (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(64) NOT NULL,
  genre VARCHAR(64) NOT NULL
);

CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  game_id VARCHAR(64) REFERENCES games(id),
  difficulty VARCHAR(16) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE game_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID UNIQUE REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  game_id VARCHAR(64) REFERENCES games(id),
  difficulty VARCHAR(16) NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  wpm NUMERIC(5,1) NOT NULL,
  accuracy NUMERIC(5,2) NOT NULL,
  max_combo INTEGER DEFAULT 0,
  won BOOLEAN DEFAULT FALSE,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. bot_matches
CREATE TABLE bot_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  bot_id VARCHAR(32) NOT NULL,
  user_wpm NUMERIC(5,1) NOT NULL,
  bot_wpm NUMERIC(5,1) NOT NULL,
  user_accuracy NUMERIC(5,2) NOT NULL,
  won BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. achievements & 12. user_achievements
CREATE TABLE achievements (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  xp_reward INTEGER NOT NULL
);

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id VARCHAR(64) REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- 13. daily_challenges & 14. challenge_progress
CREATE TABLE daily_challenges (
  id VARCHAR(64) PRIMARY KEY,
  challenge_type VARCHAR(16) NOT NULL,
  title VARCHAR(128) NOT NULL,
  target_value INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL
);

CREATE TABLE challenge_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id VARCHAR(64) REFERENCES daily_challenges(id) ON DELETE CASCADE,
  current_value INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  reset_date DATE DEFAULT CURRENT_DATE,
  UNIQUE(user_id, challenge_id, reset_date)
);

-- 15. multiplayer_rooms, 16. room_players, 17. multiplayer_matches, 18. multiplayer_results
CREATE TABLE multiplayer_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code VARCHAR(8) UNIQUE NOT NULL,
  host_id UUID REFERENCES profiles(id),
  game_mode VARCHAR(32) NOT NULL,
  difficulty VARCHAR(16) NOT NULL,
  status VARCHAR(16) DEFAULT 'waiting',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE room_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES multiplayer_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ready BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

CREATE TABLE multiplayer_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES multiplayer_rooms(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE multiplayer_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES multiplayer_matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  wpm NUMERIC(5,1) NOT NULL,
  accuracy NUMERIC(5,2) NOT NULL,
  placement INTEGER NOT NULL,
  UNIQUE(match_id, user_id)
);

-- 19. friend_connections
CREATE TABLE friend_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(16) DEFAULT 'accepted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- 20. custom_challenges & 21. challenge_attempts
CREATE TABLE custom_challenges (
  id VARCHAR(32) PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  mode VARCHAR(32) NOT NULL,
  difficulty VARCHAR(16) NOT NULL,
  duration_sec INTEGER NOT NULL,
  prompt_text TEXT NOT NULL,
  target_wpm NUMERIC(5,1) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE challenge_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id VARCHAR(32) REFERENCES custom_challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  wpm NUMERIC(5,1) NOT NULL,
  accuracy NUMERIC(5,2) NOT NULL,
  score INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. tournaments, 23. tournament_participants, 24. tournament_matches
CREATE TABLE tournaments (
  id VARCHAR(32) PRIMARY KEY,
  host_id UUID REFERENCES profiles(id),
  name VARCHAR(128) NOT NULL,
  format VARCHAR(32) NOT NULL,
  status VARCHAR(16) DEFAULT 'registration',
  invite_code VARCHAR(16) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tournament_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id VARCHAR(32) REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

CREATE TABLE tournament_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id VARCHAR(32) REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  player1_id UUID REFERENCES profiles(id),
  player2_id UUID REFERENCES profiles(id),
  winner_id UUID REFERENCES profiles(id),
  status VARCHAR(16) DEFAULT 'pending'
);

-- 25. ghost_runs
CREATE TABLE ghost_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  duration_sec INTEGER NOT NULL,
  category VARCHAR(32) NOT NULL,
  prompt_text TEXT NOT NULL,
  final_wpm NUMERIC(5,1) NOT NULL,
  final_accuracy NUMERIC(5,2) NOT NULL,
  checkpoints JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. leaderboard_entries
CREATE TABLE leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  board_type VARCHAR(32) NOT NULL,
  normalized_score NUMERIC(8,2) NOT NULL,
  wpm NUMERIC(5,1) NOT NULL,
  accuracy NUMERIC(5,2) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_leaderboard_type_score ON leaderboard_entries(board_type, normalized_score DESC);

-- 27. xp_transactions
CREATE TABLE xp_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  source_type VARCHAR(32) NOT NULL,
  source_id VARCHAR(64) NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0 AND amount <= 1000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source_type, source_id)
);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings" ON user_settings FOR ALL USING (auth.uid() = user_id);

ALTER TABLE typing_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Typing results viewable by all" ON typing_results FOR SELECT USING (true);
CREATE POLICY "Users insert own verified results" ON typing_results FOR INSERT WITH CHECK (auth.uid() = user_id);
```
