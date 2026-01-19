import db from '../config/db.js';

console.log('🔍 Checking email database...\n');

// Check if there are messages
db.get('SELECT COUNT(*) as count FROM messages', [], (err, row) => {
  if (err) {
    console.error('❌ Error querying messages:', err);
  } else {
    console.log(`📧 Total messages in database: ${row.count}`);
    
    if (row.count === 0) {
      console.log('\n⚠️  No emails found in database!');
      console.log('💡 You need to sync emails first by clicking "Sync" in the Inbox.');
    } else {
      // Check messages from last 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      
      db.get(
        'SELECT COUNT(*) as count FROM messages WHERE date >= ?',
        [cutoffDate.toISOString()],
        (err, row) => {
          if (err) {
            console.error('Error:', err);
          } else {
            console.log(`📅 Messages from last 90 days: ${row.count}`);
            
            // Check existing decisions
            db.get('SELECT COUNT(*) as count FROM email_decisions', [], (err, row) => {
              if (err) {
                console.error('Error:', err);
              } else {
                console.log(`🧠 Existing decision records: ${row.count}`);
                
                // Check pending decisions
                db.get(
                  'SELECT COUNT(*) as count FROM email_decisions WHERE decision_required = 1 AND status = "pending"',
                  [],
                  (err, row) => {
                    if (err) {
                      console.error('Error:', err);
                    } else {
                      console.log(`✅ Pending decisions: ${row.count}`);
                    }
                    
                    db.close(() => {
                      console.log('\n👋 Database connection closed');
                    });
                  }
                );
              }
            });
          }
        }
      );
    }
  }
});
