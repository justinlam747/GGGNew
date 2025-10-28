-- GGG Analytics Database Schema
-- SQLite3 Database for storing Roblox game analytics

-- NEW: Hourly stats table for detailed game tracking
CREATE TABLE IF NOT EXISTS hourly_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  universe_id INTEGER NOT NULL,
  game_name TEXT NOT NULL,
  timestamp DATETIME NOT NULL,
  visits INTEGER DEFAULT 0,
  playing INTEGER DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(game_id, timestamp)
);

-- NEW: Daily snapshots for day-over-day comparisons
CREATE TABLE IF NOT EXISTS daily_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL, -- 'game' or 'group'
  entity_id INTEGER NOT NULL,
  entity_name TEXT NOT NULL,
  date DATE NOT NULL,
  visits INTEGER DEFAULT 0,
  playing INTEGER DEFAULT 0,
  members INTEGER DEFAULT 0,
  favourites INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity_type, entity_id, date)
);

-- Main logs table (one row per hourly fetch from Roblox API)
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_playing INTEGER NOT NULL DEFAULT 0,
  total_visits INTEGER NOT NULL DEFAULT 0,
  total_members INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Game statistics (9 rows per log, one for each game)
CREATE TABLE IF NOT EXISTS game_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_id INTEGER NOT NULL,
  universe_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  playing INTEGER DEFAULT 0,
  visits INTEGER DEFAULT 0,
  favorites INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  max_players INTEGER DEFAULT 0,
  created DATETIME,
  updated DATETIME,
  is_playable BOOLEAN DEFAULT 1,
  genre TEXT,
  price INTEGER DEFAULT 0,
  FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE
);

-- Group statistics (4 rows per log, one for each group)
CREATE TABLE IF NOT EXISTS group_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_id INTEGER NOT NULL,
  group_id INTEGER NOT NULL,
  name TEXT,
  member_count INTEGER DEFAULT 0,
  description TEXT,
  FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE
);

-- Game images/thumbnails
CREATE TABLE IF NOT EXISTS game_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_id INTEGER NOT NULL,
  universe_id INTEGER NOT NULL,
  image_url TEXT,
  state TEXT,
  FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE
);

-- Revenue tracking (PLACEHOLDER: avg players = CAD revenue)
CREATE TABLE IF NOT EXISTS revenue_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_id INTEGER NOT NULL,
  universe_id INTEGER NOT NULL,
  daily_revenue REAL NOT NULL,          -- Daily average
  hourly_revenue REAL NOT NULL,         -- Hourly snapshot
  cumulative_revenue REAL NOT NULL,     -- Running total
  currency TEXT DEFAULT 'CAD',
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_hourly_timestamp ON hourly_stats(timestamp);
CREATE INDEX IF NOT EXISTS idx_hourly_game ON hourly_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_hourly_universe ON hourly_stats(universe_id);
CREATE INDEX IF NOT EXISTS idx_daily_entity ON daily_snapshots(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_snapshots(date DESC);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_game_logs_universe ON game_logs(universe_id);
CREATE INDEX IF NOT EXISTS idx_game_logs_log_id ON game_logs(log_id);
CREATE INDEX IF NOT EXISTS idx_group_logs_group ON group_logs(group_id);
CREATE INDEX IF NOT EXISTS idx_group_logs_log_id ON group_logs(log_id);
CREATE INDEX IF NOT EXISTS idx_revenue_universe ON revenue_logs(universe_id);
CREATE INDEX IF NOT EXISTS idx_revenue_recorded ON revenue_logs(recorded_at DESC);

-- CMS Games table
CREATE TABLE IF NOT EXISTS cms_games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    universe_id INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    is_featured BOOLEAN DEFAULT 0,
    thumbnail_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CMS Groups table
CREATE TABLE IF NOT EXISTS cms_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    owner_username TEXT,
    thumbnail_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CMS Content table
CREATE TABLE IF NOT EXISTS cms_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    metadata TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CMS Settings table
CREATE TABLE IF NOT EXISTS cms_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CMS Audit Logs table
CREATE TABLE IF NOT EXISTS cms_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    entity_name TEXT,
    changes_summary TEXT,
    changes_detail TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    archived BOOLEAN DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

-- CMS Audit Logs Archive table
CREATE TABLE IF NOT EXISTS cms_audit_logs_archive (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    entity_name TEXT,
    changes_summary TEXT,
    changes_detail TEXT,
    timestamp DATETIME,
    original_id INTEGER
);

-- CMS indexes
CREATE INDEX IF NOT EXISTS idx_cms_games_active ON cms_games(is_active);
CREATE INDEX IF NOT EXISTS idx_cms_games_order ON cms_games(display_order);
CREATE INDEX IF NOT EXISTS idx_cms_groups_active ON cms_groups(is_active);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON cms_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON cms_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON cms_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_archived ON cms_audit_logs(archived);
CREATE INDEX IF NOT EXISTS idx_audit_archive_timestamp ON cms_audit_logs_archive(timestamp DESC);

-- Insert default admin user (username: admin, password: admin123)
-- Password hash generated with: bcrypt.hashSync('admin123', 10)
INSERT OR IGNORE INTO admin_users (username, password_hash) VALUES
  ('admin', '$2b$10$LsdGG5fEzzuKm6yklBiIMOyNNg7791FG7MG45/WpK.8wbvNzh1PS.');
