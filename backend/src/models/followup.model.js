import db from '../config/db.js';

/**
 * Database wrapper for follow-ups table with promise-based methods
 */

export const followUpDB = {
  /**
   * Insert a new follow-up
   */
  insert(data) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO follow_ups (
          user_id, email_id, email_subject, email_from, email_snippet,
          reminder_date, reason, urgency, ai_confidence, 
          detected_keywords, commitment_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        data.user_id,
        data.email_id,
        data.email_subject,
        data.email_from,
        data.email_snippet,
        data.reminder_date,
        data.reason,
        data.urgency,
        data.ai_confidence,
        data.detected_keywords,
        data.commitment_type,
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, changes: this.changes });
        }
      );
      stmt.finalize();
    });
  },

  /**
   * Get all follow-ups for a user
   */
  getAll(userId, status = 'pending') {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT * FROM follow_ups 
        WHERE user_id = ?
      `;
      const params = [userId];

      if (status !== 'all') {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY reminder_date ASC';

      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  /**
   * Get a single follow-up
   */
  getById(id, userId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM follow_ups WHERE id = ? AND user_id = ?`,
        [id, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  /**
   * Update follow-up status
   */
  updateStatus(id, userId, status, additionalData = {}) {
    return new Promise((resolve, reject) => {
      let query = `UPDATE follow_ups SET status = ?`;
      const params = [status];

      if (additionalData.completed_at) {
        query += ', completed_at = ?';
        params.push(additionalData.completed_at);
      }

      if (additionalData.snoozed_until) {
        query += ', snoozed_until = ?';
        params.push(additionalData.snoozed_until);
      }

      if (additionalData.reminder_date) {
        query += ', reminder_date = ?';
        params.push(additionalData.reminder_date);
      }

      query += ' WHERE id = ? AND user_id = ?';
      params.push(id, userId);

      db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },

  /**
   * Delete a follow-up
   */
  delete(id, userId) {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM follow_ups WHERE id = ? AND user_id = ?`,
        [id, userId],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  },

  /**
   * Get statistics
   */
  getStats(userId) {
    return new Promise((resolve, reject) => {
      const stats = {
        total: 0,
        pending: 0,
        completed: 0,
        dismissed: 0,
        snoozed: 0,
        overdue: 0,
        byUrgency: { low: 0, medium: 0, high: 0, critical: 0 },
        byType: {}
      };

      // Get counts by status
      db.all(
        `SELECT status, COUNT(*) as count FROM follow_ups WHERE user_id = ? GROUP BY status`,
        [userId],
        (err, rows) => {
          if (err) return reject(err);

          rows.forEach(row => {
            stats[row.status] = row.count;
            stats.total += row.count;
          });

          // Get overdue count
          db.get(
            `SELECT COUNT(*) as count FROM follow_ups 
             WHERE user_id = ? AND status = 'pending' AND reminder_date < datetime('now')`,
            [userId],
            (err, row) => {
              if (err) return reject(err);
              stats.overdue = row.count;

              // Get counts by urgency
              db.all(
                `SELECT urgency, COUNT(*) as count FROM follow_ups 
                 WHERE user_id = ? AND status = 'pending' GROUP BY urgency`,
                [userId],
                (err, rows) => {
                  if (err) return reject(err);

                  rows.forEach(row => {
                    stats.byUrgency[row.urgency] = row.count;
                  });

                  // Get counts by type
                  db.all(
                    `SELECT commitment_type, COUNT(*) as count FROM follow_ups 
                     WHERE user_id = ? AND status = 'pending' GROUP BY commitment_type`,
                    [userId],
                    (err, rows) => {
                      if (err) return reject(err);

                      rows.forEach(row => {
                        stats.byType[row.commitment_type] = row.count;
                      });

                      resolve(stats);
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  }
};
