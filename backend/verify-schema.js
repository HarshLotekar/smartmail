import sqlite3 from 'sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'data', 'smartmail.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verifying database schema...\n');

// Check messages table
db.all('PRAGMA table_info(messages)', [], (err, rows) => {
  if (err) {
    console.error('❌ Error:', err.message);
  } else {
    console.log('📋 Messages table columns:');
    rows.forEach(r => {
      const mark = r.name === 'is_deleted' ? '✅ ' : '   ';
      console.log(`${mark}${r.name} (${r.type})`);
    });
    
    const hasIsDeleted = rows.some(r => r.name === 'is_deleted');
    console.log(hasIsDeleted ? '\n✅ is_deleted column exists!' : '\n❌ is_deleted column missing!');
  }
  
  // Check users table
  db.all('PRAGMA table_info(users)', [], (err2, rows2) => {
    if (err2) {
      console.error('❌ Error:', err2.message);
    } else {
      console.log('\n📋 Users table columns:');
      rows2.forEach(r => {
        const mark = r.name === 'gmail_history_id' ? '✅ ' : '   ';
        console.log(`${mark}${r.name} (${r.type})`);
      });
      
      const hasHistoryId = rows2.some(r => r.name === 'gmail_history_id');
      console.log(hasHistoryId ? '\n✅ gmail_history_id column exists!' : '\n❌ gmail_history_id column missing!');
    }
    
    db.close();
  });
});
