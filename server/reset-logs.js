// reset-logs.js
// Script to reset all analytics logs while preserving CMS data and admin users

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path (same logic as db.js)
const dbPath = process.env.SQLITE_PATH || join(__dirname, 'database', 'ggg.db');

console.log('🗄️  Database path:', dbPath);

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error('❌ Database file not found at:', dbPath);
  console.error('   Make sure the database has been initialized first.');
  process.exit(1);
}

try {
  // Connect to database
  const db = new Database(dbPath);
  console.log('✅ Connected to database');

  // Get current counts before deletion
  const logCount = db.prepare('SELECT COUNT(*) as count FROM logs').get();
  const gameLogCount = db.prepare('SELECT COUNT(*) as count FROM game_logs').get();
  const groupLogCount = db.prepare('SELECT COUNT(*) as count FROM group_logs').get();
  const hourlyStatsCount = db.prepare('SELECT COUNT(*) as count FROM hourly_stats').get();
  const dailySnapshotsCount = db.prepare('SELECT COUNT(*) as count FROM daily_snapshots').get();
  const revenueCount = db.prepare('SELECT COUNT(*) as count FROM revenue_logs').get();

  console.log('\n📊 Current database state:');
  console.log(`   Logs: ${logCount.count}`);
  console.log(`   Game logs: ${gameLogCount.count}`);
  console.log(`   Group logs: ${groupLogCount.count}`);
  console.log(`   Hourly stats: ${hourlyStatsCount.count}`);
  console.log(`   Daily snapshots: ${dailySnapshotsCount.count}`);
  console.log(`   Revenue logs: ${revenueCount.count}`);

  // Confirm deletion
  console.log('\n⚠️  This will DELETE all analytics logs while preserving:');
  console.log('   ✓ CMS games and groups');
  console.log('   ✓ Admin users');
  console.log('   ✓ CMS content and settings');
  console.log('   ✓ Audit logs');

  // Delete all log data in transaction
  const resetLogs = db.transaction(() => {
    db.prepare('DELETE FROM game_images').run();
    db.prepare('DELETE FROM revenue_logs').run();
    db.prepare('DELETE FROM game_logs').run();
    db.prepare('DELETE FROM group_logs').run();
    db.prepare('DELETE FROM hourly_stats').run();
    db.prepare('DELETE FROM daily_snapshots').run();
    db.prepare('DELETE FROM logs').run();
  });

  console.log('\n🔄 Deleting all logs...');
  resetLogs();

  console.log('✅ All analytics logs deleted successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. Restart your server (if running)');
  console.log('   2. Fresh data will be logged in 5 seconds after server starts');
  console.log('   3. New logs will continue every 15 minutes');

  // Close database
  db.close();
  console.log('\n✅ Database connection closed');

} catch (error) {
  console.error('❌ Error resetting database:', error.message);
  process.exit(1);
}
