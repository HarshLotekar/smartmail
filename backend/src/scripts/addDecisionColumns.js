import db from '../config/db.js';

/**
 * Add missing columns to email_decisions table
 */

async function addColumns() {
  console.log('🔧 Adding missing columns to email_decisions table...\n');
  
  const columns = [
    {
      name: 'decision_score',
      sql: 'ALTER TABLE email_decisions ADD COLUMN decision_score REAL DEFAULT 0.0'
    },
    {
      name: 'decision_reason',
      sql: 'ALTER TABLE email_decisions ADD COLUMN decision_reason TEXT'
    },
    {
      name: 'snoozed_until',
      sql: 'ALTER TABLE email_decisions ADD COLUMN snoozed_until DATETIME'
    }
  ];
  
  for (const column of columns) {
    try {
      await new Promise((resolve, reject) => {
        db.run(column.sql, (err) => {
          if (err) {
            if (err.message.includes('duplicate column name')) {
              console.log(`✓ Column ${column.name} already exists`);
              resolve();
            } else {
              reject(err);
            }
          } else {
            console.log(`✅ Added column: ${column.name}`);
            resolve();
          }
        });
      });
    } catch (error) {
      console.error(`❌ Error adding ${column.name}:`, error.message);
    }
  }
  
  // Update status constraint to allow new values
  console.log('\n🔧 Updating status constraint...');
  
  // Drop old triggers
  const dropTriggers = [
    'DROP TRIGGER IF EXISTS validate_decision_status_insert',
    'DROP TRIGGER IF EXISTS validate_decision_status_update'
  ];
  
  for (const sql of dropTriggers) {
    try {
      await new Promise((resolve, reject) => {
        db.run(sql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (error) {
      console.error('Error dropping trigger:', error.message);
    }
  }
  
  // Create new triggers
  const createTriggers = [
    `CREATE TRIGGER IF NOT EXISTS validate_decision_status_insert
     BEFORE INSERT ON email_decisions
     FOR EACH ROW
     WHEN NEW.status NOT IN ('pending', 'completed', 'ignored', 'snoozed')
     BEGIN
       SELECT RAISE(ABORT, 'Invalid status value. Must be "pending", "completed", "ignored", or "snoozed"');
     END`,
    `CREATE TRIGGER IF NOT EXISTS validate_decision_status_update
     BEFORE UPDATE ON email_decisions
     FOR EACH ROW
     WHEN NEW.status NOT IN ('pending', 'completed', 'ignored', 'snoozed')
     BEGIN
       SELECT RAISE(ABORT, 'Invalid status value. Must be "pending", "completed", "ignored", or "snoozed"');
     END`
  ];
  
  for (const sql of createTriggers) {
    try {
      await new Promise((resolve, reject) => {
        db.run(sql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ Created status validation trigger');
    } catch (error) {
      console.error('Error creating trigger:', error.message);
    }
  }
  
  console.log('\n✅ Database schema updated successfully!');
  
  // Verify columns exist
  console.log('\n🔍 Verifying schema...');
  db.all("PRAGMA table_info(email_decisions)", [], (err, rows) => {
    if (err) {
      console.error('Error checking schema:', err);
    } else {
      console.log('\nCurrent email_decisions columns:');
      rows.forEach(row => {
        console.log(`  - ${row.name} (${row.type})`);
      });
    }
    
    db.close(() => {
      console.log('\n👋 Database connection closed');
      process.exit(0);
    });
  });
}

// Run
addColumns().catch(error => {
  console.error('❌ Failed to add columns:', error);
  process.exit(1);
});
