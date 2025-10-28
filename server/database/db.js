// database/db.js
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path (use environment variable or default)
const dbPath = process.env.SQLITE_PATH || join(__dirname, 'ggg.db');
const schemaPath = join(__dirname, 'schema.sql');

// Initialize database
let db;

export function initDatabase() {
  try {
    // Ensure database directory exists
    const dbDir = dirname(dbPath);
    console.log('🔍 Checking database directory:', dbDir);

    if (!fs.existsSync(dbDir)) {
      console.log('📁 Creating database directory:', dbDir);
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Verify directory is writable
    try {
      fs.accessSync(dbDir, fs.constants.W_OK);
      console.log('✅ Database directory is writable');
    } catch (accessError) {
      console.error('❌ Database directory not writable:', dbDir);
      throw accessError;
    }

    // Create database connection
    console.log('📂 Creating database at:', dbPath);
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    db.pragma('foreign_keys = ON'); // Enable foreign key constraints

    // Read and execute schema
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);

    console.log('✅ SQLite database initialized at:', dbPath);
    return db;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.error('   DB Path:', dbPath);
    console.error('   DB Dir:', dirname(dbPath));
    console.error('   Error:', error.message);
    throw error;
  }
}

// Get database instance
export function getDatabase() {
  if (!db) {
    db = initDatabase();
  }
  return db;
}

// ============================================
// INSERT OPERATIONS
// ============================================

/**
 * Insert a complete log entry with all associated data
 * @param {Object} logData - { games, groups, images, totalPlaying, totalVisits, totalMembers }
 * @returns {number} - The inserted log ID
 */
export function insertLog(logData) {
  const database = getDatabase();

  const insertMainLog = database.prepare(`
    INSERT INTO logs (total_playing, total_visits, total_members)
    VALUES (?, ?, ?)
  `);

  const insertGameLog = database.prepare(`
    INSERT INTO game_logs (log_id, universe_id, name, playing, visits, favorites, likes, max_players, created, updated, is_playable, genre, price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertGroupLog = database.prepare(`
    INSERT INTO group_logs (log_id, group_id, name, member_count, description)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertGameImage = database.prepare(`
    INSERT INTO game_images (log_id, universe_id, image_url, state)
    VALUES (?, ?, ?, ?)
  `);

  const insertRevenueLog = database.prepare(`
    INSERT INTO revenue_logs (log_id, universe_id, daily_revenue, hourly_revenue, cumulative_revenue, currency)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Use transaction for atomicity
  const insertAll = database.transaction((data) => {
    // 1. Insert main log
    const result = insertMainLog.run(
      data.totalPlaying || 0,
      data.totalVisits || 0,
      data.totalMembers || 0
    );
    const logId = result.lastInsertRowid;

    // 2. Insert game logs
    if (data.games && Array.isArray(data.games)) {
      data.games.forEach(game => {
        insertGameLog.run(
          logId,
          game.universeId,
          game.name,
          game.playing || 0,
          game.visits || 0,
          game.favorites || 0,
          game.likes || 0,
          game.maxPlayers || 0,
          game.created || null,
          game.updated || null,
          game.isPlayable !== false ? 1 : 0,
          game.genre || null,
          game.price || 0
        );
      });
    }

    // 3. Insert group logs
    if (data.groups && Array.isArray(data.groups)) {
      data.groups.forEach(group => {
        insertGroupLog.run(
          logId,
          group.id,
          group.name || 'Group',
          group.groupDetails?.memberCount || 0,
          group.groupDetails?.description || null
        );
      });
    }

    // 4. Insert game images
    if (data.images && Array.isArray(data.images)) {
      data.images.forEach(imageData => {
        if (imageData.media && Array.isArray(imageData.media)) {
          imageData.media.forEach(media => {
            insertGameImage.run(
              logId,
              imageData.id,
              media.imageUrl || null,
              media.state || null
            );
          });
        }
      });
    }

    // 5. Insert revenue logs (placeholder calculation)
    if (data.games && Array.isArray(data.games)) {
      data.games.forEach(game => {
        const hourlyRevenue = game.playing || 0; // Placeholder: current players = CAD revenue
        const dailyRevenue = calculateDailyRevenue(database, game.universeId, hourlyRevenue);
        const cumulativeRevenue = calculateCumulativeRevenue(database, game.universeId, dailyRevenue);

        insertRevenueLog.run(
          logId,
          game.universeId,
          dailyRevenue,
          hourlyRevenue,
          cumulativeRevenue,
          'CAD'
        );
      });
    }

    return logId;
  });

  return insertAll(logData);
}

// ============================================
// QUERY OPERATIONS
// ============================================

/**
 * Get the latest log entry with all associated data
 * @returns {Object|null}
 */
export function getLatestLog() {
  const database = getDatabase();

  const latestLog = database.prepare(`
    SELECT * FROM logs ORDER BY timestamp DESC LIMIT 1
  `).get();

  if (!latestLog) return null;

  return assembleLogData(latestLog.id);
}

/**
 * Get logs within a date range
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {Array}
 */
export function getLogsByDateRange(startDate, endDate) {
  const database = getDatabase();

  const logs = database.prepare(`
    SELECT * FROM logs
    WHERE timestamp BETWEEN ? AND ?
    ORDER BY timestamp DESC
  `).all(startDate, endDate);

  return logs.map(log => assembleLogData(log.id));
}

/**
 * Get recent logs (default: 50)
 * @param {number} limit
 * @returns {Array}
 */
export function getRecentLogs(limit = 50) {
  const database = getDatabase();

  const logs = database.prepare(`
    SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?
  `).all(limit);

  return logs.map(log => assembleLogData(log.id));
}

/**
 * Get game statistics for a specific game
 * @param {number} universeId
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Array}
 */
export function getGameStats(universeId, startDate, endDate) {
  const database = getDatabase();

  return database.prepare(`
    SELECT
      l.timestamp,
      g.playing,
      g.visits,
      g.max_players,
      g.is_playable
    FROM logs l
    JOIN game_logs g ON l.id = g.log_id
    WHERE g.universe_id = ?
      AND l.timestamp BETWEEN ? AND ?
    ORDER BY l.timestamp ASC
  `).all(universeId, startDate, endDate);
}

/**
 * Get group statistics for a specific group
 * @param {number} groupId
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Array}
 */
export function getGroupStats(groupId, startDate, endDate) {
  const database = getDatabase();

  return database.prepare(`
    SELECT
      l.timestamp,
      gr.member_count,
      gr.name
    FROM logs l
    JOIN group_logs gr ON l.id = gr.log_id
    WHERE gr.group_id = ?
      AND l.timestamp BETWEEN ? AND ?
    ORDER BY l.timestamp ASC
  `).all(groupId, startDate, endDate);
}

/**
 * Get revenue data for a specific game
 * @param {number} universeId
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Array}
 */
export function getRevenueStats(universeId, startDate, endDate) {
  const database = getDatabase();

  return database.prepare(`
    SELECT
      recorded_at as timestamp,
      daily_revenue,
      hourly_revenue,
      cumulative_revenue,
      currency
    FROM revenue_logs
    WHERE universe_id = ?
      AND recorded_at BETWEEN ? AND ?
    ORDER BY recorded_at ASC
  `).all(universeId, startDate, endDate);
}

/**
 * Get list of all games
 * @returns {Array}
 */
export function getAllGames() {
  const database = getDatabase();

  return database.prepare(`
    SELECT DISTINCT universe_id as id, name
    FROM game_logs
    ORDER BY name ASC
  `).all();
}

/**
 * Get list of all groups
 * @returns {Array}
 */
export function getAllGroups() {
  const database = getDatabase();

  return database.prepare(`
    SELECT DISTINCT group_id as id, name
    FROM group_logs
    WHERE name IS NOT NULL
    ORDER BY name ASC
  `).all();
}

// ============================================
// ADMIN OPERATIONS
// ============================================

/**
 * Get admin user by username
 * @param {string} username
 * @returns {Object|null}
 */
export function getAdminUser(username) {
  const database = getDatabase();

  return database.prepare(`
    SELECT * FROM admin_users WHERE username = ?
  `).get(username);
}

/**
 * Update admin last login timestamp
 * @param {string} username
 */
export function updateAdminLastLogin(username) {
  const database = getDatabase();

  database.prepare(`
    UPDATE admin_users
    SET last_login = CURRENT_TIMESTAMP
    WHERE username = ?
  `).run(username);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Assemble complete log data from log ID
 * @param {number} logId
 * @returns {Object}
 */
function assembleLogData(logId) {
  const database = getDatabase();

  const mainLog = database.prepare(`
    SELECT * FROM logs WHERE id = ?
  `).get(logId);

  const games = database.prepare(`
    SELECT * FROM game_logs WHERE log_id = ?
  `).all(logId);

  const groups = database.prepare(`
    SELECT * FROM group_logs WHERE log_id = ?
  `).all(logId);

  const images = database.prepare(`
    SELECT universe_id as id, image_url as imageUrl, state
    FROM game_images WHERE log_id = ?
  `).all(logId);

  // Group images by universe_id
  const imagesByGame = {};
  images.forEach(img => {
    if (!imagesByGame[img.id]) {
      imagesByGame[img.id] = { id: img.id, media: [] };
    }
    if (img.imageUrl) {
      imagesByGame[img.id].media.push({ imageUrl: img.imageUrl, state: img.state });
    }
  });

  // Format games to match old MongoDB structure
  const formattedGames = games.map(g => ({
    universeId: g.universe_id,
    name: g.name,
    playing: g.playing,
    visits: g.visits,
    favorites: g.favorites || 0,
    likes: g.likes || 0,
    maxPlayers: g.max_players,
    created: g.created,
    updated: g.updated,
    isPlayable: g.is_playable === 1,
    genre: g.genre,
    price: g.price
  }));

  // Format groups to match old MongoDB structure
  const formattedGroups = groups.map(g => ({
    id: g.group_id,
    name: g.name,
    groupDetails: {
      memberCount: g.member_count,
      description: g.description
    }
  }));

  return {
    timestamp: mainLog.timestamp,
    games: formattedGames,
    groups: formattedGroups,
    images: Object.values(imagesByGame),
    totalPlaying: mainLog.total_playing,
    totalVisits: mainLog.total_visits,
    totalMembers: mainLog.total_members
  };
}

/**
 * Calculate daily revenue (average of today's hourly revenues)
 * @param {Database} database
 * @param {number} universeId
 * @param {number} currentHourlyRevenue
 * @returns {number}
 */
function calculateDailyRevenue(database, universeId, currentHourlyRevenue) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const todaysRevenues = database.prepare(`
    SELECT AVG(hourly_revenue) as avg_revenue
    FROM revenue_logs
    WHERE universe_id = ?
      AND DATE(recorded_at) = ?
  `).get(universeId, today);

  // If no data for today yet, use current hourly
  if (!todaysRevenues || todaysRevenues.avg_revenue === null) {
    return currentHourlyRevenue;
  }

  // Return average including current hour
  return todaysRevenues.avg_revenue;
}

/**
 * Calculate cumulative revenue (sum of all daily revenues)
 * @param {Database} database
 * @param {number} universeId
 * @param {number} todaysDailyRevenue
 * @returns {number}
 */
function calculateCumulativeRevenue(database, universeId, todaysDailyRevenue) {
  const totalRevenue = database.prepare(`
    SELECT SUM(daily_revenue) as total
    FROM revenue_logs
    WHERE universe_id = ?
  `).get(universeId);

  const previousTotal = totalRevenue?.total || 0;
  return previousTotal + todaysDailyRevenue;
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (db) {
    db.close();
    console.log('✅ Database connection closed');
  }
}

// Export default instance
export default {
  initDatabase,
  getDatabase,
  insertLog,
  getLatestLog,
  getLogsByDateRange,
  getRecentLogs,
  getGameStats,
  getGroupStats,
  getRevenueStats,
  getAllGames,
  getAllGroups,
  getAdminUser,
  updateAdminLastLogin,
  closeDatabase
};
