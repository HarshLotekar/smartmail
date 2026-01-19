/**
 * Test Script for Email Decision Classification API
 * Run with: node test-decision-classifier.js
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3001';

// Test cases representing different decision types
const testEmails = [
  {
    name: 'Reply Required - Meeting Confirmation',
    subject: 'Project Review Meeting Tomorrow',
    content: 'Hi Team, we have the project review scheduled for tomorrow at 2pm. Can you please confirm your attendance? We need to finalize the room booking.',
    expected: 'reply_required'
  },
  {
    name: 'Deadline - Report Submission',
    subject: 'URGENT: Q4 Report Due Friday',
    content: 'The Q4 financial report must be submitted by this Friday at 5pm. This is a hard deadline from corporate. Please ensure all data is accurate and complete.',
    expected: 'deadline'
  },
  {
    name: 'Follow-Up - Status Update',
    subject: 'Checking in on project status',
    content: 'Hey, just wanted to check in on how the project is going. Let me know when you have a chance to discuss the progress. No rush, whenever you are free.',
    expected: 'follow_up'
  },
  {
    name: 'Informational - Newsletter',
    subject: 'Weekly Tech Newsletter - January 2026',
    content: 'Welcome to this weeks tech newsletter! Here are the top stories: AI advancements, new programming languages, and cloud computing trends. Enjoy your reading!',
    expected: 'informational_only'
  },
  {
    name: 'Deadline - Invoice Payment',
    subject: 'Invoice #12345 - Payment Due',
    content: 'Your invoice #12345 for $1,500 is due by January 20, 2026. Please process payment before the due date to avoid late fees. Payment details are attached.',
    expected: 'deadline'
  },
  {
    name: 'Reply Required - Question',
    subject: 'Quick question about the proposal',
    content: 'Do you think we should include the technical specifications in section 3 or create a separate appendix? I need your input before finalizing.',
    expected: 'reply_required'
  }
];

async function testClassification(email, index) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST ${index + 1}: ${email.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Subject: ${email.subject}`);
  console.log(`Content: ${email.content.substring(0, 100)}...`);
  console.log(`Expected Type: ${email.expected}`);
  
  try {
    const response = await axios.post(
      `${API_BASE}/api/ai/classify-decision`,
      {
        subject: email.subject,
        content: email.content
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 35000
      }
    );

    const result = response.data;
    
    console.log('\n📊 RESULT:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Decision Required: ${result.decision_required ? '✅ YES' : '❌ NO'}`);
    console.log(`   Decision Type: ${result.decision_type}`);
    console.log(`   Reason: ${result.reason}`);
    
    const isCorrect = result.decision_type === email.expected;
    console.log(`\n   Match Expected: ${isCorrect ? '✅ PASS' : '❌ FAIL'}`);
    
    return {
      passed: isCorrect,
      actual: result.decision_type,
      expected: email.expected
    };
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.response?.data || error.message);
    return {
      passed: false,
      actual: 'error',
      expected: email.expected,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('\n🧪 EMAIL DECISION CLASSIFICATION - TEST SUITE');
  console.log('Testing AI-powered email decision classifier\n');
  
  const results = [];
  
  for (let i = 0; i < testEmails.length; i++) {
    const result = await testClassification(testEmails[i], i);
    results.push(result);
    
    // Wait between tests to avoid rate limiting
    if (i < testEmails.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📈 TEST SUMMARY');
  console.log('='.repeat(80));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.forEach((result, index) => {
      if (!result.passed) {
        console.log(`   ${index + 1}. ${testEmails[index].name}`);
        console.log(`      Expected: ${result.expected}, Got: ${result.actual}`);
      }
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✨ Test suite complete!\n');
}

// Run tests
console.log('Starting tests in 3 seconds...');
setTimeout(() => {
  runTests().catch(console.error);
}, 3000);
