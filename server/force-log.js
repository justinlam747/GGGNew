// force-log.js
// Script to force an immediate database log entry
// Run with: node server/force-log.js

import axios from 'axios';
import db from './database/db.js';
import { details, groupDetails } from './details.js';

console.log('🚀 Force Log Script - Manual Database Entry\n');

// Sleep utility
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (url, retries = 3) => {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'GGGBackend/1.0',
        'Accept': 'application/json'
      }
    });
    return response;
  } catch (err) {
    if (err.response?.status === 429 && retries > 0) {
      const delay = Math.pow(2, 3 - retries) * 1000;
      console.warn(`⏳ Rate limited. Retrying in ${delay}ms...`);
      await sleep(delay);
      return fetchWithRetry(url, retries - 1);
    } else if (err.response?.status >= 500 && retries > 0) {
      console.warn(`⚠️ Server error ${err.response.status}. Retrying...`);
      await sleep(2000);
      return fetchWithRetry(url, retries - 1);
    } else {
      throw err;
    }
  }
};

const fetchConcurrentWithLimit = async (urls, maxConcurrent = 2) => {
  const results = [];
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    const batch = urls.slice(i, i + maxConcurrent);
    const batchPromises = batch.map(async ({ url, processor }) => {
      try {
        const response = await fetchWithRetry(url);
        return processor ? processor(response) : response;
      } catch (err) {
        console.warn(`⚠️ Fetch failed for ${url}:`, err.message);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(Boolean));

    if (i + maxConcurrent < urls.length) {
      await sleep(2000);
    }
  }
  return results;
};

const forceFetchAndLog = async () => {
  try {
    console.log('🔄 Fetching fresh data from Roblox APIs...\n');

    // Initialize database
    db.initDatabase();
    const database = db.getDatabase();

    // Get active games and groups from CMS
    const cmsGames = database.prepare('SELECT * FROM cms_games WHERE is_active = 1 ORDER BY display_order ASC').all();
    const cmsGroups = database.prepare('SELECT * FROM cms_groups WHERE is_active = 1').all();

    console.log(`📊 Fetching data for ${cmsGames.length} games and ${cmsGroups.length} groups\n`);

    // Prepare fetch requests
    const gameUrls = cmsGames.map(game => ({
      url: `https://games.roblox.com/v1/games?universeIds=${game.universe_id}`,
      processor: (response) => ({
        universeId: game.universe_id,
        name: game.name,
        ...(response.data.data[0] || {})
      })
    }));

    const groupUrls = cmsGroups.map(group => ({
      url: `https://groups.roblox.com/v1/groups/${group.group_id}`,
      processor: (response) => ({
        id: group.group_id,
        name: group.name,
        groupDetails: response.data || {}
      })
    }));

    const imageUrls = cmsGames.map(game => ({
      url: `https://thumbnails.roblox.com/v1/games/icons?universeIds=${game.universe_id}&size=512x512&format=Png&isCircular=false`,
      processor: (response) => ({
        id: game.universe_id,
        name: game.name,
        media: response.data.data || (game.thumbnail_url ? [{ imageUrl: game.thumbnail_url }] : [])
      })
    }));

    const votesUrls = cmsGames.map(game => ({
      url: `https://games.roblox.com/v1/games/votes?universeIds=${game.universe_id}`,
      processor: (response) => ({
        universeId: game.universe_id,
        upVotes: response.data.data?.[0]?.upVotes || 0,
        downVotes: response.data.data?.[0]?.downVotes || 0
      })
    }));

    // Fetch all data
    console.log('⏳ Fetching game data...');
    const gameResults = await fetchConcurrentWithLimit(gameUrls, 2);
    console.log('⏳ Fetching group data...');
    const groupResults = await fetchConcurrentWithLimit(groupUrls, 2);
    console.log('⏳ Fetching images...');
    const imageResults = await fetchConcurrentWithLimit(imageUrls, 2);
    console.log('⏳ Fetching votes...');
    const votesResults = await fetchConcurrentWithLimit(votesUrls, 2);

    // Merge votes with games
    const gamesWithVotes = gameResults.map(game => {
      const votesData = votesResults.find(v => v.universeId === game.universeId);
      return {
        ...game,
        favorites: game.favoritedCount || 0,
        likes: votesData?.upVotes || 0
      };
    });

    // Calculate totals
    const totalPlaying = gamesWithVotes.reduce((sum, g) => sum + (g?.playing || 0), 0);
    const totalVisits = gamesWithVotes.reduce((sum, g) => sum + (g?.visits || 0), 0);
    const totalMembers = groupResults.reduce((sum, g) => sum + (g?.groupDetails?.memberCount || 0), 0);

    const logData = {
      timestamp: new Date(),
      games: gamesWithVotes.length > 0 ? gamesWithVotes : cmsGames.map(game => ({
        universeId: game.universe_id,
        name: game.name,
        playing: 0,
        visits: 0,
        favorites: 0,
        likes: 0
      })),
      groups: groupResults.length > 0 ? groupResults : cmsGroups.map(group => ({
        id: group.group_id,
        name: group.name,
        groupDetails: { memberCount: 0 }
      })),
      images: imageResults.length > 0 ? imageResults : cmsGames.map(game => ({
        id: game.universe_id,
        name: game.name,
        media: game.thumbnail_url ? [{ imageUrl: game.thumbnail_url }] : []
      })),
      totalPlaying,
      totalVisits,
      totalMembers,
    };

    console.log('\n📊 Data Summary:');
    console.log(`   Total Playing: ${totalPlaying.toLocaleString()}`);
    console.log(`   Total Visits: ${totalVisits.toLocaleString()}`);
    console.log(`   Total Members: ${totalMembers.toLocaleString()}`);
    console.log(`   Games fetched: ${gamesWithVotes.length}`);
    console.log(`   Groups fetched: ${groupResults.length}`);

    // Save to database
    console.log('\n💾 Saving to database...');
    db.insertLog(logData);

    console.log('✅ Log entry created successfully!');
    console.log(`📅 Timestamp: ${logData.timestamp.toLocaleString()}\n`);

    // Show recent log count
    const recentLogs = database.prepare('SELECT COUNT(*) as count FROM logs').get();
    console.log(`📈 Total logs in database: ${recentLogs.count}`);

    db.closeDatabase();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error creating log entry:', error.message);
    db.closeDatabase();
    process.exit(1);
  }
};

// Run the force log
forceFetchAndLog();
