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
    
    // Check for all required columns
    if (!columnNames.includes('internal_date')) missingColumns.push(['internal_date', 'INTEGER']);
    if (!columnNames.includes('to_name')) missingColumns.push(['to_name', 'TEXT']);
    if (!columnNames.includes('is_deleted')) missingColumns.push(['is_deleted', 'BOOLEAN DEFAULT 0']);
    if (!columnNames.includes('is_draft')) missingColumns.push(['is_draft', 'BOOLEAN DEFAULT 0']);
    if (!columnNames.includes('is_sent')) missingColumns.push(['is_sent', 'BOOLEAN DEFAULT 0']);
    if (!columnNames.includes('is_trash')) missingColumns.push(['is_trash', 'BOOLEAN DEFAULT 0']);
    if (!columnNames.includes('is_spam')) missingColumns.push(['is_spam', 'BOOLEAN DEFAULT 0']);
    if (!columnNames.includes('ai_priority')) missingColumns.push(['ai_priority', 'INTEGER DEFAULT 0']);
    
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
      createUnsubscribesTable();
    }
  });
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