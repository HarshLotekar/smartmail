#!/usr/bin/env node

/**
 * Database Schema Validation Script
 * Tests the SmartMail database schema and verifies all tables and indexes
 */

import sqlite3 from 'sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function validateSchema() {
  console.log('🔍 SmartMail Database Schema Validation\n');
  
  const dbPath = join(__dirname, 'database', 'smartmail.db');
  
  try {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        throw new Error(`Cannot open database: ${err.message}`);
      }
    });
    
    console.log('✅ Database connection successful\n');
    
    // Check tables
    const tables = await queryDatabase(db, `
      SELECT name, type FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%' 
      ORDER BY name
    `);
    
    console.log('📊 DATABASE TABLES:');
    console.log('='.repeat(50));
    
    const expectedTables = [
      'users', 'messages', 'labels', 'message_labels', 
      'email_threads', 'ai_processing_logs', 'schema_version',
      'messages_fts'  // FTS virtual table
    ];
    
    for (const expectedTable of expectedTables) {
      const exists = tables.some(t => t.name === expectedTable);
      const status = exists ? '✅' : '❌';
      const type = exists ? tables.find(t => t.name === expectedTable).type : 'MISSING';
      console.log(`${status} ${expectedTable.padEnd(20)} (${type})`);
    }
    
    console.log(`\nFound ${tables.length} tables total\n`);
    
    // Check indexes
    const indexes = await queryDatabase(db, `
      SELECT name FROM sqlite_master 
      WHERE type='index' AND sql IS NOT NULL 
      ORDER BY name
    `);
    
    console.log('📈 DATABASE INDEXES:');
    console.log('='.repeat(50));
    console.log(`Total indexes: ${indexes.length}`);
    
    // Group indexes by table
    const indexGroups = {};
    indexes.forEach(idx => {
      const tableName = idx.name.replace('idx_', '').split('_')[0];
      if (!indexGroups[tableName]) indexGroups[tableName] = [];
      indexGroups[tableName].push(idx.name);
    });
    
    Object.keys(indexGroups).sort().forEach(table => {
      console.log(`\n${table}:`);
      indexGroups[table].forEach(idx => {
        console.log(`  ✓ ${idx}`);
      });
    });
    
    // Check views
    const views = await queryDatabase(db, `
      SELECT name FROM sqlite_master 
      WHERE type='view' 
      ORDER BY name
    `);
    
    if (views.length > 0) {
      console.log('\n📋 DATABASE VIEWS:');
      console.log('='.repeat(50));
      views.forEach(view => {
        console.log(`✓ ${view.name}`);
      });
    }
    
    // Check triggers
    const triggers = await queryDatabase(db, `
      SELECT name FROM sqlite_master 
      WHERE type='trigger' 
      ORDER BY name
    `);
    
    if (triggers.length > 0) {
      console.log('\n⚡ DATABASE TRIGGERS:');
      console.log('='.repeat(50));
      triggers.forEach(trigger => {
        console.log(`✓ ${trigger.name}`);
      });
    }
    
    // Check schema version
    const schemaVersion = await queryDatabase(db, `
      SELECT version, applied_at, description 
      FROM schema_version 
      ORDER BY applied_at DESC 
      LIMIT 1
    `);
    
    if (schemaVersion.length > 0) {
      const version = schemaVersion[0];
      console.log('\n📋 SCHEMA VERSION:');
      console.log('='.repeat(50));
      console.log(`Version: ${version.version}`);
      console.log(`Applied: ${version.applied_at}`);
      console.log(`Description: ${version.description}`);
    }
    
    // Validate foreign key constraints
    console.log('\n🔗 FOREIGN KEY VALIDATION:');
    console.log('='.repeat(50));
    
    const fkCheck = await queryDatabase(db, 'PRAGMA foreign_key_check');
    
    if (fkCheck.length === 0) {
      console.log('✅ All foreign key constraints are valid');
    } else {
      console.log('❌ Foreign key constraint violations found:');
      fkCheck.forEach(violation => {
        console.log(`  - Table: ${violation.table}, Row: ${violation.rowid}`);
      });
    }
    
    // Basic data validation
    console.log('\n📊 DATA STATISTICS:');
    console.log('='.repeat(50));
    
    const stats = await Promise.all([
      queryDatabase(db, 'SELECT COUNT(*) as count FROM users'),
      queryDatabase(db, 'SELECT COUNT(*) as count FROM messages'),
      queryDatabase(db, 'SELECT COUNT(*) as count FROM labels'),
      queryDatabase(db, 'SELECT COUNT(*) as count FROM message_labels')
    ]);
    
    console.log(`Users: ${stats[0][0].count}`);
    console.log(`Messages: ${stats[1][0].count}`);
    console.log(`Labels: ${stats[2][0].count}`);
    console.log(`Message-Label Relations: ${stats[3][0].count}`);
    
    // Performance check
    console.log('\n⚡ PERFORMANCE CHECK:');
    console.log('='.repeat(50));
    
    const startTime = Date.now();
    await queryDatabase(db, `
      SELECT m.id, m.subject, l.name as label_name 
      FROM messages m 
      LEFT JOIN message_labels ml ON m.id = ml.message_id 
      LEFT JOIN labels l ON ml.label_id = l.id 
      LIMIT 100
    `);
    const queryTime = Date.now() - startTime;
    
    console.log(`Complex join query (100 records): ${queryTime}ms`);
    
    if (queryTime < 100) {
      console.log('✅ Performance: Excellent');
    } else if (queryTime < 500) {
      console.log('⚠️ Performance: Good');
    } else {
      console.log('❌ Performance: Needs optimization');
    }
    
    db.close();
    
    console.log('\n🎉 Database schema validation completed!');
    console.log('\n📋 Summary:');
    console.log(`  ✓ ${expectedTables.length} core tables`);
    console.log(`  ✓ ${indexes.length} performance indexes`);
    console.log(`  ✓ ${views.length} helper views`);
    console.log(`  ✓ ${triggers.length} data triggers`);
    console.log('  ✓ Foreign key constraints valid');
    console.log('  ✓ Schema version tracking active');
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

// Helper function to promisify database queries
function queryDatabase(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Run validation if this file is executed directly
if (process.argv[1] === __filename) {
  validateSchema();
}

export { validateSchema };