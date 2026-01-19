import sqlite3 from 'sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createDatabase() {
  console.log('🚀 Creating SmartMail Database (Simple Version)...\n');
  
  const dbPath = join(__dirname, 'database', 'smartmail.db');
  
  try {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        throw new Error(`Failed to create database: ${err.message}`);
      }
      console.log('✅ Database connection established');
    });
    
    // Create tables in the correct order
    console.log('📝 Creating tables...');
    
    // 1. Users table
    await runSQL(db, `
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
    `);
    console.log('  ✓ Users table');
    
    // 2. Messages table
    await runSQL(db, `
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        gmail_id TEXT NOT NULL,
        thread_id TEXT,
        subject TEXT,
        from_email TEXT,
        from_name TEXT,
        to_email TEXT,
        cc_email TEXT,
        bcc_email TEXT,
        date DATETIME,
        body_text TEXT,
        body_html TEXT,
        snippet TEXT,
        is_read BOOLEAN DEFAULT 0,
        is_starred BOOLEAN DEFAULT 0,
        is_important BOOLEAN DEFAULT 0,
        is_draft BOOLEAN DEFAULT 0,
        is_sent BOOLEAN DEFAULT 0,
        is_trash BOOLEAN DEFAULT 0,
        is_spam BOOLEAN DEFAULT 0,
        ai_processed BOOLEAN DEFAULT 0,
        ai_category TEXT,
        ai_priority INTEGER DEFAULT 0,
        ai_summary TEXT,
        ai_sentiment TEXT,
        ai_confidence REAL DEFAULT 0.0,
        ai_keywords TEXT,
        ai_entities TEXT,
        ai_suggested_reply TEXT,
        ai_processing_version TEXT DEFAULT '1.0',
        search_vector TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, gmail_id)
      )
    `);
    console.log('  ✓ Messages table');
    
    // 3. Labels table
    await runSQL(db, `
      CREATE TABLE IF NOT EXISTS labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#007bff',
        description TEXT,
        is_system BOOLEAN DEFAULT 0,
        gmail_label_id TEXT,
        auto_apply BOOLEAN DEFAULT 0,
        ai_rules TEXT,
        message_count INTEGER DEFAULT 0,
        last_used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, name)
      )
    `);
    console.log('  ✓ Labels table');
    
    // 4. Message_Labels junction table
    await runSQL(db, `
      CREATE TABLE IF NOT EXISTS message_labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER NOT NULL,
        label_id INTEGER NOT NULL,
        assigned_by TEXT DEFAULT 'user',
        confidence REAL DEFAULT 1.0,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE,
        FOREIGN KEY (label_id) REFERENCES labels (id) ON DELETE CASCADE,
        UNIQUE(message_id, label_id)
      )
    `);
    console.log('  ✓ Message_Labels table');
    
    // 5. Email_Threads table
    await runSQL(db, `
      CREATE TABLE IF NOT EXISTS email_threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        gmail_thread_id TEXT NOT NULL,
        subject TEXT,
        participants TEXT,
        message_count INTEGER DEFAULT 0,
        is_muted BOOLEAN DEFAULT 0,
        is_archived BOOLEAN DEFAULT 0,
        ai_summary TEXT,
        ai_importance REAL DEFAULT 0.0,
        ai_last_processed DATETIME,
        first_message_date DATETIME,
        last_message_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, gmail_thread_id)
      )
    `);
    console.log('  ✓ Email_Threads table');
    
    // 6. AI_Processing_Logs table
    await runSQL(db, `
      CREATE TABLE IF NOT EXISTS ai_processing_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        message_id INTEGER,
        processing_type TEXT NOT NULL,
        ai_provider TEXT NOT NULL,
        ai_model TEXT,
        input_data TEXT,
        output_data TEXT,
        processing_time_ms INTEGER,
        token_count INTEGER,
        success BOOLEAN DEFAULT 1,
        error_message TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE
      )
    `);
    console.log('  ✓ AI_Processing_Logs table');
    
    // 7. Schema_Version table
    await runSQL(db, `
      CREATE TABLE IF NOT EXISTS schema_version (
        version TEXT PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        description TEXT
      )
    `);
    console.log('  ✓ Schema_Version table');
    
    console.log('\n📈 Creating indexes...');
    
    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)',
      'CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages (user_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_gmail_id ON messages (gmail_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_date ON messages (date DESC)',
      'CREATE INDEX IF NOT EXISTS idx_messages_from_email ON messages (from_email)',
      'CREATE INDEX IF NOT EXISTS idx_messages_user_date ON messages (user_id, date DESC)',
      'CREATE INDEX IF NOT EXISTS idx_labels_user_id ON labels (user_id)',
      'CREATE INDEX IF NOT EXISTS idx_labels_name ON labels (name)',
      'CREATE INDEX IF NOT EXISTS idx_message_labels_message_id ON message_labels (message_id)',
      'CREATE INDEX IF NOT EXISTS idx_message_labels_label_id ON message_labels (label_id)',
      'CREATE INDEX IF NOT EXISTS idx_email_threads_user_id ON email_threads (user_id)',
      'CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON ai_processing_logs (user_id)'
    ];
    
    for (const indexSQL of indexes) {
      await runSQL(db, indexSQL);
    }
    console.log(`  ✓ Created ${indexes.length} indexes`);
    
    console.log('\n🔧 Configuring database settings...');
    
    // Configure database
    await runSQL(db, 'PRAGMA foreign_keys = ON');
    await runSQL(db, 'PRAGMA journal_mode = WAL');
    await runSQL(db, 'PRAGMA synchronous = NORMAL');
    console.log('  ✓ Database configuration applied');
    
    console.log('\n📊 Inserting schema version...');
    await runSQL(db, `
      INSERT OR REPLACE INTO schema_version (version, description) 
      VALUES ('1.0.0', 'Initial SmartMail database schema')
    `);
    console.log('  ✓ Schema version recorded');
    
    // Verify database structure
    console.log('\n🔍 Verifying database structure...');
    
    const tables = await new Promise((resolve, reject) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('📊 Created tables:');
    tables.forEach(table => {
      console.log(`  ✓ ${table.name}`);
    });
    
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      } else {
        console.log('\n🎉 Database created successfully!');
        console.log('📦 Database location: backend/database/smartmail.db');
        console.log('\n📋 Ready for use:');
        console.log('  ✓ All tables created');
        console.log('  ✓ Indexes optimized');
        console.log('  ✓ Foreign keys enabled');
        console.log('  ✓ WAL mode active');
        console.log('\n🚀 You can now start the SmartMail server!');
      }
    });
    
  } catch (error) {
    console.error('❌ Database creation failed:', error.message);
    process.exit(1);
  }
}

function runSQL(db, sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

createDatabase();