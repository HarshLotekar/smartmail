import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path - create data directory if it doesn't exist
const dataDir = path.join(__dirname, '../../data');
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