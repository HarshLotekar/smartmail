import db from '../config/db.js';

/**
 * Email Decision Model
 * Handles email decision classification metadata
 */

/**
 * Create email_decisions table if it doesn't exist
 */
function createDecisionsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS email_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_id TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      decision_required BOOLEAN NOT NULL DEFAULT 0,
      decision_type TEXT NOT NULL,
      reason TEXT,
      detected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (email_id) REFERENCES messages (gmail_id) ON DELETE CASCADE,
      UNIQUE(email_id, user_id)
    )
  `;

  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) {
        console.error('❌ Error creating email_decisions table:', err.message);
        reject(err);
      } else {
        console.log('✅ Email decisions table ready');
        resolve();
      }
    });
  });
}

/**
 * Create indexes for performance
 */
function createDecisionIndexes() {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_email_decisions_user_id ON email_decisions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_email_decisions_decision_required ON email_decisions(decision_required)',
    'CREATE INDEX IF NOT EXISTS idx_email_decisions_user_decision ON email_decisions(user_id, decision_required)',
    'CREATE INDEX IF NOT EXISTS idx_email_decisions_status ON email_decisions(status)',
    'CREATE INDEX IF NOT EXISTS idx_email_decisions_user_status ON email_decisions(user_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_email_decisions_email_id ON email_decisions(email_id)'
  ];

  return Promise.all(
    indexes.map(sql => new Promise((resolve, reject) => {
      db.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    }))
  );
}

/**
 * Initialize email_decisions table with indexes
 */
export async function initDecisionsTable() {
  try {
    await createDecisionsTable();
    await createDecisionIndexes();
    return true;
  } catch (error) {
    console.error('Failed to initialize email_decisions table:', error);
    throw error;
  }
}

/**
 * Create or update email decision metadata
 * @param {Object} decisionData - Decision metadata
 * @returns {Promise<number>} - Decision ID
 */
export function upsertDecision(decisionData) {
  const {
    email_id,
    user_id,
    decision_required,
    decision_type,
    decision_score = 0.0,
    decision_reason,
    detected_at,
    status = 'pending'
  } = decisionData;

  const sql = `
    INSERT INTO email_decisions (
      email_id, user_id, decision_required, decision_type, 
      decision_score, decision_reason, detected_at, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email_id, user_id) 
    DO UPDATE SET
      decision_required = excluded.decision_required,
      decision_type = excluded.decision_type,
      decision_score = excluded.decision_score,
      decision_reason = excluded.decision_reason,
      detected_at = excluded.detected_at,
      status = excluded.status,
      updated_at = CURRENT_TIMESTAMP
  `;

  return new Promise((resolve, reject) => {
    db.run(
      sql,
      [email_id, user_id, decision_required ? 1 : 0, decision_type, decision_score, decision_reason, detected_at || new Date().toISOString(), status],
      function(err) {
        if (err) {
          console.error('Error upserting decision:', err.message);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

/**
 * Get decision by email ID
 * @param {string} emailId - Gmail message ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>}
 */
export function getDecisionByEmailId(emailId, userId) {
  const sql = `
    SELECT * FROM email_decisions 
    WHERE email_id = ? AND user_id = ?
  `;

  return new Promise((resolve, reject) => {
    db.get(sql, [emailId, userId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

/**
 * Get all decisions for a user
 * @param {number} userId - User ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>}
 */
export function getDecisionsByUser(userId, filters = {}) {
  let sql = 'SELECT * FROM email_decisions WHERE user_id = ?';
  const params = [userId];

  if (filters.decision_required !== undefined) {
    sql += ' AND decision_required = ?';
    params.push(filters.decision_required ? 1 : 0);
  }

  if (filters.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters.decision_type) {
    sql += ' AND decision_type = ?';
    params.push(filters.decision_type);
  }

  sql += ' ORDER BY detected_at DESC';

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }

  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Get pending decisions requiring action
 * @param {number} userId - User ID
 * @returns {Promise<Array>}
 */
export function getPendingDecisions(userId) {
  const sql = `
    SELECT 
      ed.*, 
      m.id as message_id,
      m.subject, 
      m.from_email, 
      m.from_name, 
      m.date, 
      m.snippet, 
      m.is_read, 
      m.is_starred, 
      m.ai_category
    FROM email_decisions ed
    LEFT JOIN messages m ON ed.email_id = m.gmail_id
    WHERE ed.user_id = ? 
      AND ed.decision_required = 1 
      AND ed.status = 'pending'
      AND (ed.snoozed_until IS NULL OR ed.snoozed_until <= CURRENT_TIMESTAMP)
    ORDER BY ed.decision_score DESC, ed.detected_at DESC
  `;

  return new Promise((resolve, reject) => {
    db.all(sql, [userId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Update decision status
 * @param {string} emailId - Gmail message ID
 * @param {number} userId - User ID
 * @param {string} status - New status ('pending', 'completed', 'ignored', 'snoozed')
 * @param {string|null} snoozedUntil - ISO timestamp for snooze
 * @returns {Promise<boolean>}
 */
export function updateDecisionStatusByEmailId(emailId, userId, status, snoozedUntil = null) {
  const validStatuses = ['pending', 'completed', 'ignored', 'snoozed'];
  if (!validStatuses.includes(status)) {
    return Promise.reject(new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`));
  }

  const sql = `
    UPDATE email_decisions 
    SET status = ?, snoozed_until = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE email_id = ? AND user_id = ?
  `;

  return new Promise((resolve, reject) => {
    db.run(sql, [status, snoozedUntil, emailId, userId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.changes > 0);
      }
    });
  });
}

/**
 * Mark decision as not a decision (user feedback)
 * @param {string} emailId - Gmail message ID
 * @param {number} userId - User ID
 * @returns {Promise<boolean>}
 */
export function markAsNotDecision(emailId, userId) {
  const sql = `
    UPDATE email_decisions 
    SET decision_required = 0, status = 'completed', updated_at = CURRENT_TIMESTAMP 
    WHERE email_id = ? AND user_id = ?
  `;

  return new Promise((resolve, reject) => {
    db.run(sql, [emailId, userId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.changes > 0);
      }
    });
  });
}

/**
 * Store user feedback for a decision (learning system)
 * @param {string} emailId - Gmail message ID
 * @param {number} userId - User ID
 * @param {Object} feedback - Feedback data
 * @returns {Promise<number>}
 */
export function storeFeedback(emailId, userId, feedback) {
  console.log(`[DECISION_FEEDBACK] User: ${userId}, Email: ${emailId}`, feedback);
  
  // Extract sender domain and subject pattern for learning
  const getSenderInfoSql = `
    SELECT from_email, subject 
    FROM messages 
    WHERE gmail_id = ?
  `;
  
  return new Promise((resolve, reject) => {
    db.get(getSenderInfoSql, [emailId], (err, message) => {
      if (err || !message) {
        console.error('[DECISION_FEEDBACK] Error fetching message:', err);
        return reject(err || new Error('Message not found'));
      }
      
      // Extract domain from email
      const fromEmail = message.from_email || '';
      const senderDomain = fromEmail.includes('@') 
        ? fromEmail.split('@')[1].toLowerCase()
        : null;
      
      // Extract subject pattern (first 3 words)
      const subject = message.subject || '';
      const subjectPattern = subject.split(/\s+/).slice(0, 3).join(' ').toLowerCase();
      
      // Store feedback
      const insertSql = `
        INSERT INTO decision_feedback (
          user_id, email_id, feedback_type, 
          original_score, original_type, comment,
          sender_domain, subject_pattern
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        userId,
        emailId,
        feedback.feedbackType || 'not_decision',
        feedback.originalScore || null,
        feedback.originalType || null,
        feedback.comment || null,
        senderDomain,
        subjectPattern
      ];
      
      db.run(insertSql, params, function(err) {
        if (err) {
          console.error('[DECISION_FEEDBACK] Error storing feedback:', err);
          reject(err);
        } else {
          console.log(`[DECISION_FEEDBACK] ✅ Stored feedback ID: ${this.lastID}`);
          resolve(this.lastID);
        }
      });
    });
  });
}

/**
 * Update decision status
 * @param {number} decisionId - Decision ID
 * @param {string} status - New status ('pending' or 'done')
 * @returns {Promise<boolean>}
 */
export function updateDecisionStatus(decisionId, status) {
  if (status !== 'pending' && status !== 'done') {
    return Promise.reject(new Error('Invalid status. Must be "pending" or "done"'));
  }

  const sql = 'UPDATE email_decisions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

  return new Promise((resolve, reject) => {
    db.run(sql, [status, decisionId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.changes > 0);
      }
    });
  });
}

/**
 * Mark decision as done
 * @param {string} emailId - Gmail message ID
 * @param {number} userId - User ID
 * @returns {Promise<boolean>}
 */
export function markDecisionDone(emailId, userId) {
  const sql = `
    UPDATE email_decisions 
    SET status = 'done', updated_at = CURRENT_TIMESTAMP 
    WHERE email_id = ? AND user_id = ?
  `;

  return new Promise((resolve, reject) => {
    db.run(sql, [emailId, userId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.changes > 0);
      }
    });
  });
}

/**
 * Get decision statistics for user
 * @param {number} userId - User ID
 * @returns {Promise<Object>}
 */
export function getDecisionStats(userId) {
  const sql = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN decision_required = 1 THEN 1 ELSE 0 END) as requires_action,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN decision_type = 'reply_required' THEN 1 ELSE 0 END) as reply_required,
      SUM(CASE WHEN decision_type = 'deadline' THEN 1 ELSE 0 END) as deadlines,
      SUM(CASE WHEN decision_type = 'follow_up' THEN 1 ELSE 0 END) as follow_ups,
      SUM(CASE WHEN decision_type = 'informational_only' THEN 1 ELSE 0 END) as informational
    FROM email_decisions
    WHERE user_id = ?
  `;

  return new Promise((resolve, reject) => {
    db.get(sql, [userId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || {});
      }
    });
  });
}

/**
 * Delete decision by email ID
 * @param {string} emailId - Gmail message ID
 * @param {number} userId - User ID
 * @returns {Promise<boolean>}
 */
export function deleteDecision(emailId, userId) {
  const sql = 'DELETE FROM email_decisions WHERE email_id = ? AND user_id = ?';

  return new Promise((resolve, reject) => {
    db.run(sql, [emailId, userId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.changes > 0);
      }
    });
  });
}

/**
 * Bulk insert decisions
 * @param {Array<Object>} decisions - Array of decision objects
 * @returns {Promise<number>} - Number of decisions inserted
 */
export function bulkInsertDecisions(decisions) {
  if (!decisions || decisions.length === 0) {
    return Promise.resolve(0);
  }

  const sql = `
    INSERT OR REPLACE INTO email_decisions (
      email_id, user_id, decision_required, decision_type, 
      reason, detected_at, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      const stmt = db.prepare(sql);
      let count = 0;

      for (const decision of decisions) {
        stmt.run(
          [
            decision.email_id,
            decision.user_id,
            decision.decision_required ? 1 : 0,
            decision.decision_type,
            decision.reason,
            decision.detected_at || new Date().toISOString(),
            decision.status || 'pending'
          ],
          (err) => {
            if (err) {
              console.error('Error inserting decision:', err.message);
            } else {
              count++;
            }
          }
        );
      }

      stmt.finalize((err) => {
        if (err) {
          db.run('ROLLBACK');
          reject(err);
        } else {
          db.run('COMMIT', (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(count);
            }
          });
        }
      });
    });
  });
}

export default {
  initDecisionsTable,
  upsertDecision,
  getDecisionByEmailId,
  getDecisionsByUser,
  getPendingDecisions,
  updateDecisionStatus,
  updateDecisionStatusByEmailId,
  markDecisionDone,
  markAsNotDecision,
  storeFeedback,
  getDecisionStats,
  deleteDecision,
  bulkInsertDecisions
};
