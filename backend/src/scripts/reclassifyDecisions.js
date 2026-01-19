/**
 * Re-classify Decision Inbox with 3-Level System
 * 
 * This script re-processes all pending decisions using the new 3-level classification:
 * - Level 2: Hard decisions (explicit choices, mandatory actions)
 * - Level 1: Soft decisions (RSVPs, confirmations, interest checks)
 * - Level 0: Not decisions (newsletters, FYI, promotions)
 * 
 * Run: node backend/src/scripts/reclassifyDecisions.js
 */

import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { classifyEmail } from '../services/decisionClassifier.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path
const DB_PATH = join(__dirname, '../../data/smartmail.db');

/**
 * Get all emails to re-classify (including existing decisions)
 */
async function getEmailsToClassify(db) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        ed.id as decision_id,
        ed.email_id,
        ed.user_id,
        ed.decision_score as old_score,
        ed.decision_type as old_type,
        ed.decision_level as old_level,
        m.gmail_id,
        m.subject,
        m.from_email,
        m.from_name,
        m.body_text,
        m.date
      FROM email_decisions ed
      LEFT JOIN messages m ON ed.email_id = m.gmail_id
      WHERE ed.status = 'pending'
      ORDER BY ed.detected_at DESC
    `;
    
    db.all(sql, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Update decision record with new 3-level classification
 */
async function updateDecision(db, decisionId, result) {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE email_decisions
      SET 
        decision_level = ?,
        decision_score = ?,
        decision_reason = ?,
        decision_type = ?,
        decision_required = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const params = [
      result.decision_level,
      result.confidence,
      result.reason,
      result.decision_type,
      result.decision_level > 0 ? 1 : 0,  // decision_required if level > 0
      decisionId
    ];
    
    db.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('RE-CLASSIFYING DECISION INBOX WITH 3-LEVEL SYSTEM');
  console.log('='.repeat(60));
  
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Database connection error:', err);
      process.exit(1);
    }
  });
  
  try {
    // Get all emails to reclassify
    console.log('\n📥 Fetching emails...');
    const emails = await getEmailsToClassify(db);
    console.log(`Found ${emails.length} emails to classify`);
    
    if (emails.length === 0) {
      console.log('\n✅ No emails to re-classify');
      db.close();
      return;
    }
    
    console.log('\n🔄 Classifying with 3-level system...\n');
    
    let level2Count = 0;  // Hard decisions
    let level1Count = 0;  // Soft decisions
    let level0Count = 0;  // Not decisions
    
    for (const email of emails) {
      const emailData = {
        gmail_id: email.gmail_id,
        subject: email.subject,
        from_email: email.from_email,
        from_name: email.from_name,
        body_text: email.body_text,
        date: email.date
      };
      
      // Re-classify with new 3-level system
      const result = await classifyEmail(emailData, email.user_id);
      
      // Update database
      await updateDecision(db, email.decision_id, result);
      
      // Track by level
      if (result.decision_level === 2) {
        level2Count++;
        console.log(`  🔴 Level 2: "${email.subject.substring(0, 60)}..."`);
        console.log(`      ${result.reason}`);
      } else if (result.decision_level === 1) {
        level1Count++;
        console.log(`  🟠 Level 1: "${email.subject.substring(0, 60)}..."`);
        console.log(`      ${result.reason}`);
      } else {
        level0Count++;
        console.log(`  ⚫ Level 0: "${email.subject.substring(0, 60)}..."`);
        console.log(`      ${result.reason}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('RE-CLASSIFICATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total emails processed: ${emails.length}`);
    console.log(`🔴 Level 2 (Hard Decisions): ${level2Count}`);
    console.log(`🟠 Level 1 (Soft Decisions): ${level1Count}`);
    console.log(`⚫ Level 0 (Not Decisions): ${level0Count}`);
    console.log(`\n📊 Decision Inbox will show: ${level2Count + level1Count} emails`);
    console.log(`   (${level2Count} hard + ${level1Count} soft decisions)`);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    db.close();
  }
}

// Check if running as main module
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
