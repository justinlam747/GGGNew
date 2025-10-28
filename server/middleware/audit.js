/**
 * Audit Logging Middleware
 * Logs all CMS changes to database and console
 */

import db from '../database/db.js';

/**
 * Log an audit entry
 * @param {number|null} userId - Admin user ID from session
 * @param {string} username - Admin username from session
 * @param {string} action - CREATE, UPDATE, DELETE, READ
 * @param {string} entityType - game, group, content, setting
 * @param {number|null} entityId - ID of the affected entity
 * @param {string} entityName - Name of the affected entity
 * @param {string} changesSummary - Human-readable summary (e.g., "User added game 'Consume'")
 * @param {Object|null} changesDetail - Detailed changes object with old/new values
 */
export function logAudit(userId, username, action, entityType, entityId, entityName, changesSummary, changesDetail = null) {
  try {
    const database = db.getDatabase();

    // Insert audit log entry
    const stmt = database.prepare(`
      INSERT INTO cms_audit_logs (user_id, username, action, entity_type, entity_id, entity_name, changes_summary, changes_detail)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      username,
      action,
      entityType,
      entityId,
      entityName,
      changesSummary,
      changesDetail ? JSON.stringify(changesDetail) : null
    );

    // Log to console
    logToConsole({
      id: result.lastInsertRowid,
      userId,
      username,
      action,
      entityType,
      entityId,
      entityName,
      changesSummary,
      timestamp: new Date()
    });

    return result.lastInsertRowid;
  } catch (error) {
    // Don't throw - audit logging should not break CMS operations
    console.error('Failed to log audit entry:', error);
    return null;
  }
}

/**
 * Log audit entry to console with formatted output
 * @param {Object} logEntry - Audit log entry object
 */
function logToConsole(logEntry) {
  const timestamp = new Date(logEntry.timestamp).toISOString().replace('T', ' ').substring(0, 19);
  const userId = logEntry.userId ? `ID: ${logEntry.userId}` : 'ID: N/A';

  console.log(
    `[${timestamp}] ` +
    `USER: ${logEntry.username} (${userId}) | ` +
    `ACTION: ${logEntry.action} | ` +
    `ENTITY: ${logEntry.entityType.charAt(0).toUpperCase() + logEntry.entityType.slice(1)} "${logEntry.entityName}"` +
    (logEntry.entityId ? ` (ID: ${logEntry.entityId})` : '') +
    (logEntry.changesSummary && logEntry.action === 'UPDATE' ? ` | CHANGES: ${logEntry.changesSummary}` : '')
  );
}

/**
 * Archive old audit logs (>30 days) to archive table
 * Keeps main table performant while preserving historical data
 */
export function archiveOldLogs() {
  try {
    const database = db.getDatabase();

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString();

    // Begin transaction
    const archive = database.transaction(() => {
      // Copy old logs to archive
      const copyStmt = database.prepare(`
        INSERT INTO cms_audit_logs_archive
        (user_id, username, action, entity_type, entity_id, entity_name, changes_summary, changes_detail, timestamp, original_id)
        SELECT user_id, username, action, entity_type, entity_id, entity_name, changes_summary, changes_detail, timestamp, id
        FROM cms_audit_logs
        WHERE timestamp < ? AND archived = 0
      `);

      const copyResult = copyStmt.run(cutoffDate);

      // Mark original logs as archived
      const markStmt = database.prepare(`
        UPDATE cms_audit_logs
        SET archived = 1
        WHERE timestamp < ? AND archived = 0
      `);

      const markResult = markStmt.run(cutoffDate);

      return { copied: copyResult.changes, marked: markResult.changes };
    });

    const result = archive();

    if (result.copied > 0) {
      console.log(`✅ Archived ${result.copied} audit logs older than 30 days`);
    }

    return result;
  } catch (error) {
    console.error('Failed to archive old logs:', error);
    return { copied: 0, marked: 0 };
  }
}

/**
 * Get audit logs with pagination and filters
 * @param {Object} options - Filter and pagination options
 * @returns {Object} - { logs: Array, total: number, page: number, limit: number }
 */
export function getAuditLogs(options = {}) {
  const {
    page = 1,
    limit = 10,
    userId = null,
    action = null,
    entityType = null,
    startDate = null,
    endDate = null,
    sort = 'desc',
    includeArchived = false
  } = options;

  const database = db.getDatabase();
  const offset = (page - 1) * limit;

  // Build WHERE clause
  const conditions = ['1=1'];
  const params = [];

  if (!includeArchived) {
    conditions.push('archived = 0');
  }

  if (userId) {
    conditions.push('user_id = ?');
    params.push(userId);
  }

  if (action) {
    conditions.push('action = ?');
    params.push(action);
  }

  if (entityType) {
    conditions.push('entity_type = ?');
    params.push(entityType);
  }

  if (startDate) {
    conditions.push('timestamp >= ?');
    params.push(startDate);
  }

  if (endDate) {
    conditions.push('timestamp <= ?');
    params.push(endDate);
  }

  const whereClause = conditions.join(' AND ');
  const orderDirection = sort.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // Get total count
  const countStmt = database.prepare(`
    SELECT COUNT(*) as total
    FROM cms_audit_logs
    WHERE ${whereClause}
  `);
  const { total } = countStmt.get(...params);

  // Get paginated logs
  const logsStmt = database.prepare(`
    SELECT *
    FROM cms_audit_logs
    WHERE ${whereClause}
    ORDER BY timestamp ${orderDirection}
    LIMIT ? OFFSET ?
  `);

  const logs = logsStmt.all(...params, limit, offset);

  // Parse JSON changes_detail
  const parsedLogs = logs.map(log => ({
    ...log,
    changes_detail: log.changes_detail ? JSON.parse(log.changes_detail) : null
  }));

  return {
    logs: parsedLogs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * Export audit logs to CSV format
 * @param {Object} filters - Filter options (startDate, endDate, action, entityType)
 * @returns {string} - CSV formatted string
 */
export function exportAuditLogsToCSV(filters = {}) {
  const { startDate, endDate, action, entityType } = filters;

  const database = db.getDatabase();

  // Build WHERE clause for export (include archived)
  const conditions = ['1=1'];
  const params = [];

  if (action) {
    conditions.push('action = ?');
    params.push(action);
  }

  if (entityType) {
    conditions.push('entity_type = ?');
    params.push(entityType);
  }

  if (startDate) {
    conditions.push('timestamp >= ?');
    params.push(startDate);
  }

  if (endDate) {
    conditions.push('timestamp <= ?');
    params.push(endDate);
  }

  const whereClause = conditions.join(' AND ');

  // Get all matching logs (including archived)
  const logsStmt = database.prepare(`
    SELECT timestamp, username, user_id, action, entity_type, entity_id, entity_name, changes_summary, changes_detail
    FROM cms_audit_logs
    WHERE ${whereClause}
    ORDER BY timestamp DESC
  `);

  const logs = logsStmt.all(...params);

  // Build CSV
  const headers = ['Timestamp', 'Username', 'User ID', 'Action', 'Entity Type', 'Entity ID', 'Entity Name', 'Summary', 'Details'];
  const rows = logs.map(log => [
    log.timestamp,
    log.username,
    log.user_id || '',
    log.action,
    log.entity_type,
    log.entity_id || '',
    log.entity_name || '',
    log.changes_summary || '',
    log.changes_detail || ''
  ]);

  // Escape CSV fields
  const escapeCsvField = (field) => {
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCsvField).join(','),
    ...rows.map(row => row.map(escapeCsvField).join(','))
  ];

  return csvLines.join('\n');
}

/**
 * Helper to create changes detail object for UPDATE actions
 * Compares old and new values and returns object with changed fields
 * @param {Object} oldData - Original data object
 * @param {Object} newData - Updated data object
 * @returns {Object} - Object with old/new values for changed fields
 */
export function createChangesDetail(oldData, newData) {
  const changes = {};

  for (const key in newData) {
    if (newData.hasOwnProperty(key) && oldData[key] !== newData[key]) {
      changes[key] = {
        old: oldData[key],
        new: newData[key]
      };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Helper to create changes summary string
 * @param {Object} changes - Changes detail object
 * @returns {string} - Human-readable summary
 */
export function createChangesSummary(changes) {
  if (!changes || Object.keys(changes).length === 0) {
    return '';
  }

  const fieldNames = Object.keys(changes);

  if (fieldNames.length === 1) {
    return `Updated ${fieldNames[0]}`;
  } else if (fieldNames.length === 2) {
    return `Updated ${fieldNames[0]} and ${fieldNames[1]}`;
  } else {
    return `Updated ${fieldNames.slice(0, -1).join(', ')}, and ${fieldNames[fieldNames.length - 1]}`;
  }
}

export default {
  logAudit,
  archiveOldLogs,
  getAuditLogs,
  exportAuditLogsToCSV,
  createChangesDetail,
  createChangesSummary
};
