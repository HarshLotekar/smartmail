import sqlite3 from 'sqlite3';
import fs from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testDatabaseCreation() {
  console.log('🧪 Testing database creation step by step...\n');
  
  const dbPath = join(__dirname, 'test.db');
  
  try {
    // Remove test db if exists
    try {
      await fs.unlink(dbPath);
      console.log('🗑️ Removed existing test database');
    } catch (e) {
      // File doesn't exist, that's fine
    }
    
    // Create database
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        throw new Error(`Failed to create database: ${err.message}`);
      }
      console.log('✅ Test database created');
    });
    
    // Test creating users table directly
    console.log('📝 Creating users table...');
    await new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          google_id TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          avatar_url TEXT,
          access_token TEXT,
          refresh_token TEXT,
          token_expires_at INTEGER,
          preferences TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      db.run(sql, (err) => {
        if (err) {
          reject(new Error(`Failed to create users table: ${err.message}`));
        } else {
          console.log('✅ Users table created successfully');
          resolve();
        }
      });
    });
    
    // Test creating an index
    console.log('📝 Creating index on users table...');
    await new Promise((resolve, reject) => {
      const sql = `CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)`;
      
      db.run(sql, (err) => {
        if (err) {
          reject(new Error(`Failed to create index: ${err.message}`));
        } else {
          console.log('✅ Index created successfully');
          resolve();
        }
      });
    });
    
    // Test inserting data
    console.log('📝 Testing data insertion...');
    await new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO users (google_id, email, name) 
        VALUES ('test123', 'test@example.com', 'Test User')
      `;
      
      db.run(sql, (err) => {
        if (err) {
          reject(new Error(`Failed to insert data: ${err.message}`));
        } else {
          console.log('✅ Data inserted successfully');
          resolve();
        }
      });
    });
    
    // Test querying data
    console.log('📝 Testing data query...');
    await new Promise((resolve, reject) => {
      const sql = `SELECT * FROM users WHERE email = 'test@example.com'`;
      
      db.get(sql, (err, row) => {
        if (err) {
          reject(new Error(`Failed to query data: ${err.message}`));
        } else {
          console.log('✅ Data queried successfully:', row);
          resolve();
        }
      });
    });
    
    db.close();
    
    console.log('\n🎉 Database test completed successfully!');
    console.log('✅ SQLite is working properly');
    console.log('✅ Table creation works');
    console.log('✅ Index creation works');
    console.log('✅ Data operations work');
    
    // Clean up
    await fs.unlink(dbPath);
    console.log('🗑️ Test database cleaned up');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
}

testDatabaseCreation();