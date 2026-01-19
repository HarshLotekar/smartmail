import db from '../config/db.js';

/**
 * Message Model
 * Handles email messages and their metadata
 */

/**
 * Create messages table if it doesn't exist
 */
function createMessagesTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      gmail_id TEXT UNIQUE NOT NULL,
      thread_id TEXT,
      subject TEXT,
      from_email TEXT NOT NULL,
      from_name TEXT,
      to_email TEXT,
      to_name TEXT,
      cc_emails TEXT,
      bcc_emails TEXT,
      body_text TEXT,
      body_html TEXT,
      snippet TEXT,
      date DATETIME NOT NULL,
      is_read BOOLEAN DEFAULT 0,
      is_starred BOOLEAN DEFAULT 0,
      is_important BOOLEAN DEFAULT 0,
      is_archived BOOLEAN DEFAULT 0,
      is_deleted BOOLEAN DEFAULT 0,
      labels TEXT DEFAULT '[]',
      has_attachments BOOLEAN DEFAULT 0,
      attachments TEXT DEFAULT '[]',
      ai_summary TEXT,
      ai_category TEXT,
      ai_action_items TEXT,
      ai_sentiment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `;

  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) {
        console.error('❌ Error creating messages table:', err.message);
        reject(err);
      } else {
        console.log('✅ Messages table ready');
        resolve();
      }
    });
  });
}

/**
 * Create message indexes for better performance
 */
function createMessageIndexes() {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_gmail_id ON messages(gmail_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(date)',
    'CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read)',
    'CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id)'
  ];

  return Promise.all(indexes.map(sql => 
    new Promise((resolve, reject) => {
      db.run(sql, (err) => {
        if (err) {
          console.error('❌ Error creating message index:', err.message);
          reject(err);
        } else {
          resolve();
        }
      });
    })
  ));
}

/**
 * Create a new message
 */
function createMessage(messageData) {
  const {
    userId,
    gmailId,
    threadId,
    subject,
    fromEmail,
    fromName,
    toEmail,
    toName,
    ccEmails,
    bccEmails,
    bodyText,
    bodyHtml,
    snippet,
    date,
    internalDate,
    isRead = false,
    isStarred = false,
    isImportant = false,
    isSent = false,
    isArchived = false,
    isDeleted = false,
    labels = '[]',
    hasAttachments = false,
    attachments = '[]',
    requiresReply = false,
    requiresAction = false,
    isNewsletter = false,
    aiCategory = null
  } = messageData;

  const sql = `
    INSERT INTO messages (
      user_id, gmail_id, thread_id, subject, from_email, from_name,
      to_email, to_name, cc_emails, bcc_emails, body_text, body_html,
      snippet, date, internal_date, is_read, is_starred, is_important, is_sent,
      is_archived, is_deleted, labels, has_attachments, attachments,
      requires_reply, requires_action, is_newsletter, ai_category
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  return new Promise((resolve, reject) => {
    db.run(
      sql,
      [
        userId, gmailId, threadId, subject, fromEmail, fromName,
        toEmail, toName, ccEmails, bccEmails, bodyText, bodyHtml,
        snippet, date, internalDate, isRead, isStarred, isImportant, isSent,
        isArchived, isDeleted, labels, hasAttachments, attachments,
        requiresReply, requiresAction, isNewsletter, aiCategory
      ],
      function(err) {
        if (err) {
          console.error('❌ Error creating message:', err.message);
          reject(err);
        } else {
          console.log(`✅ Message created with ID: ${this.lastID}`);
          resolve({ id: this.lastID, ...messageData });
        }
      }
    );
  });
}

/**
 * Find message by Gmail ID
 */
function findMessageByGmailId(gmailId) {
  const sql = 'SELECT * FROM messages WHERE gmail_id = ?';

  return new Promise((resolve, reject) => {
    db.get(sql, [gmailId], (err, row) => {
      if (err) {
        console.error('❌ Error finding message by Gmail ID:', err.message);
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

/**
 * Find message by ID
 */
function findMessageById(id) {
  const sql = 'SELECT * FROM messages WHERE id = ?';

  return new Promise((resolve, reject) => {
    db.get(sql, [id], (err, row) => {
      if (err) {
        console.error('❌ Error finding message by ID:', err.message);
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

/**
 * Get messages for a user with pagination and filters
 */
function getMessagesByUser(userId, options = {}) {
  const {
    limit = 500,
    offset = 0,
    isRead = null,
    isSent = null,
    isStarred = null,
    isArchived = null,
    isDeleted = null,
    requiresAction = null,
    category = null,
    sortBy = 'date',
    sortOrder = 'DESC'
  } = options;

  let sql = 'SELECT * FROM messages WHERE user_id = ?';
  const params = [userId];

  // Add filters
  if (isRead !== null) {
    sql += ' AND is_read = ?';
    params.push(isRead);
  }
  if (isSent !== null) {
    sql += ' AND is_sent = ?';
    params.push(isSent);
  }
  if (isStarred !== null) {
    sql += ' AND is_starred = ?';
    params.push(isStarred);
  }
  if (isArchived !== null) {
    sql += ' AND is_archived = ?';
    params.push(isArchived);
  }
  if (isDeleted !== null) {
    sql += ' AND is_deleted = ?';
    params.push(isDeleted);
  }
  if (requiresAction !== null) {
    sql += ' AND requires_action = ?';
    params.push(requiresAction);
  }
  if (category) {
    sql += ' AND ai_category = ?';
    params.push(category);
  }

  // Add sorting and pagination
  sql += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('❌ Error getting messages by user:', err.message);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Update message read status
 */
function updateMessageReadStatus(id, isRead) {
  const sql = 'UPDATE messages SET is_read = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

  return new Promise((resolve, reject) => {
    db.run(sql, [isRead, id], function(err) {
      if (err) {
        console.error('❌ Error updating message read status:', err.message);
        reject(err);
      } else {
        console.log(`✅ Message read status updated for ID: ${id}`);
        resolve({ changes: this.changes });
      }
    });
  });
}

/**
 * Update message starred status
 */
function updateMessageStarred(id, isStarred) {
  const sql = 'UPDATE messages SET is_starred = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
  return new Promise((resolve, reject) => {
    db.run(sql, [isStarred, id], function(err) {
      if (err) {
        console.error('❌ Error updating message starred status:', err.message);
        reject(err);
      } else {
        console.log(`✅ Message starred status updated for ID: ${id}`);
        resolve({ changes: this.changes });
      }
    });
  });
}

/**
 * Update message AI category
 */
function updateMessageCategory(id, category) {
  const sql = 'UPDATE messages SET ai_category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
  return new Promise((resolve, reject) => {
    db.run(sql, [category, id], function(err) {
      if (err) {
        console.error('❌ Error updating message category:', err.message);
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
    });
  });
}

/**
 * Update an existing message by gmail_id with provided fields
 */
function updateMessageByGmailId(gmailId, fields = {}) {
  // Whitelist of updatable columns
  const allowed = new Set([
    'subject', 'from_email', 'from_name', 'to_email', 'to_name',
    'cc_emails', 'bcc_emails', 'body_text', 'body_html', 'snippet', 'date',
    'is_read', 'is_starred', 'is_important', 'is_archived', 'is_deleted', 'labels', 'attachments', 'ai_category'
  ])

  const setClauses = []
  const params = []

  for (const [key, value] of Object.entries(fields)) {
    if (!allowed.has(key)) continue
    setClauses.push(`${key} = ?`)
    params.push(value)
  }

  if (setClauses.length === 0) {
    return Promise.resolve({ changes: 0 })
  }

  const sql = `UPDATE messages SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE gmail_id = ?`
  params.push(gmailId)

  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        console.error('❌ Error updating message by gmail_id:', err.message)
        reject(err)
      } else {
        resolve({ changes: this.changes })
      }
    })
  })
}

/**
 * Update message archived status
 */
function updateMessageArchived(id, isArchived) {
  const sql = 'UPDATE messages SET is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

  return new Promise((resolve, reject) => {
    db.run(sql, [isArchived, id], function(err) {
      if (err) {
        console.error('❌ Error updating message archived status:', err.message);
        reject(err);
      } else {
        console.log(`✅ Message archived status updated for ID: ${id}`);
        resolve({ changes: this.changes });
      }
    });
  });
}

/**
 * Update message with multiple fields by ID
 */
function updateMessage(id, fields = {}) {
  const allowed = new Set([
    'subject', 'from_email', 'from_name', 'to_email', 'to_name',
    'cc_emails', 'bcc_emails', 'body_text', 'body_html', 'snippet', 'date',
    'is_read', 'is_starred', 'is_important', 'is_sent', 'is_archived', 'is_deleted', 
    'labels', 'attachments', 'ai_category', 'updated_at'
  ]);

  const setClauses = [];
  const params = [];

  for (const [key, value] of Object.entries(fields)) {
    if (!allowed.has(key)) continue;
    setClauses.push(`${key} = ?`);
    params.push(value);
  }

  if (setClauses.length === 0) {
    return Promise.resolve({ changes: 0 });
  }

  const sql = `UPDATE messages SET ${setClauses.join(', ')} WHERE id = ?`;
  params.push(id);

  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        console.error('❌ Error updating message by ID:', err.message);
        reject(err);
      } else {
        console.log(`✅ Message ${id} updated successfully`);
        resolve({ changes: this.changes });
      }
    });
  });
}

/**
 * Update message AI analysis
 */
function updateMessageAI(id, aiData) {
  const { summary, category, actionItems, sentiment } = aiData;
  const sql = `
    UPDATE messages 
    SET ai_summary = ?, ai_category = ?, ai_action_items = ?, ai_sentiment = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  return new Promise((resolve, reject) => {
    db.run(sql, [summary, category, actionItems, sentiment, id], function(err) {
      if (err) {
        console.error('❌ Error updating message AI data:', err.message);
        reject(err);
      } else {
        console.log(`✅ Message AI data updated for ID: ${id}`);
        resolve({ changes: this.changes });
      }
    });
  });
}

/**
 * Delete message
 */
function deleteMessage(id) {
  const sql = 'DELETE FROM messages WHERE id = ?';

  return new Promise((resolve, reject) => {
    db.run(sql, [id], function(err) {
      if (err) {
        console.error('❌ Error deleting message:', err.message);
        reject(err);
      } else {
        console.log(`✅ Message deleted with ID: ${id}`);
        resolve({ changes: this.changes });
      }
    });
  });
}

/**
 * Search messages by text content
 */
function searchMessages(userId, query, options = {}) {
  const { limit = 50, offset = 0 } = options;
  const sql = `
    SELECT * FROM messages 
    WHERE user_id = ? AND (
      subject LIKE ? OR 
      from_email LIKE ? OR 
      from_name LIKE ? OR 
      body_text LIKE ? OR 
      snippet LIKE ?
    )
    ORDER BY date DESC
    LIMIT ? OFFSET ?
  `;

  const searchTerm = `%${query}%`;
  const params = [userId, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, limit, offset];

  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('❌ Error searching messages:', err.message);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Get message statistics for a user
 */
function getMessageStats(userId) {
  const sql = `
    SELECT 
      COUNT(*) as total_messages,
      COUNT(CASE WHEN is_read = 0 THEN 1 END) as unread_messages,
      COUNT(CASE WHEN is_starred = 1 THEN 1 END) as starred_messages,
      COUNT(CASE WHEN is_archived = 1 THEN 1 END) as archived_messages,
      COUNT(CASE WHEN ai_summary IS NOT NULL THEN 1 END) as ai_processed_messages
    FROM messages 
    WHERE user_id = ?
  `;

  return new Promise((resolve, reject) => {
    db.get(sql, [userId], (err, row) => {
      if (err) {
        console.error('❌ Error getting message stats:', err.message);
        reject(err);
      } else {
        resolve(row || {});
      }
    });
  });
}

/**
 * Get messages by thread ID
 */
function getMessagesByThread(threadId) {
  const sql = 'SELECT * FROM messages WHERE thread_id = ? ORDER BY date ASC';

  return new Promise((resolve, reject) => {
    db.all(sql, [threadId], (err, rows) => {
      if (err) {
        console.error('❌ Error getting messages by thread:', err.message);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

// Import unsubscribe model to initialize its table
import { createUnsubscribeTable } from './unsubscribe.model.js';

// Initialize table on import
Promise.all([
  createMessagesTable(),
  createMessageIndexes(),
  createUnsubscribeTable()
]).catch(err => {
  console.error('Failed to initialize messages table:', err);
});

export {
  createMessagesTable,
  createMessageIndexes,
  createMessage,
  findMessageByGmailId,
  findMessageById,
  getMessagesByUser,
  updateMessageReadStatus,
  updateMessageStarred,
  updateMessageCategory,
  updateMessageArchived,
  updateMessage,
  updateMessageAI,
  deleteMessage,
  searchMessages,
  getMessageStats,
  getMessagesByThread,
  updateMessageByGmailId
};