/**
 * Test Pre-Check Logic for Decision Classification
 * Demonstrates how the fast pre-check avoids unnecessary AI calls
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3001';

// Test emails - some should skip AI, some should use AI
const testCases = [
  {
    name: '✅ SKIP AI - Newsletter (no action indicators)',
    subject: 'Weekly Tech Newsletter - January 2026',
    content: 'Welcome to this week\'s newsletter! Here are the top stories in tech. AI continues to advance, new frameworks released, and industry trends. Enjoy reading!',
    expectedSkip: true
  },
  {
    name: '✅ SKIP AI - Promotional email',
    subject: '50% Off Sale - Limited Time Offer',
    content: 'Shop now and save 50% on all items. This weekend only! Check out our latest collection and enjoy free shipping on orders over $50.',
    expectedSkip: true
  },
  {
    name: '✅ SKIP AI - Status update (no questions)',
    subject: 'Project Status Update',
    content: 'The project is progressing well. We completed phase 1 and are now moving into phase 2. All team members are aligned on the timeline.',
    expectedSkip: true
  },
  {
    name: '🚀 USE AI - Contains question mark',
    subject: 'Quick question about the meeting',
    content: 'Hey, what time is the meeting tomorrow? I need to schedule around it.',
    expectedSkip: false,
    trigger: 'question mark'
  },
  {
    name: '🚀 USE AI - Contains "please confirm"',
    subject: 'Meeting Invitation',
    content: 'We have scheduled a meeting for tomorrow at 2pm. Please confirm your attendance so we can book the room.',
    expectedSkip: false,
    trigger: 'keyword: please confirm'
  },
  {
    name: '🚀 USE AI - Contains "deadline"',
    subject: 'Project Deliverable',
    content: 'The deadline for this project is Friday at 5pm. Make sure all materials are submitted before then.',
    expectedSkip: false,
    trigger: 'keyword: deadline'
  },
  {
    name: '🚀 USE AI - Contains "let me know"',
    subject: 'Feedback Request',
    content: 'I have updated the document with your suggestions. Let me know if this looks good or if you need any changes.',
    expectedSkip: false,
    trigger: 'keyword: let me know'
  },
  {
    name: '🚀 USE AI - Contains "urgent"',
    subject: 'URGENT: Server Issue',
    content: 'We are experiencing server downtime. The team is investigating but we need your input on the configuration settings.',
    expectedSkip: false,
    trigger: 'keyword: urgent'
  },
  {
    name: '🚀 USE AI - Contains "reply"',
    subject: 'Waiting for your reply',
    content: 'I sent the proposal last week and have not received a reply yet. Could you please review when you have a chance.',
    expectedSkip: false,
    trigger: 'keyword: reply'
  }
];

async function testPreCheck(testCase, index) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST ${index + 1}: ${testCase.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Subject: ${testCase.subject}`);
  console.log(`Content: ${testCase.content.substring(0, 80)}...`);
  console.log(`Expected: ${testCase.expectedSkip ? 'SKIP AI ⚡' : 'USE AI 🤖'}`);
  if (testCase.trigger) {
    console.log(`Trigger: ${testCase.trigger}`);
  }
  
  try {
    const startTime = Date.now();
    
    const response = await axios.post(
      `${API_BASE}/api/ai/classify-decision`,
      {
        subject: testCase.subject,
        content: testCase.content
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 35000
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const result = response.data;
    
    console.log('\n📊 RESULT:');
    console.log(`   Response Time: ${duration}ms ${duration < 100 ? '⚡ FAST' : duration < 2000 ? '✓ OK' : '⚠️ SLOW'}`);
    console.log(`   Skipped AI: ${result.skipped_ai ? '✅ YES (Pre-check)' : '❌ NO (Full AI)'}`);
    console.log(`   Decision Required: ${result.decision_required ? '✅ YES' : '❌ NO'}`);
    console.log(`   Decision Type: ${result.decision_type}`);
    console.log(`   Reason: ${result.reason}`);
    
    // Verify pre-check worked as expected
    const preCheckCorrect = result.skipped_ai === testCase.expectedSkip;
    const performanceGood = testCase.expectedSkip ? duration < 100 : true; // Should be very fast if skipped
    
    console.log(`\n   Pre-check Correct: ${preCheckCorrect ? '✅ PASS' : '❌ FAIL'}`);
    if (testCase.expectedSkip && performanceGood) {
      console.log(`   Performance: ✅ EXCELLENT (${duration}ms - no AI call)`);
    } else if (testCase.expectedSkip && !performanceGood) {
      console.log(`   Performance: ⚠️ WARNING (${duration}ms - should be faster)`);
    }
    
    return {
      passed: preCheckCorrect,
      skippedAI: result.skipped_ai,
      duration,
      expectedSkip: testCase.expectedSkip
    };
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.response?.data || error.message);
    return {
      passed: false,
      error: error.message,
      expectedSkip: testCase.expectedSkip
    };
  }
}

async function runTests() {
  console.log('\n⚡ EMAIL DECISION CLASSIFICATION - PRE-CHECK TEST SUITE');
  console.log('Testing fast pre-check to avoid unnecessary AI calls\n');
  
  const results = [];
  let totalDuration = 0;
  
  for (let i = 0; i < testCases.length; i++) {
    const result = await testPreCheck(testCases[i], i);
    results.push(result);
    totalDuration += result.duration || 0;
    
    // Small delay between tests
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📈 PRE-CHECK PERFORMANCE SUMMARY');
  console.log('='.repeat(80));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const skippedCount = results.filter(r => r.skippedAI).length;
  const aiCallsCount = results.filter(r => !r.skippedAI).length;
  
  console.log(`\nTest Results:`);
  console.log(`   Total Tests: ${results.length}`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  console.log(`\nPre-Check Efficiency:`);
  console.log(`   ⚡ Skipped AI: ${skippedCount} (${((skippedCount / results.length) * 100).toFixed(1)}%)`);
  console.log(`   🤖 Used AI: ${aiCallsCount} (${((aiCallsCount / results.length) * 100).toFixed(1)}%)`);
  
  console.log(`\nPerformance:`);
  console.log(`   Average Response Time: ${(totalDuration / results.length).toFixed(0)}ms`);
  
  const skippedResults = results.filter(r => r.skippedAI);
  if (skippedResults.length > 0) {
    const avgSkippedTime = skippedResults.reduce((sum, r) => sum + (r.duration || 0), 0) / skippedResults.length;
    console.log(`   Avg Time (Skipped): ${avgSkippedTime.toFixed(0)}ms ⚡`);
  }
  
  const aiResults = results.filter(r => !r.skippedAI);
  if (aiResults.length > 0) {
    const avgAITime = aiResults.reduce((sum, r) => sum + (r.duration || 0), 0) / aiResults.length;
    console.log(`   Avg Time (AI Used): ${avgAITime.toFixed(0)}ms 🤖`);
  }
  
  // Calculate cost savings
  const estimatedCostPerAICall = 0.0001; // $0.0001 per classification
  const savedCalls = skippedCount;
  const costSavings = savedCalls * estimatedCostPerAICall;
  
  console.log(`\nCost Efficiency:`);
  console.log(`   Estimated Savings: $${costSavings.toFixed(4)} (${savedCalls} AI calls avoided)`);
  console.log(`   Cost per 1000 emails: $${(estimatedCostPerAICall * aiCallsCount / results.length * 1000).toFixed(2)}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.forEach((result, index) => {
      if (!result.passed) {
        console.log(`   ${index + 1}. ${testCases[index].name}`);
        console.log(`      Expected Skip: ${result.expectedSkip}, Actual Skip: ${result.skippedAI}`);
      }
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✨ Pre-check test suite complete!\n');
}

// Run tests
console.log('Starting pre-check tests in 2 seconds...');
setTimeout(() => {
  runTests().catch(console.error);
}, 2000);
