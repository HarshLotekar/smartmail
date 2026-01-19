import db from '../config/db.js';

console.log('🗑️  Clearing old decision records...\n');

db.run('DELETE FROM email_decisions', [], function(err) {
  if (err) {
    console.error('❌ Error:', err);
  } else {
    console.log(`✅ Deleted ${this.changes} old decision records`);
    console.log('\n💡 Now run: node src/scripts/classifyExistingEmails.js');
    console.log('   This will re-classify all emails with the new enhanced classifier.\n');
  }
  
  db.close(() => {
    console.log('👋 Done');
  });
});
