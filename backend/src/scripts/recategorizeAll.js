import db from '../config/db.js';
import { smartLabelEmail } from '../utils/smartLabel.js';

/**
 * One-time script to re-categorize all existing emails
 * Run this with: node src/scripts/recategorizeAll.js
 */

async function recategorizeAll() {
  console.log('🔄 Starting re-categorization of all emails...\n');

  return new Promise((resolve, reject) => {
    // Get all emails
    db.all('SELECT id, from_email, subject, snippet, ai_category FROM messages', [], async (err, emails) => {
      if (err) {
        console.error('❌ Error fetching emails:', err);
        reject(err);
        return;
      }

      console.log(`📧 Found ${emails.length} emails to process\n`);

      let updated = 0;
      let skipped = 0;
      const stats = {};

      for (const email of emails) {
        // Re-categorize all emails with improved logic
        const oldCategory = email.ai_category;
        
        // Categorize using improved smart labeling
        const category = smartLabelEmail(
          email.from_email || '',
          email.subject || '',
          email.snippet || ''
        );
        
        // Skip if category unchanged
        if (oldCategory === category) {
          skipped++;
          continue;
        }

        // Update in database
        await new Promise((res, rej) => {
          db.run(
            'UPDATE messages SET ai_category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [category, email.id],
            function(err) {
              if (err) {
                console.error(`❌ Error updating email ${email.id}:`, err.message);
                rej(err);
              } else {
                updated++;
                stats[category] = (stats[category] || 0) + 1;
                res();
              }
            }
          );
        });

        // Log progress every 50 emails
        if (updated % 50 === 0) {
          console.log(`✅ Processed ${updated} emails...`);
        }
      }

      console.log('\n📊 Re-categorization Complete!');
      console.log(`   Total: ${emails.length}`);
      console.log(`   Updated: ${updated}`);
      console.log(`   Skipped: ${skipped}\n`);
      console.log('📈 Category Distribution:');
      Object.entries(stats)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, count]) => {
          console.log(`   ${cat}: ${count}`);
        });

      resolve();
    });
  });
}

// Run the script
recategorizeAll()
  .then(() => {
    console.log('\n✅ All done! Close this window and refresh your browser.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Failed:', err);
    process.exit(1);
  });
