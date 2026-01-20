import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine database path (Render or local)
const dataDir = process.env.NODE_ENV === 'production' && fs.existsSync('/opt/render/project/src/data')
  ? '/opt/render/project/src/data'
  : path.join(__dirname, '../data');

const dbPath = path.join(dataDir, 'smartmail.db');

console.log('📋 Running migration: Add internal_date column');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Check if column already exists
  db.all("PRAGMA table_info(messages)", (err, columns) => {
    if (err) {
      console.error('❌ Error checking table:', err.message);
      process.exit(1);
    }
    
    const hasInternalDate = columns.some(col => col.name === 'internal_date');
    
    if (hasInternalDate) {
      console.log('✅ Column internal_date already exists');
      db.close();
    } else {
      console.log('➕ Adding internal_date column...');
      db.run('ALTER TABLE messages ADD COLUMN internal_date INTEGER', (err) => {
        if (err) {
          console.error('❌ Migration failed:', err.message);
          process.exit(1);
        } else {
          console.log('✅ Migration completed successfully');
          db.close();
        }
      });
    }
  });
});
