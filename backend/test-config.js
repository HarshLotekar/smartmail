// Test file to verify server configuration
console.log('🚀 Testing SmartMail Backend Configuration...\n');

try {
  // Test imports
  console.log('✅ Testing imports...');
  
  // Import config files
  import('./src/config/db.js').then(db => {
    console.log('✅ Database config loaded');
  }).catch(err => {
    console.error('❌ Database config error:', err.message);
  });
  
  import('./src/config/gmail.js').then(gmail => {
    console.log('✅ Gmail config loaded');
  }).catch(err => {
    console.error('❌ Gmail config error:', err.message);
  });
  
  import('./src/config/ai.js').then(ai => {
    console.log('✅ AI config loaded');
  }).catch(err => {
    console.error('❌ AI config error:', err.message);
  });
  
  // Test model imports
  import('./src/models/user.model.js').then(user => {
    console.log('✅ User model loaded');
  }).catch(err => {
    console.error('❌ User model error:', err.message);
  });
  
  import('./src/models/message.model.js').then(message => {
    console.log('✅ Message model loaded');
  }).catch(err => {
    console.error('❌ Message model error:', err.message);
  });
  
  import('./src/models/label.model.js').then(label => {
    console.log('✅ Label model loaded');
  }).catch(err => {
    console.error('❌ Label model error:', err.message);
  });
  
  // Test controller imports
  import('./src/controllers/auth.controller.js').then(auth => {
    console.log('✅ Auth controller loaded');
  }).catch(err => {
    console.error('❌ Auth controller error:', err.message);
  });
  
  import('./src/controllers/mail.controller.js').then(mail => {
    console.log('✅ Mail controller loaded');
  }).catch(err => {
    console.error('❌ Mail controller error:', err.message);
  });
  
  import('./src/controllers/ai.controller.js').then(ai => {
    console.log('✅ AI controller loaded');
  }).catch(err => {
    console.error('❌ AI controller error:', err.message);
  });
  
  import('./src/controllers/user.controller.js').then(user => {
    console.log('✅ User controller loaded');
  }).catch(err => {
    console.error('❌ User controller error:', err.message);
  });
  
  // Test route imports
  import('./src/routes/auth.routes.js').then(auth => {
    console.log('✅ Auth routes loaded');
  }).catch(err => {
    console.error('❌ Auth routes error:', err.message);
  });
  
  import('./src/routes/mail.routes.js').then(mail => {
    console.log('✅ Mail routes loaded');
  }).catch(err => {
    console.error('❌ Mail routes error:', err.message);
  });
  
  import('./src/routes/ai.routes.js').then(ai => {
    console.log('✅ AI routes loaded');
  }).catch(err => {
    console.error('❌ AI routes error:', err.message);
  });
  
  import('./src/routes/user.routes.js').then(user => {
    console.log('✅ User routes loaded');
  }).catch(err => {
    console.error('❌ User routes error:', err.message);
  });
  
  setTimeout(() => {
    console.log('\n🎉 Configuration test completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Create .env file with your API keys');
    console.log('2. Run: npm start');
    console.log('3. Test API endpoints');
    console.log('4. Begin frontend development');
  }, 3000);
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}