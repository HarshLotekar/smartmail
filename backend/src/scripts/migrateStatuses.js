import db from '../config/db.js';

console.log('🔧 Migrating existing decision statuses...\n');

// Update old 'done' status to 'completed'
db.run(
  `UPDATE email_decisions SET status = 'completed' WHERE status = 'done'`,
  [],
  function(err) {
    if (err) {
      console.error('❌ Error updating statuses:', err);
    } else {
      console.log(`✅ Updated ${this.changes} records from 'done' to 'completed'`);
    }
    
    // Check current statuses
    db.all(
      `SELECT status, COUNT(*) as count FROM email_decisions GROUP BY status`,
      [],
      (err, rows) => {
        if (err) {
          console.error('Error:', err);
        } else {
          console.log('\n📊 Current status distribution:');
          rows.forEach(row => {
            console.log(`   ${row.status}: ${row.count}`);
          });
        }
        
        // Check if there are any decisions that should be pending
        db.all(
          `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN decision_required = 1 THEN 1 ELSE 0 END) as required,
            SUM(CASE WHEN decision_required = 1 AND status = 'pending' THEN 1 ELSE 0 END) as pending
          FROM email_decisions`,
          [],
          (err, rows) => {
            if (err) {
              console.error('Error:', err);
            } else {
              const stats = rows[0];
              console.log(`\n📈 Decision Statistics:`);
              console.log(`   Total records: ${stats.total}`);
              console.log(`   Require decisions: ${stats.required}`);
              console.log(`   Pending decisions: ${stats.pending}`);
              
              if (stats.pending === 0 && stats.required > 0) {
                console.log('\n💡 Tip: All decisions are marked as completed.');
                console.log('   Run the classifier again to get fresh decision recommendations!');
              }
            }
            
            db.close(() => {
              console.log('\n👋 Done');
            });
          }
        );
      }
    );
  }
);
