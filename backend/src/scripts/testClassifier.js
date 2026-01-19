import decisionModel from '../models/decision.model.js';
import decisionClassifier from '../services/decisionClassifier.service.js';

/**
 * Quick test of the decision classifier
 * Run with: node src/scripts/testClassifier.js
 */

async function testClassifier() {
  console.log('🧪 Testing Decision Classifier\n');
  
  // Test emails with different characteristics
  const testEmails = [
    {
      gmail_id: 'test_1',
      subject: 'Please confirm your attendance at the conference',
      from_email: 'events@conference.org',
      from_name: 'Conference Committee',
      body_text: 'We need your confirmation by Friday. Please RSVP.',
      snippet: 'Please confirm your attendance'
    },
    {
      gmail_id: 'test_2',
      subject: 'Weekly Newsletter - Latest Updates',
      from_email: 'newsletter@company.com',
      from_name: 'Company Newsletter',
      body_text: 'Here are this week\'s updates and news.',
      snippet: 'Weekly updates and news'
    },
    {
      gmail_id: 'test_3',
      subject: 'LinkedIn connection request',
      from_email: 'notifications@linkedin.com',
      from_name: 'LinkedIn',
      body_text: 'John Doe wants to connect with you on LinkedIn',
      snippet: 'Connection request from John Doe'
    },
    {
      gmail_id: 'test_4',
      subject: 'Action required: Approve expense report',
      from_email: 'finance@company.com',
      from_name: 'Finance Team',
      body_text: 'Your approval is needed for expense report #1234. Deadline: Tomorrow.',
      snippet: 'Approval needed for expense report'
    }
  ];
  
  console.log(`📧 Testing ${testEmails.length} sample emails:\n`);
  
  for (const email of testEmails) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Subject: ${email.subject}`);
      console.log(`From: ${email.from_name} <${email.from_email}>`);
      console.log('-'.repeat(60));
      
      const classification = await decisionClassifier.classifyEmail(email);
      
      console.log(`Decision Required: ${classification.decision_required ? '✅ YES' : '❌ NO'}`);
      console.log(`Score: ${classification.decision_score.toFixed(2)}`);
      console.log(`Type: ${classification.decision_type}`);
      console.log(`Reason: ${classification.decision_reason}`);
      console.log(`Method: ${classification.classification_method}`);
      
    } catch (error) {
      console.error(`❌ Error classifying:`, error.message);
    }
  }
  
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('✅ Test Complete');
  console.log('='.repeat(60));
}

// Run test
testClassifier()
  .then(() => {
    console.log('\n👋 Exiting...');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
