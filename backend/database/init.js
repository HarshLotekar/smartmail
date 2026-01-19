import fs from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Database initialization script
 * Run this to initialize the database with schema and seed data
 */

async function initializeDatabase() {
  try {
    console.log('🚀 Initializing SmartMail Database...\n');
    
    const dbPath = join(__dirname, 'smartmail.db');
    const schemaPath = join(__dirname, 'schema.sql');
    const seedPath = join(__dirname, 'seed.sql');
    
    console.log('📍 Database path:', dbPath);
    console.log('📄 Schema file:', schemaPath);
    
    // Create database connection
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        throw new Error(`Failed to create database: ${err.message}`);
      }
      console.log('✅ Database connection established');
    });
    
    // Read and execute schema
    console.log('📋 Loading schema...');
    const schemaSQL = await fs.readFile(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} schema statements...`);
    
    // Execute schema statements sequentially
    for (const [index, statement] of statements.entries()) {
      await new Promise((resolve, reject) => {
        db.run(statement + ';', (err) => {
          if (err) {
            console.error(`❌ Error in statement ${index + 1}:`, statement.substring(0, 50) + '...');
            reject(new Error(`Schema execution failed: ${err.message}`));
          } else {
            resolve();
          }
        });
      });
    }
    
    console.log('✅ Schema loaded successfully');
    
    // Load seed data if exists
    try {
      await fs.access(seedPath);
      console.log('🌱 Loading seed data...');
      
      const seedSQL = await fs.readFile(seedPath, 'utf8');
      const seedStatements = seedSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      console.log(`🌱 Executing ${seedStatements.length} seed statements...`);
      
      for (const [index, statement] of seedStatements.entries()) {
        if (statement.trim()) {
          await new Promise((resolve, reject) => {
            db.run(statement + ';', (err) => {
              if (err) {
                console.warn(`⚠️ Seed statement ${index + 1} warning: ${err.message}`);
                console.log(`Statement: ${statement.substring(0, 100)}...`);
              }
              resolve();
            });
          });
        }
      }
      
      console.log('✅ Seed data loaded successfully');
      
    } catch (seedError) {
      console.log('ℹ️ No seed data found (optional)');
    }
    
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
    
    const indexes = await new Promise((resolve, reject) => {
      db.all("SELECT name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL ORDER BY name", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`📈 Created indexes: ${indexes.length}`);
    
    // Close connection
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      } else {
        console.log('\n🎉 Database initialization completed successfully!');
        console.log('📦 Database location: backend/database/smartmail.db');
        console.log('\n📋 Next steps:');
        console.log('1. Configure .env file with your API keys');
        console.log('2. Start the server: npm start');
        console.log('3. Test API endpoints');
      }
    });
    
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

// Run initialization if this file is executed directly
if (process.argv[1] === __filename) {
  initializeDatabase();
}

export { initializeDatabase };