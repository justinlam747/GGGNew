/**
 * Initialize CMS from details.js
 * One-time migration script to populate cms_games and cms_groups
 */

import axios from 'axios';
import db from '../database/db.js';
import { details, groupDetails } from '../details.js';

const API_BASE = 'http://localhost:5001';

async function fetchGroupInfo(groupId) {
  try {
    const response = await axios.get(`https://groups.roblox.com/v1/groups/${groupId}`);
    return {
      name: response.data.name || `Group ${groupId}`,
      owner_username: response.data.owner?.username || null,
      description: response.data.description || null
    };
  } catch (error) {
    console.error(`Failed to fetch info for group ${groupId}:`, error.message);
    return {
      name: `Group ${groupId}`,
      owner_username: null,
      description: null
    };
  }
}

async function fetchGameThumbnail(universeId) {
  try {
    const response = await axios.get(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=Png&isCircular=false`);
    if (response.data.data && response.data.data.length > 0) {
      return response.data.data[0].imageUrl || null;
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch thumbnail for game ${universeId}:`, error.message);
    return null;
  }
}

async function populateGames() {
  console.log('\n📦 Populating CMS Games...');
  const database = db.getDatabase();

  for (const game of details) {
    try {
      // Check if game already exists
      const existing = database.prepare('SELECT * FROM cms_games WHERE universe_id = ?').get(game.id);

      // Fetch thumbnail
      console.log(`  Fetching thumbnail for ${game.name}...`);
      const thumbnail_url = await fetchGameThumbnail(game.id);

      if (existing) {
        // Update existing game
        const updateStmt = database.prepare(`
          UPDATE cms_games
          SET name = ?, is_active = ?, thumbnail_url = ?, updated_at = CURRENT_TIMESTAMP
          WHERE universe_id = ?
        `);

        updateStmt.run(game.name, game.show ? 1 : 0, thumbnail_url, game.id);
        console.log(`  ✅ Updated game: ${game.name} (${game.id})`);
      } else {
        // Insert new game
        const insertStmt = database.prepare(`
          INSERT INTO cms_games (universe_id, name, is_active, thumbnail_url, display_order)
          VALUES (?, ?, ?, ?, ?)
        `);

        // display_order will be updated later based on player count
        insertStmt.run(game.id, game.name, game.show ? 1 : 0, thumbnail_url, 0);
        console.log(`  ✅ Added game: ${game.name} (${game.id})`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`  ❌ Error processing game ${game.name}:`, error.message);
    }
  }

  console.log(`\n✅ Finished populating ${details.length} games`);
}

async function populateGroups() {
  console.log('\n📦 Populating CMS Groups...');
  const database = db.getDatabase();

  for (const group of groupDetails) {
    try {
      // Check if group already exists
      const existing = database.prepare('SELECT * FROM cms_groups WHERE group_id = ?').get(group.id);

      // Fetch group info from Roblox API
      console.log(`  Fetching info for Group ${group.id}...`);
      const groupInfo = await fetchGroupInfo(group.id);

      if (existing) {
        // Update existing group
        const updateStmt = database.prepare(`
          UPDATE cms_groups
          SET name = ?, owner_username = ?, description = ?, updated_at = CURRENT_TIMESTAMP
          WHERE group_id = ?
        `);

        updateStmt.run(groupInfo.name, groupInfo.owner_username, groupInfo.description, group.id);
        console.log(`  ✅ Updated group: ${groupInfo.name} (${group.id})`);
      } else {
        // Insert new group
        const insertStmt = database.prepare(`
          INSERT INTO cms_groups (group_id, name, owner_username, description, is_active)
          VALUES (?, ?, ?, ?, ?)
        `);

        insertStmt.run(group.id, groupInfo.name, groupInfo.owner_username, groupInfo.description, 1);
        console.log(`  ✅ Added group: ${groupInfo.name} (${group.id}) - Owner: ${groupInfo.owner_username || 'N/A'}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`  ❌ Error processing group ${group.id}:`, error.message);
    }
  }

  console.log(`\n✅ Finished populating ${groupDetails.length} groups`);
}

async function main() {
  try {
    console.log('🚀 Starting CMS initialization from details.js...\n');

    // Initialize database
    db.initDatabase();

    // Populate games and groups
    await populateGames();
    await populateGroups();

    console.log('\n🎉 CMS initialization complete!\n');
    console.log('📋 Summary:');
    console.log(`   - Games populated: ${details.length}`);
    console.log(`   - Groups populated: ${groupDetails.length}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Restart the server to use CMS data');
    console.log('   2. Visit admin dashboard to manage games and groups');
    console.log('   3. Display order will auto-update based on player count\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during CMS initialization:', error);
    process.exit(1);
  }
}

main();
