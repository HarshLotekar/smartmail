import chatService from '../services/chat.service.clean.js';

/**
 * Handle chat message from user
 */
export const sendMessage = async (req, res) => {
  try {
    console.log('📨 Chat request received:', { 
      body: req.body,
      user: req.user,
      session: req.session ? 'exists' : 'missing'
    });
    
    const { message, conversationHistory = [] } = req.body;
    const userId = req.user.id;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    console.log('🤖 Processing message for user:', userId);
    
    // Process message with chat service
    const response = await chatService.processMessage(
      userId,
      message,
      conversationHistory
    );
    
    console.log('✅ Chat response:', response);
    
    return res.json(response);
    
  } catch (error) {
    console.error('❌ Chat controller error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      message: error.message
    });
  }
};

/**
 * Execute suggested action from chat
 */
export const executeAction = async (req, res) => {
  try {
    const { action, emailIds = [] } = req.body;
    const userId = req.user.id;
    
    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required'
      });
    }
    
    const result = await chatService.executeAction(userId, action, emailIds);
    
    return res.json(result);
    
  } catch (error) {
    console.error('Action execution error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to execute action',
      message: error.message
    });
  }
};

/**
 * Get chat capabilities and help
 */
export const getChatHelp = async (req, res) => {
  try {
    const helpInfo = {
      success: true,
      capabilities: [
        {
          category: 'Email Management',
          features: [
            'Summarize emails (today, this week, from specific sender)',
            'Search and filter emails by sender, subject, or keyword',
            'Mark emails as read/unread',
            'Archive or delete emails',
            'Organize by labels and categories'
          ]
        },
        {
          category: 'Smart Assistance',
          features: [
            'Draft replies to emails',
            'Explain email content in simple terms',
            'Identify urgent or important emails',
            'Suggest actions based on email content',
            'Analyze email tone and intent'
          ]
        },
        {
          category: 'Quick Actions',
          features: [
            'Show unread emails',
            'Find emails from specific sender',
            'Filter by date (today, yesterday, this week)',
            'Group by category (Work, Personal, Promotion, etc.)',
            'Highlight emails with attachments'
          ]
        }
      ],
      exampleQueries: [
        'Summarize my unread emails from today',
        'Find emails from Google about invoice',
        'Draft a reply to the last message from John',
        'Show only urgent emails',
        'Mark all promotional emails as read',
        'What can you help me with?'
      ],
      supportedIntents: [
        'summarize',
        'search',
        'draft',
        'label',
        'action',
        'explain',
        'priority',
        'help'
      ]
    };
    
    return res.json(helpInfo);
    
  } catch (error) {
    console.error('Help endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch help information'
    });
  }
};
