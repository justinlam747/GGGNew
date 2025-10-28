/**
 * CMS API Routes
 * Manage games, groups, content, and settings
 */

import express from 'express';
import db from '../database/db.js';
import { requireAuth, attachUser } from '../middleware/auth.js';
import {
  logAudit,
  archiveOldLogs,
  getAuditLogs,
  exportAuditLogsToCSV,
  createChangesDetail,
  createChangesSummary
} from '../middleware/audit.js';

const router = express.Router();

// Apply authentication and user attachment middleware to all CMS routes
router.use(requireAuth);
router.use(attachUser);

// ============================================================================
// GAMES MANAGEMENT
// ============================================================================

/**
 * GET /api/cms/games
 * Get all games from CMS
 */
router.get('/games', (req, res) => {
  try {
    const { active_only } = req.query;
    const database = db.getDatabase();

    let query = 'SELECT * FROM cms_games';
    if (active_only === 'true') {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY display_order ASC, name ASC';

    const games = database.prepare(query).all();

    res.json({
      success: true,
      data: games,
      count: games.length
    });
  } catch (error) {
    console.error('Error fetching CMS games:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch games'
    });
  }
});

/**
 * POST /api/cms/games
 * Add a new game
 */
router.post('/games', (req, res) => {
  try {
    const { universe_id, name, description, display_order, is_featured, thumbnail_url } = req.body;
    const database = db.getDatabase();

    if (!universe_id || !name) {
      return res.status(400).json({
        success: false,
        error: 'universe_id and name are required'
      });
    }

    const stmt = database.prepare(`
      INSERT INTO cms_games (universe_id, name, description, display_order, is_featured, thumbnail_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      universe_id,
      name,
      description || null,
      display_order || 0,
      is_featured ? 1 : 0,
      thumbnail_url || null
    );

    const newGame = database.prepare('SELECT * FROM cms_games WHERE id = ?').get(result.lastInsertRowid);

    // Log audit entry
    logAudit(
      req.user?.id || null,
      req.user?.username || 'unknown',
      'CREATE',
      'game',
      newGame.id,
      newGame.name,
      `User added game "${newGame.name}"`,
      null
    );

    res.status(201).json({
      success: true,
      message: 'Game added successfully',
      data: newGame
    });
  } catch (error) {
    console.error('Error adding game:', error);

    if (error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({
        success: false,
        error: 'Game with this universe_id already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to add game'
    });
  }
});

/**
 * PUT /api/cms/games/:id
 * Update a game
 */
router.put('/games/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, display_order, is_active, is_featured, thumbnail_url } = req.body;
    const database = db.getDatabase();

    // Get original game data for audit comparison
    const originalGame = database.prepare('SELECT * FROM cms_games WHERE id = ?').get(id);

    if (!originalGame) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    const updates = [];
    const values = [];
    const newData = {};

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
      newData.name = name;
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
      newData.description = description;
    }
    if (display_order !== undefined) {
      updates.push('display_order = ?');
      values.push(display_order);
      newData.display_order = display_order;
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
      newData.is_active = is_active ? 1 : 0;
    }
    if (is_featured !== undefined) {
      updates.push('is_featured = ?');
      values.push(is_featured ? 1 : 0);
      newData.is_featured = is_featured ? 1 : 0;
    }
    if (thumbnail_url !== undefined) {
      updates.push('thumbnail_url = ?');
      values.push(thumbnail_url);
      newData.thumbnail_url = thumbnail_url;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    values.push(id);

    const stmt = database.prepare(`
      UPDATE cms_games
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    const updatedGame = database.prepare('SELECT * FROM cms_games WHERE id = ?').get(id);

    // Create audit log
    const changesDetail = createChangesDetail(originalGame, newData);
    const changesSummary = createChangesSummary(changesDetail);

    logAudit(
      req.user?.id || null,
      req.user?.username || 'unknown',
      'UPDATE',
      'game',
      updatedGame.id,
      updatedGame.name,
      changesSummary,
      changesDetail
    );

    res.json({
      success: true,
      message: 'Game updated successfully',
      data: updatedGame
    });
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update game'
    });
  }
});

/**
 * DELETE /api/cms/games/:id
 * Delete a game
 */
router.delete('/games/:id', (req, res) => {
  try {
    const { id } = req.params;
    const database = db.getDatabase();

    // Get game data before deletion for audit log
    const game = database.prepare('SELECT * FROM cms_games WHERE id = ?').get(id);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    const stmt = database.prepare('DELETE FROM cms_games WHERE id = ?');
    const result = stmt.run(id);

    // Log audit entry
    logAudit(
      req.user?.id || null,
      req.user?.username || 'unknown',
      'DELETE',
      'game',
      game.id,
      game.name,
      `User deleted game "${game.name}"`,
      null
    );

    res.json({
      success: true,
      message: 'Game deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete game'
    });
  }
});

// ============================================================================
// GROUPS MANAGEMENT
// ============================================================================

/**
 * GET /api/cms/groups
 * Get all groups from CMS
 */
router.get('/groups', (req, res) => {
  try {
    const { active_only } = req.query;
    const database = db.getDatabase();

    let query = 'SELECT * FROM cms_groups';
    if (active_only === 'true') {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY name ASC';

    const groups = database.prepare(query).all();

    res.json({
      success: true,
      data: groups,
      count: groups.length
    });
  } catch (error) {
    console.error('Error fetching CMS groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch groups'
    });
  }
});

/**
 * POST /api/cms/groups
 * Add a new group
 */
router.post('/groups', (req, res) => {
  try {
    const { group_id, name, description, owner_username } = req.body;
    const database = db.getDatabase();

    if (!group_id || !name) {
      return res.status(400).json({
        success: false,
        error: 'group_id and name are required'
      });
    }

    const stmt = database.prepare(`
      INSERT INTO cms_groups (group_id, name, description, owner_username)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(group_id, name, description || null, owner_username || null);
    const newGroup = database.prepare('SELECT * FROM cms_groups WHERE id = ?').get(result.lastInsertRowid);

    // Log audit entry
    logAudit(
      req.user?.id || null,
      req.user?.username || 'unknown',
      'CREATE',
      'group',
      newGroup.id,
      newGroup.name,
      `User added group "${newGroup.name}"`,
      null
    );

    res.status(201).json({
      success: true,
      message: 'Group added successfully',
      data: newGroup
    });
  } catch (error) {
    console.error('Error adding group:', error);

    if (error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({
        success: false,
        error: 'Group with this group_id already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to add group'
    });
  }
});

/**
 * PUT /api/cms/groups/:id
 * Update a group
 */
router.put('/groups/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_active, owner_username } = req.body;
    const database = db.getDatabase();

    // Get original group data for audit comparison
    const originalGroup = database.prepare('SELECT * FROM cms_groups WHERE id = ?').get(id);

    if (!originalGroup) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    const updates = [];
    const values = [];
    const newData = {};

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
      newData.name = name;
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
      newData.description = description;
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
      newData.is_active = is_active ? 1 : 0;
    }
    if (owner_username !== undefined) {
      updates.push('owner_username = ?');
      values.push(owner_username);
      newData.owner_username = owner_username;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    values.push(id);

    const stmt = database.prepare(`
      UPDATE cms_groups
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    const updatedGroup = database.prepare('SELECT * FROM cms_groups WHERE id = ?').get(id);

    // Create audit log
    const changesDetail = createChangesDetail(originalGroup, newData);
    const changesSummary = createChangesSummary(changesDetail);

    logAudit(
      req.user?.id || null,
      req.user?.username || 'unknown',
      'UPDATE',
      'group',
      updatedGroup.id,
      updatedGroup.name,
      changesSummary,
      changesDetail
    );

    res.json({
      success: true,
      message: 'Group updated successfully',
      data: updatedGroup
    });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update group'
    });
  }
});

/**
 * DELETE /api/cms/groups/:id
 * Delete a group
 */
router.delete('/groups/:id', (req, res) => {
  try {
    const { id } = req.params;
    const database = db.getDatabase();

    // Get group data before deletion for audit log
    const group = database.prepare('SELECT * FROM cms_groups WHERE id = ?').get(id);

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    const stmt = database.prepare('DELETE FROM cms_groups WHERE id = ?');
    const result = stmt.run(id);

    // Log audit entry
    logAudit(
      req.user?.id || null,
      req.user?.username || 'unknown',
      'DELETE',
      'group',
      group.id,
      group.name,
      `User deleted group "${group.name}"`,
      null
    );

    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete group'
    });
  }
});

// ============================================================================
// CONTENT MANAGEMENT
// ============================================================================

/**
 * GET /api/cms/content
 * Get all content sections or a specific section
 */
router.get('/content', (req, res) => {
  try {
    const { section_key } = req.query;
    const database = db.getDatabase();

    if (section_key) {
      const content = database.prepare('SELECT * FROM cms_content WHERE section_key = ?').get(section_key);

      if (!content) {
        return res.status(404).json({
          success: false,
          error: 'Content section not found'
        });
      }

      return res.json({
        success: true,
        data: content
      });
    }

    const content = database.prepare('SELECT * FROM cms_content ORDER BY section_key ASC').all();

    res.json({
      success: true,
      data: content,
      count: content.length
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content'
    });
  }
});

/**
 * PUT /api/cms/content/:section_key
 * Update a content section
 */
router.put('/content/:section_key', (req, res) => {
  try {
    const { section_key } = req.params;
    const { title, content, metadata, is_active } = req.body;
    const database = db.getDatabase();

    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      values.push(typeof content === 'string' ? content : JSON.stringify(content));
    }
    if (metadata !== undefined) {
      updates.push('metadata = ?');
      values.push(typeof metadata === 'string' ? metadata : JSON.stringify(metadata));
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    values.push(section_key);

    const stmt = database.prepare(`
      UPDATE cms_content
      SET ${updates.join(', ')}
      WHERE section_key = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Content section not found'
      });
    }

    const updatedContent = database.prepare('SELECT * FROM cms_content WHERE section_key = ?').get(section_key);

    res.json({
      success: true,
      message: 'Content updated successfully',
      data: updatedContent
    });
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update content'
    });
  }
});

// ============================================================================
// SETTINGS MANAGEMENT
// ============================================================================

/**
 * GET /api/cms/settings
 * Get all settings or a specific setting
 */
router.get('/settings', (req, res) => {
  try {
    const { setting_key } = req.query;
    const database = db.getDatabase();

    if (setting_key) {
      const setting = database.prepare('SELECT * FROM cms_settings WHERE setting_key = ?').get(setting_key);

      if (!setting) {
        return res.status(404).json({
          success: false,
          error: 'Setting not found'
        });
      }

      return res.json({
        success: true,
        data: setting
      });
    }

    const settings = database.prepare('SELECT * FROM cms_settings ORDER BY setting_key ASC').all();

    res.json({
      success: true,
      data: settings,
      count: settings.length
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
});

/**
 * PUT /api/cms/settings/:setting_key
 * Update a setting
 */
router.put('/settings/:setting_key', (req, res) => {
  try {
    const { setting_key } = req.params;
    const { setting_value } = req.body;
    const database = db.getDatabase();

    if (setting_value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'setting_value is required'
      });
    }

    const stmt = database.prepare(`
      UPDATE cms_settings
      SET setting_value = ?
      WHERE setting_key = ?
    `);

    const result = stmt.run(setting_value, setting_key);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Setting not found'
      });
    }

    const updatedSetting = database.prepare('SELECT * FROM cms_settings WHERE setting_key = ?').get(setting_key);

    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: updatedSetting
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update setting'
    });
  }
});

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * POST /api/cms/games/bulk-delete
 * Delete multiple games
 */
router.post('/games/bulk-delete', (req, res) => {
  try {
    const { ids } = req.body;
    const database = db.getDatabase();

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids array is required and must not be empty'
      });
    }

    // Get games before deletion for audit log
    const placeholders = ids.map(() => '?').join(',');
    const games = database.prepare(`SELECT * FROM cms_games WHERE id IN (${placeholders})`).all(...ids);

    // Delete games
    const deleteStmt = database.prepare(`DELETE FROM cms_games WHERE id IN (${placeholders})`);
    const result = deleteStmt.run(...ids);

    // Log each deletion
    games.forEach(game => {
      logAudit(
        req.user?.id || null,
        req.user?.username || 'unknown',
        'DELETE',
        'game',
        game.id,
        game.name,
        `User deleted game "${game.name}" (bulk operation)`,
        null
      );
    });

    res.json({
      success: true,
      message: `Successfully deleted ${result.changes} games`,
      deleted: result.changes
    });
  } catch (error) {
    console.error('Error bulk deleting games:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete games'
    });
  }
});

/**
 * POST /api/cms/games/bulk-toggle-active
 * Toggle is_active for multiple games
 */
router.post('/games/bulk-toggle-active', (req, res) => {
  try {
    const { ids, is_active } = req.body;
    const database = db.getDatabase();

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids array is required and must not be empty'
      });
    }

    if (is_active === undefined) {
      return res.status(400).json({
        success: false,
        error: 'is_active is required'
      });
    }

    // Get games before update for audit log
    const placeholders = ids.map(() => '?').join(',');
    const gamesBefore = database.prepare(`SELECT * FROM cms_games WHERE id IN (${placeholders})`).all(...ids);

    // Update games
    const updateStmt = database.prepare(`UPDATE cms_games SET is_active = ? WHERE id IN (${placeholders})`);
    const result = updateStmt.run(is_active ? 1 : 0, ...ids);

    // Get updated games
    const gamesAfter = database.prepare(`SELECT * FROM cms_games WHERE id IN (${placeholders})`).all(...ids);

    // Log each update
    gamesAfter.forEach((gameAfter, index) => {
      const gameBefore = gamesBefore[index];
      const changesDetail = createChangesDetail(gameBefore, { is_active: is_active ? 1 : 0 });
      const changesSummary = createChangesSummary(changesDetail);

      logAudit(
        req.user?.id || null,
        req.user?.username || 'unknown',
        'UPDATE',
        'game',
        gameAfter.id,
        gameAfter.name,
        `${changesSummary} (bulk operation)`,
        changesDetail
      );
    });

    res.json({
      success: true,
      message: `Successfully updated ${result.changes} games`,
      updated: result.changes
    });
  } catch (error) {
    console.error('Error bulk toggling game active status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update games'
    });
  }
});

/**
 * POST /api/cms/groups/bulk-delete
 * Delete multiple groups
 */
router.post('/groups/bulk-delete', (req, res) => {
  try {
    const { ids } = req.body;
    const database = db.getDatabase();

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids array is required and must not be empty'
      });
    }

    // Get groups before deletion for audit log
    const placeholders = ids.map(() => '?').join(',');
    const groups = database.prepare(`SELECT * FROM cms_groups WHERE id IN (${placeholders})`).all(...ids);

    // Delete groups
    const deleteStmt = database.prepare(`DELETE FROM cms_groups WHERE id IN (${placeholders})`);
    const result = deleteStmt.run(...ids);

    // Log each deletion
    groups.forEach(group => {
      logAudit(
        req.user?.id || null,
        req.user?.username || 'unknown',
        'DELETE',
        'group',
        group.id,
        group.name,
        `User deleted group "${group.name}" (bulk operation)`,
        null
      );
    });

    res.json({
      success: true,
      message: `Successfully deleted ${result.changes} groups`,
      deleted: result.changes
    });
  } catch (error) {
    console.error('Error bulk deleting groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete groups'
    });
  }
});

/**
 * POST /api/cms/groups/bulk-toggle-active
 * Toggle is_active for multiple groups
 */
router.post('/groups/bulk-toggle-active', (req, res) => {
  try {
    const { ids, is_active } = req.body;
    const database = db.getDatabase();

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids array is required and must not be empty'
      });
    }

    if (is_active === undefined) {
      return res.status(400).json({
        success: false,
        error: 'is_active is required'
      });
    }

    // Get groups before update for audit log
    const placeholders = ids.map(() => '?').join(',');
    const groupsBefore = database.prepare(`SELECT * FROM cms_groups WHERE id IN (${placeholders})`).all(...ids);

    // Update groups
    const updateStmt = database.prepare(`UPDATE cms_groups SET is_active = ? WHERE id IN (${placeholders})`);
    const result = updateStmt.run(is_active ? 1 : 0, ...ids);

    // Get updated groups
    const groupsAfter = database.prepare(`SELECT * FROM cms_groups WHERE id IN (${placeholders})`).all(...ids);

    // Log each update
    groupsAfter.forEach((groupAfter, index) => {
      const groupBefore = groupsBefore[index];
      const changesDetail = createChangesDetail(groupBefore, { is_active: is_active ? 1 : 0 });
      const changesSummary = createChangesSummary(changesDetail);

      logAudit(
        req.user?.id || null,
        req.user?.username || 'unknown',
        'UPDATE',
        'group',
        groupAfter.id,
        groupAfter.name,
        `${changesSummary} (bulk operation)`,
        changesDetail
      );
    });

    res.json({
      success: true,
      message: `Successfully updated ${result.changes} groups`,
      updated: result.changes
    });
  } catch (error) {
    console.error('Error bulk toggling group active status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update groups'
    });
  }
});

// ============================================================================
// AUDIT LOG ENDPOINTS
// ============================================================================

/**
 * GET /api/cms/audit-logs
 * Get paginated audit logs with optional filters
 */
router.get('/audit-logs', (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      user_id,
      action,
      entity_type,
      start_date,
      end_date,
      sort = 'desc'
    } = req.query;

    const result = getAuditLogs({
      page: parseInt(page),
      limit: parseInt(limit),
      userId: user_id ? parseInt(user_id) : null,
      action,
      entityType: entity_type,
      startDate: start_date,
      endDate: end_date,
      sort,
      includeArchived: false
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs'
    });
  }
});

/**
 * GET /api/cms/audit-logs/export
 * Export audit logs to CSV
 */
router.get('/audit-logs/export', (req, res) => {
  try {
    const { start_date, end_date, action, entity_type } = req.query;

    const csv = exportAuditLogsToCSV({
      startDate: start_date,
      endDate: end_date,
      action,
      entityType: entity_type
    });

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export audit logs'
    });
  }
});

/**
 * POST /api/cms/audit-logs/archive
 * Manually trigger archival of old logs (>30 days)
 */
router.post('/audit-logs/archive', (req, res) => {
  try {
    const result = archiveOldLogs();

    res.json({
      success: true,
      message: `Archived ${result.copied} audit logs`,
      archived: result.copied
    });
  } catch (error) {
    console.error('Error archiving audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive audit logs'
    });
  }
});

export default router;
