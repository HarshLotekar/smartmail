import db from '../config/db.js';

/**
 * Unsubscribe Model
 * Tracks unsubscribed email addresses
 */

/**
 * Create unsubscribe table
 */
function createUnsubscribeTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS unsubscribes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      email_address TEXT NOT NULL,
      domain TEXT,
      unsubscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      method TEXT,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(user_id, email_address)
    )
  `;

  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) {
        console.error('❌ Error creating unsubscribes table:', err.message);
        reject(err);
      } else {
        console.log('✅ Unsubscribes table ready');
        resolve();
      }
    });
  });
}

/**
 * Add unsubscribed email
 */
function addUnsubscribe(userId, emailAddress, method = 'http') {
  const domain = emailAddress.split('@')[1] || '';
  const sql = `INSERT OR REPLACE INTO unsubscribes (user_id, email_address, domain, method, unsubscribed_at) 
               VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;

  return new Promise((resolve, reject) => {
    db.run(sql, [userId, emailAddress, domain, method], function(err) {
      if (err) {
        console.error('❌ Error adding unsubscribe:', err.message);
        reject(err);
      } else {
        console.log(`✅ Added unsubscribe for ${emailAddress}`);
        resolve({ id: this.lastID });
      }
    });
  });
}

/**
 * Check if email is unsubscribed
 */
function isUnsubscribed(userId, emailAddress) {
  const sql = 'SELECT * FROM unsubscribes WHERE user_id = ? AND email_address = ?';

  return new Promise((resolve, reject) => {
    db.get(sql, [userId, emailAddress], (err, row) => {
      if (err) {
        console.error('❌ Error checking unsubscribe:', err.message);
        reject(err);
      } else {
        resolve(!!row);
      }
    });
  });
}

/**
 * Get all unsubscribed emails for user
 */
function getUnsubscribes(userId) {
  const sql = 'SELECT * FROM unsubscribes WHERE user_id = ? ORDER BY unsubscribed_at DESC';

  return new Promise((resolve, reject) => {
    db.all(sql, [userId], (err, rows) => {
      if (err) {
        console.error('❌ Error getting unsubscribes:', err.message);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Remove unsubscribe
 */
function removeUnsubscribe(userId, emailAddress) {
  const sql = 'DELETE FROM unsubscribes WHERE user_id = ? AND email_address = ?';

  return new Promise((resolve, reject) => {
    db.run(sql, [userId, emailAddress], function(err) {
      if (err) {
        console.error('❌ Error removing unsubscribe:', err.message);
        reject(err);
      } else {
        console.log(`✅ Removed unsubscribe for ${emailAddress}`);
        resolve({ changes: this.changes });
      }
    });
  });
}

export {
  createUnsubscribeTable,
  addUnsubscribe,
  isUnsubscribed,
  getUnsubscribes,
  removeUnsubscribe
};
