import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path - support Render disk mount or local development
const dataDir = process.env.NODE_ENV === 'production' && fs.existsSync('/opt/render/project/src/data')
  ? '/opt/render/project/src/data'
  : path.join(__dirname, '../../data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'smartmail.db');

// Enable verbose mode in development
const sqlite = sqlite3.verbose();

// Create database connection
const db = new sqlite.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connected to SQLite database at:', dbPath);
  }
});

// Enable foreign key constraints
db.run('PRAGMA foreign_keys = ON;', (err) => {
  if (err) {
    console.error('❌ Error enabling foreign keys:', err.message);
  } else {
    console.log('✅ Foreign key constraints enabled');
  }
});

// Configure database for better performance
db.run('PRAGMA journal_mode = WAL;'); // Write-Ahead Logging
db.run('PRAGMA synchronous = NORMAL;'); // Faster than FULL, safer than OFF
db.run('PRAGMA cache_size = 1000;'); // Cache size in pages
db.run('PRAGMA temp_store = memory;'); // Store temp tables in memory

// Auto-initialize database schema if tables don't exist
const initSchema = () => {
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
    if (err) {
      console.error('❌ Error checking database schema:', err.message);
      return;
    }
    
    if (!row) {
      console.log('📋 Database empty, initializing schema...');
      const schemaPath = path.join(__dirname, '../../database/schema.sql');
      
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema, (err) => {
          if (err) {
            console.error('❌ Error initializing schema:', err.message);
          } else {
            console.log('✅ Database schema initialized successfully');
            runMigrations();
          }
        });
      } else {
        console.warn('⚠️ Schema file not found at:', schemaPath);
      }
    } else {
      console.log('✅ Database schema already exists');
      runMigrations();
    }
  });
};

// Run pending migrations
const runMigrations = () => {
  console.log('📋 Checking for pending migrations...');
  
  // Migration 1: Add missing columns to messages table
  db.all("PRAGMA table_info(messages)", (err, columns) => {
    if (err) {
      console.error('❌ Error checking messages table:', err.message);
      return;
    }
    
    const columnNames = columns.map(col => col.name);
    const missingColumns = [];
    
    // Check for all required columns from schema.sql
    if (!columnNames.includes('internal_date')) missingColumns.push(['internal_date', 'INTEGER']);
    if (!columnNames.includes('to_name')) missingColumns.push(['to_name', 'TEXT']);
    if (!columnNames.includes('from_name')) missingColumns.push(['from_name', 'TEXT']);
    if (!columnNames.includes('cc_email')) missingColumns.push(['cc_email', 'TEXT']);
    if (!columnNames.includes('bcc_email')) missingColumns.push(['bcc_email', 'TEXT']);
    if (!columnNames.includes('cc_emails')) missingColumns.push(['cc_emails', 'TEXT']);
    if (!columnNames.includes('bcc_emails')) missingColumns.push(['bcc_emails', 'TEXT']);
    if (!columnNames.includes('ai_processed')) missingColumns.push(['ai_processed', 'BOOLEAN DEFAULT 0']);
    if (!columnNames.includes('gmail_history_id')) missingColumns.push(['gmail_history_id', 'TEXT']);
    if (!columnNames.includes('is_deleted')) missingColumns.push(['is_deleted', 'BOOLEAN DEFAULT 0']);
    if (!columnNames.includes('is_sent')) missingColumns.push(['is_sent', 'BOOLEAN DEFAULT 0']);
    if (!columnNames.includes('is_draft')) missingColumns.push(['is_draft', 'BOOLEAN DEFAULT 0']);
    if (!columnNames.includes('is_sent')) missingColumns.push(['is_sent', 'BOOLEAN DEFAULT 0']);
    if (!columnNames.includes('is_trash')) missingColumns.push(['is_trash', 'BOOLEAN DEFAULT 0']);
    if (!columnNames.includes('is_spam')) missingColumns.push(['is_spam', 'BOOLEAN DEFAULT 0']);
    if (!columnNames.includes('is_archived')) missingColumns.push(['is_archived', 'BOOLEAN DEFAULT 0']);
    if (!columnNames.includes('ai_priority')) missingColumns.push(['ai_priority', 'INTEGER DEFAULT 0']);
    if (!columnNames.includes('requires_reply')) missingColumns.push(['requires_reply', 'BOOLEAN DEFAULT 0']);
    if (!columnNames.includes('requires_action')) missingColumns.push(['requires_action', 'BOOLEAN DEFAULT 0']);
    if (!columnNames.includes('is_newsletter')) missingColumns.push(['is_newsletter', 'BOOLEAN DEFAULT 0']);
    if (!columnNames.includes('ai_action_items')) missingColumns.push(['ai_action_items', 'TEXT']);
    if (!columnNames.includes('ai_confidence')) missingColumns.push(['ai_confidence', 'REAL DEFAULT 0.0']);
    if (!columnNames.includes('ai_sentiment')) missingColumns.push(['ai_sentiment', 'TEXT']);
    if (!columnNames.includes('ai_keywords')) missingColumns.push(['ai_keywords', 'TEXT']);
    if (!columnNames.includes('ai_entities')) missingColumns.push(['ai_entities', 'TEXT']);
    if (!columnNames.includes('ai_suggested_reply')) missingColumns.push(['ai_suggested_reply', 'TEXT']);
    if (!columnNames.includes('ai_processing_version')) missingColumns.push(['ai_processing_version', 'TEXT DEFAULT "1.0"']);
    if (!columnNames.includes('search_vector')) missingColumns.push(['search_vector', 'TEXT']);
    if (!columnNames.includes('labels')) missingColumns.push(['labels', 'TEXT DEFAULT "[]"']);
    if (!columnNames.includes('has_attachments')) missingColumns.push(['has_attachments', 'BOOLEAN DEFAULT 0']);
    if (!columnNames.includes('attachments')) missingColumns.push(['attachments', 'TEXT DEFAULT "[]"']);
    
    if (missingColumns.length > 0) {
      console.log(`➕ Adding ${missingColumns.length} missing columns to messages table...`);
      
      // Add columns one by one
      const addColumn = (index) => {
        if (index >= missingColumns.length) {
          console.log('✅ All message columns added');
          fixNullInternalDates();
          createUnsubscribesTable();
          return;
        }
        
        const [columnName, columnType] = missingColumns[index];
        db.run(`ALTER TABLE messages ADD COLUMN ${columnName} ${columnType}`, (err) => {
          if (err) {
            console.error(`❌ Error adding ${columnName}:`, err.message);
          } else {
            console.log(`✅ Added column: ${columnName}`);
          }
          addColumn(index + 1);
        });
      };
      
      addColumn(0);
    } else {
      console.log('✅ All message columns exist');
      fixNullInternalDates();
    }
    
    // Always check for missing tables (not just when columns are added)
    createAllMissingTables();
  });
};

// Create all missing tables from schema.sql
const createAllMissingTables = () => {
  console.log('📋 Creating missing tables...');
  
  // First: Create UNIQUE index on gmail_id for foreign key constraint
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_gmail_id ON messages(gmail_id)`, (err) => {
    if (err && !err.message.includes('already exists')) {
      console.error('❌ Error creating gmail_id index:', err.message);
    } else {
      console.log('✅ gmail_id unique index ready');
    }
  });
  
  // Create labels table
  db.run(`
    CREATE TABLE IF NOT EXISTS labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#007bff',
      description TEXT,
      is_system BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(user_id, name)
    )
  `, (err) => {
    if (err) console.error('❌ Error creating labels:', err.message);
    else console.log('✅ labels table ready');
  });
  
  // Create message_labels junction table
  db.run(`
    CREATE TABLE IF NOT EXISTS message_labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      label_id INTEGER NOT NULL,
      assigned_by TEXT DEFAULT 'user',
      confidence REAL DEFAULT 1.0,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE,
      FOREIGN KEY (label_id) REFERENCES labels (id) ON DELETE CASCADE,
      UNIQUE(message_id, label_id)
    )
  `, (err) => {
    if (err) console.error('❌ Error creating message_labels:', err.message);
    else console.log('✅ message_labels table ready');
  });
  
  // Create email_threads table
  db.run(`
    CREATE TABLE IF NOT EXISTS email_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      gmail_thread_id TEXT NOT NULL,
      subject TEXT,
      participants TEXT,
      message_count INTEGER DEFAULT 0,
      is_muted BOOLEAN DEFAULT 0,
      is_archived BOOLEAN DEFAULT 0,
      ai_summary TEXT,
      ai_importance REAL DEFAULT 0.0,
      ai_last_processed DATETIME,
      first_message_date DATETIME,
      last_message_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(user_id, gmail_thread_id)
    )
  `, (err) => {
    if (err) console.error('❌ Error creating email_threads:', err.message);
    else console.log('✅ email_threads table ready');
  });
  
  // Create ai_processing_logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_processing_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      message_id INTEGER,
      processing_type TEXT NOT NULL,
      ai_provider TEXT NOT NULL,
      ai_model TEXT,
      input_data TEXT,
      output_data TEXT,
      processing_time_ms INTEGER,
      token_count INTEGER,
      success BOOLEAN DEFAULT 1,
      error_message TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ Error creating ai_processing_logs:', err.message);
    else console.log('✅ ai_processing_logs table ready');
  });
  
  // Drop and recreate email_decisions table without problematic foreign key
  db.run(`DROP TABLE IF EXISTS email_decisions`, (err) => {
    if (err) console.error('❌ Error dropping old email_decisions:', err.message);
    else console.log('🔄 Dropped old email_decisions table');
    
    // Create email_decisions table WITHOUT foreign key on email_id (can't reference gmail_id due to composite UNIQUE)
    db.run(`
      CREATE TABLE email_decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        decision_required BOOLEAN NOT NULL DEFAULT 0,
        decision_type TEXT NOT NULL,
        decision_score REAL DEFAULT 0.0,
        decision_reason TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        snoozed_until DATETIME,
        detected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(email_id, user_id)
      )
    `, (err) => {
      if (err) console.error('❌ Error creating email_decisions:', err.message);
      else console.log('✅ email_decisions table recreated (FK constraint removed to fix mismatch)');
    });
  });
  
  // Drop and recreate followups table to ensure consistency
  db.run(`DROP TABLE IF EXISTS followups`, (err) => {
    if (err) console.error('❌ Error dropping old followups:', err.message);
    else console.log('🔄 Dropped old followups table');
    
    // Create followups table with proper foreign keys
    db.run(`
      CREATE TABLE followups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        email_id TEXT NOT NULL,
        followup_date DATETIME NOT NULL,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, email_id)
      )
    `, (err) => {
      if (err) console.error('❌ Error creating followups:', err.message);
      else console.log('✅ followups table recreated with proper foreign keys');
    });
  });
  
  // Create schema_version table
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    )
  `, (err) => {
    if (err) console.error('❌ Error creating schema_version:', err.message);
    else console.log('✅ schema_version table ready');
  });
  
  createUnsubscribesTable();
};

// Fix NULL internal_date values
const fixNullInternalDates = () => {
  db.run(`UPDATE messages 
          SET internal_date = CAST((julianday(COALESCE(date, created_at)) - 2440587.5) * 86400000 AS INTEGER)
          WHERE internal_date IS NULL`, 
    function(err) {
      if (err) {
        console.error('❌ Error fixing NULL internal_date:', err.message);
      } else if (this && this.changes > 0) {
        console.log(`✅ Fixed ${this.changes} NULL internal_date values`);
      } else {
        console.log('✅ All internal_date values are set');
      }
    }
  );
};

// Create unsubscribes table if it doesn't exist
const createUnsubscribesTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS unsubscribes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      email_address TEXT NOT NULL,
      sender_name TEXT,
      unsubscribe_method TEXT,
      unsubscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(user_id, email_address)
    )
  `;
  
  db.run(sql, (err) => {
    if (err) {
      console.error('❌ Error creating unsubscribes table:', err.message);
    } else {
      console.log('✅ Unsubscribes table ready');
      console.log('✅ All migrations completed');
    }
  });
};

initSchema();

// Graceful shutdown handler
process.on('SIGINT', () => {
  console.log('\n📴 Closing database connection...');
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err.message);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
});

export default db;