import db from '../config/db.js';

/**
 * User Model
 * Handles user data and authentication tokens
 */

/**
 * Create users table if it doesn't exist
 */
function createUsersTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at DATETIME,
      gmail_history_id TEXT,
      last_sync_at DATETIME,
      rate_limit_retry_after DATETIME,
      preferences TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) {
        console.error('❌ Error creating users table:', err.message);
        reject(err);
      } else {
        console.log('✅ Users table ready');
        resolve();
      }
    });
  });
}

/**
 * Create a new user
 */
function createUser(userData) {
  const {
    googleId,
    email,
    name,
    avatarUrl,
    accessToken,
    refreshToken,
    tokenExpiresAt,
    preferences = '{}'
  } = userData;

  const sql = `
    INSERT INTO users (
      google_id, email, name, avatar_url, access_token, 
      refresh_token, token_expires_at, preferences
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  return new Promise((resolve, reject) => {
    db.run(
      sql,
      [googleId, email, name, avatarUrl, accessToken, refreshToken, tokenExpiresAt, preferences],
      function(err) {
        if (err) {
          console.error('❌ Error creating user:', err.message);
          reject(err);
        } else {
          console.log(`✅ User created with ID: ${this.lastID}`);
          resolve({ id: this.lastID, ...userData });
        }
      }
    );
  });
}

/**
 * Find user by Google ID
 */
function findUserByGoogleId(googleId) {
  const sql = 'SELECT * FROM users WHERE google_id = ?';

  return new Promise((resolve, reject) => {
    db.get(sql, [googleId], (err, row) => {
      if (err) {
        console.error('❌ Error finding user by Google ID:', err.message);
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

/**
 * Find user by email
 */
function findUserByEmail(email) {
  const sql = 'SELECT * FROM users WHERE email = ?';

  return new Promise((resolve, reject) => {
    db.get(sql, [email], (err, row) => {
      if (err) {
        console.error('❌ Error finding user by email:', err.message);
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

/**
 * Find user by ID
 */
function findUserById(id) {
  const sql = 'SELECT * FROM users WHERE id = ?';

  return new Promise((resolve, reject) => {
    db.get(sql, [id], (err, row) => {
      if (err) {
        console.error('❌ Error finding user by ID:', err.message);
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

/**
 * Update user tokens
 */
function updateUserTokens(userId, accessToken, refreshToken, expiresAt) {
  const sql = `
    UPDATE users 
    SET access_token = ?, refresh_token = ?, token_expires_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  return new Promise((resolve, reject) => {
    db.run(sql, [accessToken, refreshToken, expiresAt, userId], function(err) {
      if (err) {
        console.error('❌ Error updating user tokens:', err.message);
        reject(err);
      } else {
        console.log(`✅ User tokens updated for ID: ${userId}`);
        resolve({ changes: this.changes });
      }
    });
  });
}

/**
 * Update user preferences
 */
function updateUserPreferences(userId, preferences) {
  const sql = `
    UPDATE users 
    SET preferences = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const preferencesJson = typeof preferences === 'string' ? preferences : JSON.stringify(preferences);

  return new Promise((resolve, reject) => {
    db.run(sql, [preferencesJson, userId], function(err) {
      if (err) {
        console.error('❌ Error updating user preferences:', err.message);
        reject(err);
      } else {
        console.log(`✅ User preferences updated for ID: ${userId}`);
        resolve({ changes: this.changes });
      }
    });
  });
}

/**
 * Update user profile
 */
function updateUserProfile(userId, profileData) {
  const { name, avatarUrl } = profileData;
  const sql = `
    UPDATE users 
    SET name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  return new Promise((resolve, reject) => {
    db.run(sql, [name, avatarUrl, userId], function(err) {
      if (err) {
        console.error('❌ Error updating user profile:', err.message);
        reject(err);
      } else {
        console.log(`✅ User profile updated for ID: ${userId}`);
        resolve({ changes: this.changes });
      }
    });
  });
}

/**
 * Delete user and all related data
 */
function deleteUser(userId) {
  const sql = 'DELETE FROM users WHERE id = ?';

  return new Promise((resolve, reject) => {
    db.run(sql, [userId], function(err) {
      if (err) {
        console.error('❌ Error deleting user:', err.message);
        reject(err);
      } else {
        console.log(`✅ User deleted with ID: ${userId}`);
        resolve({ changes: this.changes });
      }
    });
  });
}

/**
 * Get all users (admin function)
 */
function getAllUsers(limit = 50, offset = 0) {
  const sql = `
    SELECT id, google_id, email, name, avatar_url, created_at, updated_at 
    FROM users 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `;

  return new Promise((resolve, reject) => {
    db.all(sql, [limit, offset], (err, rows) => {
      if (err) {
        console.error('❌ Error getting all users:', err.message);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Check if user tokens are valid (not expired)
 */
function isTokenValid(user) {
  if (!user.token_expires_at) return false;
  
  const expiresAt = new Date(user.token_expires_at);
  const now = new Date();
  
  // Add 5 minute buffer for token refresh
  return expiresAt.getTime() > (now.getTime() + 5 * 60 * 1000);
}

/**
 * Update user's Gmail history ID for incremental sync
 */
function updateUserHistoryId(userId, historyId) {
  const sql = 'UPDATE users SET gmail_history_id = ?, last_sync_at = CURRENT_TIMESTAMP WHERE id = ?';
  
  return new Promise((resolve, reject) => {
    db.run(sql, [historyId, userId], function(err) {
      if (err) {
        console.error('❌ Error updating history ID:', err.message);
        reject(err);
      } else {
        resolve(this.changes > 0);
      }
    });
  });
}

/**
 * Set rate limit retry time for user
 */
function setRateLimitRetryAfter(userId, retryAfter) {
  const sql = 'UPDATE users SET rate_limit_retry_after = ? WHERE id = ?';
  
  return new Promise((resolve, reject) => {
    db.run(sql, [retryAfter, userId], function(err) {
      if (err) {
        console.error('❌ Error setting rate limit:', err.message);
        reject(err);
      } else {
        resolve(this.changes > 0);
      }
    });
  });
}

/**
 * Clear rate limit for user
 */
function clearRateLimit(userId) {
  const sql = 'UPDATE users SET rate_limit_retry_after = NULL WHERE id = ?';
  
  return new Promise((resolve, reject) => {
    db.run(sql, [userId], function(err) {
      if (err) {
        console.error('❌ Error clearing rate limit:', err.message);
        reject(err);
      } else {
        resolve(this.changes > 0);
      }
    });
  });
}

/**
 * Check if user is currently rate limited
 */
function isRateLimited(user) {
  if (!user.rate_limit_retry_after) return false;
  
  const retryAfter = new Date(user.rate_limit_retry_after);
  const now = new Date();
  
  return now < retryAfter;
}

// Initialize table on import
createUsersTable().catch(err => {
  console.error('Failed to initialize users table:', err);
});

export {
  createUsersTable,
  createUser,
  findUserByGoogleId,
  findUserByEmail,
  findUserById,
  updateUserTokens,
  updateUserPreferences,
  updateUserProfile,
  deleteUser,
  getAllUsers,
  isTokenValid,
  updateUserHistoryId,
  setRateLimitRetryAfter,
  clearRateLimit,
  isRateLimited
};