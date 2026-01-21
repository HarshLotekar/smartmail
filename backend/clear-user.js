import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'data', 'smartmail.db');
const db = new sqlite3.Database(dbPath);

db.run('DELETE FROM users WHERE id = 1', (err) => {
  if (err) {
    console.error('❌ Error:', err.message);
  } else {
    console.log('✅ User deleted. Please login again at http://localhost:5173');
  }
  db.close();
  process.exit(0);
});
