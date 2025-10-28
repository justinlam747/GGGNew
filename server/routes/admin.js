// routes/admin.js
// Admin dashboard API routes

import express from 'express';
import bcrypt from 'bcrypt';
import db from '../database/db.js';
import { requireAuth, redirectIfAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// AUTHENTICATION ROUTES
// ============================================

/**
 * POST /admin/login
 * Login with username and password
 */
router.post('/login', redirectIfAuthenticated, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Get admin user from database
    const user = db.getAdminUser(username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Compare password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Update last login
    db.updateAdminLastLogin(username);

    // Set session
    req.session.isAuthenticated = true;
    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /admin/logout
 * Logout and destroy session
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

/**
 * GET /admin/me
 * Get current user info
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({
    id: req.session.userId,
    username: req.session.username
  });
});

// ============================================
// ANALYTICS ROUTES (Protected)
// ============================================

/**
 * GET /admin/analytics/overview
 * Get dashboard overview data
 */
router.get('/analytics/overview', requireAuth, (req, res) => {
  try {
    const latest = db.getLatestLog();
    const last24h = db.getRecentLogs(24);

    if (!latest) {
      return res.status(404).json({ error: 'No data available' });
    }

    // Calculate 24h changes
    const old24h = last24h[last24h.length - 1] || latest;
    const playingChange = latest.totalPlaying - old24h.totalPlaying;
    const visitsChange = latest.totalVisits - old24h.totalVisits;
    const membersChange = latest.totalMembers - old24h.totalMembers;

    res.json({
      current: {
        totalPlaying: latest.totalPlaying,
        totalVisits: latest.totalVisits,
        totalMembers: latest.totalMembers,
        timestamp: latest.timestamp
      },
      changes24h: {
        playing: playingChange,
        visits: visitsChange,
        members: membersChange
      },
      topGames: latest.games
        .sort((a, b) => b.playing - a.playing)
        .map(g => ({
          id: g.universeId,
          name: g.name,
          playing: g.playing,
          visits: g.visits,
          favorites: g.favorites || 0,
          likes: g.likes || 0
        })),
      groups: latest.groups.map(g => ({
        id: g.id,
        name: g.name,
        member_count: g.groupDetails?.memberCount || 0
      }))
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin/analytics/games
 * Get all games analytics
 */
router.get('/analytics/games', requireAuth, (req, res) => {
  try {
    const { startDate, endDate, universeId } = req.query;

    if (universeId) {
      // Get specific game stats
      const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const end = endDate || new Date().toISOString();
      const stats = db.getGameStats(parseInt(universeId), start, end);
      return res.json(stats);
    }

    // Get all games from latest log
    const latest = db.getLatestLog();
    if (!latest) {
      return res.status(404).json({ error: 'No data available' });
    }

    res.json(latest.games);
  } catch (error) {
    console.error('Games analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin/analytics/groups
 * Get all groups analytics
 */
router.get('/analytics/groups', requireAuth, (req, res) => {
  try {
    const { startDate, endDate, groupId } = req.query;

    if (groupId) {
      // Get specific group stats
      const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const end = endDate || new Date().toISOString();
      const stats = db.getGroupStats(parseInt(groupId), start, end);
      return res.json(stats);
    }

    // Get all groups from latest log
    const latest = db.getLatestLog();
    if (!latest) {
      return res.status(404).json({ error: 'No data available' });
    }

    res.json(latest.groups);
  } catch (error) {
    console.error('Groups analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin/analytics/revenue
 * Get revenue analytics for a game
 */
router.get('/analytics/revenue', requireAuth, (req, res) => {
  try {
    const { universeId, startDate, endDate } = req.query;

    if (!universeId) {
      return res.status(400).json({ error: 'universeId is required' });
    }

    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date().toISOString();

    const stats = db.getRevenueStats(parseInt(universeId), start, end);
    res.json(stats);
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin/analytics/history
 * Get historical data for charts
 */
router.get('/analytics/history', requireAuth, (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const logs = db.getRecentLogs(parseInt(hours));

    const history = logs.map(log => {
      // Aggregate favorites and likes from all games in this log
      const totalFavorites = log.games?.reduce((sum, g) => sum + (g.favorites || 0), 0) || 0;
      const totalLikes = log.games?.reduce((sum, g) => sum + (g.likes || 0), 0) || 0;

      return {
        timestamp: log.timestamp,
        playing: log.totalPlaying,
        visits: log.totalVisits,
        favorites: totalFavorites,
        likes: totalLikes,
        members: log.totalMembers
      };
    }).reverse(); // Reverse to show oldest first

    res.json(history);
  } catch (error) {
    console.error('History analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin/analytics/export
 * Export data as CSV
 */
router.get('/analytics/export', requireAuth, (req, res) => {
  try {
    const { type = 'games', startDate, endDate } = req.query;

    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date().toISOString();
    const logs = db.getLogsByDateRange(start, end);

    let csv = '';

    if (type === 'games') {
      // Export games data
      csv = 'Timestamp,Game Name,Universe ID,Players,Visits,Max Players\n';
      logs.forEach(log => {
        log.games.forEach(game => {
          csv += `${log.timestamp},${game.name},${game.universeId},${game.playing},${game.visits},${game.maxPlayers}\n`;
        });
      });
    } else if (type === 'groups') {
      // Export groups data
      csv = 'Timestamp,Group Name,Group ID,Members\n';
      logs.forEach(log => {
        log.groups.forEach(group => {
          csv += `${log.timestamp},${group.name},${group.id},${group.groupDetails.memberCount}\n`;
        });
      });
    } else if (type === 'overview') {
      // Export overview data
      csv = 'Timestamp,Total Playing,Total Visits,Total Members\n';
      logs.forEach(log => {
        csv += `${log.timestamp},${log.totalPlaying},${log.totalVisits},${log.totalMembers}\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ggg-analytics-${type}-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
