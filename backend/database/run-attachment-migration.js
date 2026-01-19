import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationFile = path.join(__dirname, 'migrations', 'add_attachments_columns.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

console.log('🔄 Running migration: add_attachments_columns.sql\n');

// Split by semicolon and execute each statement
const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

let success = true;

for (const statement of statements) {
  try {
    db.run(statement.trim(), (err) => {
      if (err) {
        // Ignore "duplicate column" errors
        if (err.message.includes('duplicate column')) {
          console.log('⚠️  Column already exists, skipping...');
        } else {
          console.error('❌ Error:', err.message);
          success = false;
        }
      }
    });
  } catch (err) {
    if (err.message.includes('duplicate column')) {
      console.log('⚠️  Column already exists, skipping...');
    } else {
      console.error('❌ Error executing statement:', err.message);
      success = false;
    }
  }
}

// Wait a bit for async operations to complete
setTimeout(() => {
  if (success) {
    console.log('\n✅ Migration completed successfully!');
    console.log('📋 Added columns:');
    console.log('   - has_attachments (BOOLEAN)');
    console.log('   - attachments (TEXT/JSON)');
  } else {
    console.log('\n⚠️  Migration completed with warnings');
  }
  
  db.close(() => {
    console.log('👋 Database connection closed');
    process.exit(success ? 0 : 1);
  });
}, 1000);
