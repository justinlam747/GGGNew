/**
 * Public API Routes
 * No authentication required - serves landing page data from CMS
 */

import express from 'express';
import axios from 'axios';
import db from '../database/db.js';

const router = express.Router();

/**
 * GET /api/public/landing-data
 * Get all active games and groups from CMS with cached Roblox stats
 * Uses analytics cache (updated every 5 minutes) to prevent rate limiting
 */
router.get('/landing-data', async (req, res) => {
  try {
    const database = db.getDatabase();

    // Get active games and groups from CMS
    const cmsGames = database.prepare('SELECT * FROM cms_games WHERE is_active = 1 ORDER BY display_order ASC').all();
    const cmsGroups = database.prepare('SELECT * FROM cms_groups WHERE is_active = 1').all();

    // Get latest analytics log from database (updated every 5 minutes by cron job)
    const latestLog = db.getLatestLog();

    if (!latestLog) {
      return res.status(503).json({
        error: 'No analytics data available yet',
        message: 'Please wait for the first data fetch to complete'
      });
    }

    // Filter analytics data to only include active games from CMS
    const activeGameIds = new Set(cmsGames.map(g => g.universe_id));
    const activeGroupIds = new Set(cmsGroups.map(g => g.group_id));

    const gameData = (latestLog.games || [])
      .filter(game => activeGameIds.has(game.universeId))
      .map(game => {
        const cmsGame = cmsGames.find(g => g.universe_id === game.universeId);
        return {
          universeId: game.universeId,
          name: game.name,
          description: cmsGame?.description || null,
          playing: game.playing || 0,
          visits: game.visits || 0,
          maxPlayers: game.maxPlayers || 0,
          created: game.created || null,
          updated: game.updated || null,
          rootPlaceId: game.rootPlaceId || null,
          isFeatured: cmsGame?.is_featured === 1,
          displayOrder: cmsGame?.display_order || 0
        };
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const groupData = (latestLog.groups || [])
      .filter(group => activeGroupIds.has(group.id))
      .map(group => ({
        id: group.id,
        name: group.name,
        description: group.description,
        groupDetails: group.groupDetails
      }));

    const gameImages = (latestLog.images || [])
      .filter(img => activeGameIds.has(img.id))
      .map(img => ({
        id: img.id,
        name: img.name,
        media: img.media || []
      }));

    // Calculate totals
    const totalPlaying = gameData.reduce((sum, g) => sum + (g.playing || 0), 0);
    const totalVisits = gameData.reduce((sum, g) => sum + (g.visits || 0), 0);
    const totalMembers = groupData.reduce((sum, g) => sum + (g.groupDetails?.memberCount || 0), 0);

    res.json({
      gameData,
      groupData,
      gameImages,
      totalData: {
        totalPlaying,
        totalVisits,
        totalMembers
      },
      timestamp: latestLog.timestamp,
      source: 'cms-cached',
      cacheAge: Date.now() - new Date(latestLog.timestamp).getTime()
    });

  } catch (error) {
    console.error('❌ Error fetching landing page data:', error);
    res.status(500).json({
      error: 'Failed to fetch landing page data',
      message: error.message
    });
  }
});

/**
 * GET /api/public/games
 * Get all active games from CMS (metadata only, no live stats)
 */
router.get('/games', (req, res) => {
  try {
    const database = db.getDatabase();
    const games = database.prepare('SELECT * FROM cms_games WHERE is_active = 1 ORDER BY display_order ASC').all();

    res.json({
      success: true,
      data: games,
      count: games.length
    });
  } catch (error) {
    console.error('Error fetching public games:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch games'
    });
  }
});

/**
 * GET /api/public/groups
 * Get all active groups from CMS (metadata only, no live stats)
 */
router.get('/groups', (req, res) => {
  try {
    const database = db.getDatabase();
    const groups = database.prepare('SELECT * FROM cms_groups WHERE is_active = 1').all();

    res.json({
      success: true,
      data: groups,
      count: groups.length
    });
  } catch (error) {
    console.error('Error fetching public groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch groups'
    });
  }
});

export default router;
