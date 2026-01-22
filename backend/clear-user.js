import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'data', 'smartmail.db');
const db = new sqlite3.Database(dbPath);

console.log('🗑️ Clearing all messages to force re-sync with full details...');

db.run('DELETE FROM messages', (err) => {
  if (err) {
    console.error('❌ Error:', err.message);
  } else {
    console.log('✅ All messages deleted.');
    console.log('📝 Now click "Sync" button in the app to fetch full email details!');
    console.log('🌐 Go to: http://localhost:5173');
  }
  db.close();
  process.exit(0);
});
