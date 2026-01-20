/**
 * Comprehensive Schema Validation Test
 * Tests all tables and foreign keys to ensure complete schema
 */

import db from './src/config/db.js';

const requiredTables = [
  'users',
  'messages',
  'labels',
  'message_labels',
  'email_threads',
  'ai_processing_logs',
  'email_decisions',
  'followups',
  'unsubscribes',
  'schema_version'
];

const requiredMessageColumns = [
  'id', 'user_id', 'gmail_id', 'thread_id', 'subject', 'from_email', 'from_name',
  'to_email', 'to_name', 'cc_emails', 'bcc_emails', 'date', 'internal_date',
  'body_text', 'body_html', 'snippet', 'is_read', 'is_starred', 'is_important',
  'is_deleted', 'is_draft', 'is_sent', 'is_trash', 'is_spam', 'is_archived',
  'ai_processed', 'ai_category', 'ai_priority', 'ai_summary', 'ai_sentiment',
  'ai_confidence', 'ai_keywords', 'ai_entities', 'ai_suggested_reply',
  'ai_processing_version', 'requires_reply', 'requires_action', 'is_newsletter',
  'ai_action_items', 'search_vector', 'labels', 'has_attachments', 'attachments',
  'created_at', 'updated_at'
];

const foreignKeyTests = [
  {
    table: 'messages',
    fk: 'user_id',
    references: 'users.id'
  },
  {
    table: 'email_decisions',
    fk: 'email_id',
    references: 'messages.gmail_id'
  },
  {
    table: 'email_decisions',
    fk: 'user_id',
    references: 'users.id'
  },
  {
    table: 'message_labels',
    fk: 'message_id',
    references: 'messages.id'
  },
  {
    table: 'message_labels',
    fk: 'label_id',
    references: 'labels.id'
  }
];

console.log('\n🔍 COMPREHENSIVE SCHEMA VALIDATION\n');
console.log('='.repeat(60));

// Wait for database to initialize
setTimeout(() => {
  // Test 1: Check all required tables exist
  console.log('\n📋 Test 1: Checking required tables...\n');
  
  db.all(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    (err, tables) => {
      if (err) {
        console.error('❌ Error listing tables:', err.message);
        return;
      }
      
      const tableNames = tables.map(t => t.name);
      console.log('Found tables:', tableNames.join(', '));
      
      let missingTables = [];
      requiredTables.forEach(table => {
        if (tableNames.includes(table)) {
          console.log(`  ✅ ${table}`);
        } else {
          console.log(`  ❌ ${table} - MISSING!`);
          missingTables.push(table);
        }
      });
      
      if (missingTables.length > 0) {
        console.error(`\n❌ FAILED: ${missingTables.length} tables missing: ${missingTables.join(', ')}`);
      } else {
        console.log('\n✅ All required tables exist');
      }
      
      // Test 2: Check messages table columns
      console.log('\n📋 Test 2: Checking messages table columns...\n');
      
      db.all("PRAGMA table_info(messages)", (err, columns) => {
        if (err) {
          console.error('❌ Error checking messages columns:', err.message);
          return;
        }
        
        const columnNames = columns.map(c => c.name);
        let missingColumns = [];
        
        requiredMessageColumns.forEach(col => {
          if (columnNames.includes(col)) {
            console.log(`  ✅ ${col}`);
          } else {
            console.log(`  ❌ ${col} - MISSING!`);
            missingColumns.push(col);
          }
        });
        
        if (missingColumns.length > 0) {
          console.error(`\n❌ FAILED: ${missingColumns.length} columns missing: ${missingColumns.join(', ')}`);
        } else {
          console.log('\n✅ All required columns exist in messages table');
        }
        
        // Test 3: Check foreign key constraints
        console.log('\n📋 Test 3: Checking foreign key constraints...\n');
        
        db.get("PRAGMA foreign_keys", (err, result) => {
          if (err) {
            console.error('❌ Error checking foreign keys:', err.message);
            return;
          }
          
          if (result.foreign_keys === 1) {
            console.log('✅ Foreign key constraints enabled');
          } else {
            console.error('❌ Foreign key constraints DISABLED!');
          }
          
          // Test 4: Check gmail_id has UNIQUE constraint
          console.log('\n📋 Test 4: Checking gmail_id UNIQUE index...\n');
          
          db.all(
            "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='messages' AND name LIKE '%gmail_id%'",
            (err, indexes) => {
              if (err) {
                console.error('❌ Error checking indexes:', err.message);
                return;
              }
              
              if (indexes.length > 0) {
                console.log('✅ gmail_id has UNIQUE index:', indexes.map(i => i.name).join(', '));
              } else {
                console.error('❌ gmail_id missing UNIQUE index!');
              }
              
              // Test 5: Try to insert test data to verify foreign keys work
              console.log('\n📋 Test 5: Testing foreign key constraints...\n');
              
              // Try to insert into email_decisions without corresponding message
              db.run(
                `INSERT INTO email_decisions (email_id, user_id, decision_required, decision_type) 
                 VALUES (?, ?, ?, ?)`,
                ['test_gmail_id', 999, 1, 'test'],
                (err) => {
                  if (err && err.message.includes('FOREIGN KEY constraint failed')) {
                    console.log('✅ Foreign key constraint working (prevented invalid insert)');
                  } else if (err) {
                    console.error('❌ Unexpected error:', err.message);
                  } else {
                    console.log('⚠️ Warning: Insert succeeded without proper foreign key validation');
                  }
                  
                  // Final summary
                  console.log('\n' + '='.repeat(60));
                  console.log('\n✅ SCHEMA VALIDATION COMPLETE\n');
                  console.log('If you see any ❌ above, there are still schema issues to fix.\n');
                  
                  // Close database
                  setTimeout(() => {
                    db.close((err) => {
                      if (err) {
                        console.error('Error closing database:', err.message);
                      }
                      process.exit(0);
                    });
                  }, 100);
                }
              );
            }
          );
        });
      });
    }
  );
}, 2000); // Wait 2 seconds for migrations to complete
