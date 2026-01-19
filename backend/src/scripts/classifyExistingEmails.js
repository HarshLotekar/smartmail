import db from '../config/db.js';
import decisionClassifier from '../services/decisionClassifier.service.js';

/**
 * Classify Existing Emails Script
 * 
 * Backfills the email_decisions table by classifying all existing emails
 * from the last 90 days.
 * 
 * Run with: node src/scripts/classifyExistingEmails.js
 */

const LOOKBACK_DAYS = 90;
const BATCH_SIZE = 50; // Process in batches to avoid memory issues

/**
 * Get all emails from last N days for a user
 */
function getRecentEmails(userId, days) {
  return new Promise((resolve, reject) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateStr = cutoffDate.toISOString();
    
    const sql = `
      SELECT 
        gmail_id,
        subject,
        from_email,
        from_name,
        body_text,
        snippet,
        date,
        is_read,
        ai_category
      FROM messages
      WHERE user_id = ? 
        AND date >= ?
        AND (is_deleted IS NULL OR is_deleted = 0)
      ORDER BY date DESC
    `;
    
    db.all(sql, [userId, cutoffDateStr], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Check if email already has a decision record
 */
function hasDecisionRecord(emailId, userId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id FROM email_decisions
      WHERE email_id = ? AND user_id = ?
      LIMIT 1
    `;
    
    db.get(sql, [emailId, userId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(!!row);
      }
    });
  });
}

/**
 * Save decision classification to database
 */
function saveDecision(emailId, userId, classification) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT OR REPLACE INTO email_decisions (
        email_id,
        user_id,
        decision_required,
        decision_score,
        decision_reason,
        decision_type,
        status,
        detected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    const status = classification.decision_required ? 'pending' : 'completed';
    
    db.run(
      sql,
      [
        emailId,
        userId,
        classification.decision_required ? 1 : 0,
        classification.decision_score,
        classification.decision_reason,
        classification.decision_type,
        status
      ],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

/**
 * Get all users
 */
function getAllUsers() {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT id, email FROM users';
    
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Process emails in batches
 */
async function processBatch(emails, userId, startIdx) {
  const batch = emails.slice(startIdx, startIdx + BATCH_SIZE);
  
  if (batch.length === 0) {
    return 0;
  }
  
  console.log(`\n📦 Processing batch ${Math.floor(startIdx / BATCH_SIZE) + 1} (${batch.length} emails)...`);
  
  let processedCount = 0;
  let decisionCount = 0;
  
  for (const email of batch) {
    try {
      // Skip if already classified
      const exists = await hasDecisionRecord(email.gmail_id, userId);
      if (exists) {
        console.log(`  ⏭️  Skipping ${email.gmail_id} (already classified)`);
        continue;
      }
      
      // Classify email
      const classification = await decisionClassifier.classifyEmail(email);
      
      // Save to database
      await saveDecision(email.gmail_id, userId, classification);
      
      processedCount++;
      if (classification.decision_required) {
        decisionCount++;
        console.log(`  ✅ ${email.subject?.substring(0, 50)} - DECISION (${classification.decision_score.toFixed(2)})`);
      } else {
        console.log(`  ℹ️  ${email.subject?.substring(0, 50)} - Info (${classification.decision_score.toFixed(2)})`);
      }
      
    } catch (error) {
      console.error(`  ❌ Error processing ${email.gmail_id}:`, error.message);
    }
  }
  
  console.log(`\n📊 Batch complete: ${decisionCount}/${processedCount} require decisions`);
  
  return processedCount;
}

/**
 * Main classification function
 */
async function classifyExistingEmails() {
  console.log('🚀 Starting email classification backfill...');
  console.log(`📅 Looking back ${LOOKBACK_DAYS} days`);
  console.log(`📦 Batch size: ${BATCH_SIZE} emails\n`);
  
  try {
    // Get all users
    const users = await getAllUsers();
    console.log(`👥 Found ${users.length} user(s)\n`);
    
    for (const user of users) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`👤 Processing user: ${user.email} (ID: ${user.id})`);
      console.log('='.repeat(60));
      
      // Get recent emails
      const emails = await getRecentEmails(user.id, LOOKBACK_DAYS);
      console.log(`📧 Found ${emails.length} emails from last ${LOOKBACK_DAYS} days`);
      
      if (emails.length === 0) {
        console.log('⏭️  No emails to process');
        continue;
      }
      
      // Process in batches
      let totalProcessed = 0;
      for (let i = 0; i < emails.length; i += BATCH_SIZE) {
        const processed = await processBatch(emails, user.id, i);
        totalProcessed += processed;
        
        // Small delay between batches to avoid overwhelming AI service
        if (i + BATCH_SIZE < emails.length) {
          console.log('\n⏳ Waiting 2 seconds before next batch...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log(`\n✅ User complete: ${totalProcessed} emails classified`);
    }
    
    // Print summary
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('🎉 CLASSIFICATION COMPLETE');
    console.log('='.repeat(60));
    
    // Get final stats
    const stats = await new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN decision_required = 1 THEN 1 ELSE 0 END) as decisions,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
        FROM email_decisions`,
        [],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    console.log(`\n📊 Final Statistics:`);
    console.log(`   Total classified: ${stats.total}`);
    console.log(`   Decisions required: ${stats.decisions}`);
    console.log(`   Pending decisions: ${stats.pending}`);
    console.log(`\n✨ Decision Inbox is now populated!`);
    
  } catch (error) {
    console.error('\n❌ Classification failed:', error);
    throw error;
  } finally {
    // Close database
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('\n👋 Database connection closed');
      }
    });
  }
}

// Run if called directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] && (
  process.argv[1] === __filename || 
  process.argv[1] === fileURLToPath(import.meta.url)
);

if (isMainModule) {
  classifyExistingEmails()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default classifyExistingEmails;
