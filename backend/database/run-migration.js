import sqlite3 from 'sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../data/smartmail.db');
const db = new sqlite3.Database(dbPath);

console.log('📦 Running follow-ups table migration...');

try {
  const migration = readFileSync(
    join(__dirname, 'migrations', 'add_followups_table.sql'),
    'utf-8'
  );
  
  db.exec(migration, (err) => {
    if (err) {
      console.error('❌ Migration failed:', err.message);
    } else {
      console.log('✅ Follow-ups table created successfully!');
      
      // Verify table exists
      db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='follow_ups'
      `, [], (err, tables) => {
        if (err) {
          console.error('❌ Verification failed:', err.message);
        } else if (tables.length > 0) {
          console.log('✅ Table verified:', tables[0].name);
        }
        db.close();
      });
    }
  });
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  db.close();
}
