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
  
  // Check if internal_date column exists
  db.all("PRAGMA table_info(messages)", (err, columns) => {
    if (err) {
      console.error('❌ Error checking messages table:', err.message);
      return;
    }
    
    const hasInternalDate = columns.some(col => col.name === 'internal_date');
    
    if (!hasInternalDate) {
      console.log('➕ Running migration: Add internal_date column');
      db.run('ALTER TABLE messages ADD COLUMN internal_date INTEGER', (err) => {
        if (err) {
          console.error('❌ Migration failed:', err.message);
        } else {
          console.log('✅ Migration completed: internal_date column added');
        }
      });
    } else {
      console.log('✅ All migrations up to date');
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