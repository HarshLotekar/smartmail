/**
 * Smart email labeling function
 * @param {string} sender - The sender of the email
 * @param {string} subject - The subject of the email
 * @param {string} snippet - The snippet or preview of the email
 * @returns {string} One of ["Updates", "Promotions", "Other", "Important", "Finance", "Support", "Social", "Urgent"]
 */
export function smartLabelEmail(sender, subject, snippet) {
  const s = (subject || '').toLowerCase();
  const n = (snippet || '').toLowerCase();
  const from = (sender || '').toLowerCase();

  // Finance
  if (
    s.includes('payment') || n.includes('payment') ||
    s.includes('bank') || n.includes('bank') ||
    s.includes('invoice') || n.includes('invoice') ||
    s.includes('account activity') || n.includes('account activity')
  ) {
    return 'Finance';
  }

  // Promotions
  if (
    s.includes('offer') || n.includes('offer') ||
    s.includes('sale') || n.includes('sale') ||
    s.includes('deal') || n.includes('deal') ||
    s.includes('upgrade') || n.includes('upgrade')
  ) {
    return 'Promotions';
  }

  // Social/Support (Snapchat, LinkedIn, X)
  if (['snapchat', 'linkedin', 'x', 'twitter'].some(net => from.includes(net))) {
    if (
      s.includes('login') || n.includes('login') ||
      s.includes('sign-in') || n.includes('sign-in')
    ) {
      return 'Support';
    }
    return 'Social';
  }

  // Urgent
  if (
    s.includes('security alert') || n.includes('security alert') ||
    s.includes('new sign-in') || n.includes('new sign-in') ||
    s.includes('unusual login') || n.includes('unusual login')
  ) {
    return 'Urgent';
  }

  // Updates
  if (
    ['onedrive', 'canva'].some(app => from.includes(app)) ||
    s.includes('notification') || n.includes('notification') ||
    s.includes('update') || n.includes('update') ||
    s.includes('deleted') || n.includes('deleted')
  ) {
    return 'Updates';
  }

  // Other
  return 'Other';
}
export const createLabelTable = `
CREATE TABLE IF NOT EXISTS labels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  color TEXT
);
`;

export const defaultLabels = [
  { name: 'Work', color: '#2563EB' },
  { name: 'Personal', color: '#10B981' },
  { name: 'Promotions', color: '#F59E0B' },
  { name: 'Updates', color: '#8B5CF6' },
  { name: 'Newsletters', color: '#EC4899' },
  { name: 'Important', color: '#EF4444' },
];
import db from '../config/db.js';

/**
 * Label Model
 * Handles email labels/categories and their associations
 */

/**
 * Create labels table if it doesn't exist
 */
function createLabelsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#007bff',
      description TEXT,
      is_system BOOLEAN DEFAULT 0,
      is_gmail_label BOOLEAN DEFAULT 0,
      gmail_label_id TEXT,
      message_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(user_id, name)
    )
  `;

  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) {
        console.error('❌ Error creating labels table:', err.message);
        reject(err);
      } else {
        console.log('✅ Labels table ready');
        resolve();
      }
    });
  });
}

/**
 * Create message_labels junction table
 */
function createMessageLabelsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS message_labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      label_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE,
      FOREIGN KEY (label_id) REFERENCES labels (id) ON DELETE CASCADE,
      UNIQUE(message_id, label_id)
    )
  `;

  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) {
        console.error('❌ Error creating message_labels table:', err.message);
        reject(err);
      } else {
        console.log('✅ Message_labels table ready');
        resolve();
      }
    });
  });
}

/**
 * Create label indexes for better performance
 */
function createLabelIndexes() {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_labels_user_id ON labels(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_labels_name ON labels(name)',
    'CREATE INDEX IF NOT EXISTS idx_message_labels_message ON message_labels(message_id)',
    'CREATE INDEX IF NOT EXISTS idx_message_labels_label ON message_labels(label_id)'
  ];

  return Promise.all(indexes.map(sql => 
    new Promise((resolve, reject) => {
      db.run(sql, (err) => {
        if (err) {
          console.error('❌ Error creating label index:', err.message);
          reject(err);
        } else {
          resolve();
        }
      });
    })
  ));
}

/**
 * Create default system labels for a user
 */
function createSystemLabels(userId) {
  const systemLabels = [
    { name: 'Work', color: '#ff6b35', description: 'Work-related emails' },
    { name: 'Personal', color: '#4ecdc4', description: 'Personal correspondence' },
    { name: 'Finance', color: '#45b7d1', description: 'Banking and financial emails' },
    { name: 'Shopping', color: '#96ceb4', description: 'Orders and e-commerce' },
    { name: 'Travel', color: '#feca57', description: 'Travel bookings and confirmations' },
    { name: 'Newsletter', color: '#a55eea', description: 'Newsletters and subscriptions' },
    { name: 'Social', color: '#fd79a8', description: 'Social media notifications' },
    { name: 'Support', color: '#fdcb6e', description: 'Customer support and help' },
    { name: 'Urgent', color: '#e17055', description: 'High priority emails' },
    { name: 'Archive', color: '#636e72', description: 'Archived emails' }
  ];

  const promises = systemLabels.map(label => createLabel({
    userId,
    name: label.name,
    color: label.color,
    description: label.description,
    isSystem: true
  }));

  return Promise.all(promises);
}

/**
 * Create a new label
 */
function createLabel(labelData) {
  const {
    userId,
    name,
    color = '#007bff',
    description = null,
    isSystem = false,
    isGmailLabel = false,
    gmailLabelId = null
  } = labelData;

  const sql = `
    INSERT INTO labels (
      user_id, name, color, description, is_system, is_gmail_label, gmail_label_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  return new Promise((resolve, reject) => {
    db.run(
      sql,
      [userId, name, color, description, isSystem, isGmailLabel, gmailLabelId],
      function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            reject(new Error(`Label '${name}' already exists`));
          } else {
            console.error('❌ Error creating label:', err.message);
            reject(err);
          }
        } else {
          console.log(`✅ Label created with ID: ${this.lastID}`);
          resolve({ id: this.lastID, ...labelData });
        }
      }
    );
  });
}

/**
 * Find label by ID
 */
function findLabelById(id) {
  const sql = 'SELECT * FROM labels WHERE id = ?';

  return new Promise((resolve, reject) => {
    db.get(sql, [id], (err, row) => {
      if (err) {
        console.error('❌ Error finding label by ID:', err.message);
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

/**
 * Find label by name for a user
 */
function findLabelByName(userId, name) {
  const sql = 'SELECT * FROM labels WHERE user_id = ? AND name = ?';

  return new Promise((resolve, reject) => {
    db.get(sql, [userId, name], (err, row) => {
      if (err) {
        console.error('❌ Error finding label by name:', err.message);
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

/**
 * Get all labels for a user
 */
function getLabelsByUser(userId, includeSystem = true) {
  let sql = 'SELECT * FROM labels WHERE user_id = ?';
  const params = [userId];

  if (!includeSystem) {
    sql += ' AND is_system = 0';
  }

  sql += ' ORDER BY is_system DESC, name ASC';

  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('❌ Error getting labels by user:', err.message);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Update label
 */
function updateLabel(id, updateData) {
  const { name, color, description } = updateData;
  const sql = `
    UPDATE labels 
    SET name = ?, color = ?, description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  return new Promise((resolve, reject) => {
    db.run(sql, [name, color, description, id], function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          reject(new Error(`Label '${name}' already exists`));
        } else {
          console.error('❌ Error updating label:', err.message);
          reject(err);
        }
      } else {
        console.log(`✅ Label updated with ID: ${id}`);
        resolve({ changes: this.changes });
      }
    });
  });
}

/**
 * Delete label (and remove from all messages)
 */
function deleteLabel(id) {
  return new Promise((resolve, reject) => {
    // First check if it's a system label
    db.get('SELECT is_system FROM labels WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('❌ Error checking label:', err.message);
        reject(err);
        return;
      }

      if (row && row.is_system) {
        reject(new Error('Cannot delete system labels'));
        return;
      }

      // Delete the label (cascade will remove message_labels entries)
      db.run('DELETE FROM labels WHERE id = ?', [id], function(err) {
        if (err) {
          console.error('❌ Error deleting label:', err.message);
          reject(err);
        } else {
          console.log(`✅ Label deleted with ID: ${id}`);
          resolve({ changes: this.changes });
        }
      });
    });
  });
}

/**
 * Add label to message
 */
function addLabelToMessage(messageId, labelId) {
  const sql = 'INSERT OR IGNORE INTO message_labels (message_id, label_id) VALUES (?, ?)';

  return new Promise((resolve, reject) => {
    db.run(sql, [messageId, labelId], function(err) {
      if (err) {
        console.error('❌ Error adding label to message:', err.message);
        reject(err);
      } else {
        // Update label message count if a new association was created
        if (this.changes > 0) {
          updateLabelMessageCount(labelId);
        }
        console.log(`✅ Label ${labelId} added to message ${messageId}`);
        resolve({ changes: this.changes });
      }
    });
  });
}

/**
 * Remove label from message
 */
function removeLabelFromMessage(messageId, labelId) {
  const sql = 'DELETE FROM message_labels WHERE message_id = ? AND label_id = ?';

  return new Promise((resolve, reject) => {
    db.run(sql, [messageId, labelId], function(err) {
      if (err) {
        console.error('❌ Error removing label from message:', err.message);
        reject(err);
      } else {
        // Update label message count if an association was removed
        if (this.changes > 0) {
          updateLabelMessageCount(labelId);
        }
        console.log(`✅ Label ${labelId} removed from message ${messageId}`);
        resolve({ changes: this.changes });
      }
    });
  });
}

/**
 * Get labels for a specific message
 */
function getLabelsForMessage(messageId) {
  const sql = `
    SELECT l.* FROM labels l
    JOIN message_labels ml ON l.id = ml.label_id
    WHERE ml.message_id = ?
    ORDER BY l.name ASC
  `;

  return new Promise((resolve, reject) => {
    db.all(sql, [messageId], (err, rows) => {
      if (err) {
        console.error('❌ Error getting labels for message:', err.message);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Get messages for a specific label
 */
function getMessagesForLabel(labelId, options = {}) {
  const { limit = 50, offset = 0 } = options;
  const sql = `
    SELECT m.* FROM messages m
    JOIN message_labels ml ON m.id = ml.message_id
    WHERE ml.label_id = ?
    ORDER BY m.date DESC
    LIMIT ? OFFSET ?
  `;

  return new Promise((resolve, reject) => {
    db.all(sql, [labelId, limit, offset], (err, rows) => {
      if (err) {
        console.error('❌ Error getting messages for label:', err.message);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Update label message count
 */
function updateLabelMessageCount(labelId) {
  const sql = `
    UPDATE labels 
    SET message_count = (
      SELECT COUNT(*) FROM message_labels WHERE label_id = ?
    )
    WHERE id = ?
  `;

  db.run(sql, [labelId, labelId], (err) => {
    if (err) {
      console.error('❌ Error updating label message count:', err.message);
    }
  });
}

/**
 * Search labels by name
 */
function searchLabels(userId, query) {
  const sql = `
    SELECT * FROM labels 
    WHERE user_id = ? AND name LIKE ?
    ORDER BY name ASC
  `;

  return new Promise((resolve, reject) => {
    db.all(sql, [userId, `%${query}%`], (err, rows) => {
      if (err) {
        console.error('❌ Error searching labels:', err.message);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

// Initialize tables on import
Promise.all([
  createLabelsTable(),
  createMessageLabelsTable(),
  createLabelIndexes()
]).catch(err => {
  console.error('Failed to initialize labels tables:', err);
});

export {
  createLabelsTable,
  createMessageLabelsTable,
  createLabelIndexes,
  createSystemLabels,
  createLabel,
  findLabelById,
  findLabelByName,
  getLabelsByUser,
  updateLabel,
  deleteLabel,
  addLabelToMessage,
  removeLabelFromMessage,
  getLabelsForMessage,
  getMessagesForLabel,
  updateLabelMessageCount,
  searchLabels
};