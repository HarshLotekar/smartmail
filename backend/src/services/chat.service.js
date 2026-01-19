import * as aiConfig from '../config/ai.js';
import * as messageModel from '../models/message.model.js';

class ChatService {
  /**
   * Process user chat message and generate intelligent response
   */
  async processMessage(userId, userPrompt, conversationHistory = []) {
    try {
      // Fetch user's emails for context
      const userEmails = await messageModel.getMessagesByUser(userId);
      
      // Detect user intent from prompt
      const intent = this.detectIntent(userPrompt);
      
      // Filter relevant emails based on intent
      const relevantEmails = await this.filterRelevantEmails(
        userEmails, 
        userPrompt, 
        intent
      );
      
      // Build email context for AI
      const emailContext = this.buildEmailContext(relevantEmails);
      
      // Call AI chatbot with context
      const aiResponse = await aiConfig.chatWithAssistant(
        userPrompt,
        emailContext,
        conversationHistory,
        intent
      );
      
      // Build structured response
      const response = {
        success: true,
        message: aiResponse.response || aiResponse.message,
        suggestedActions: aiResponse.suggestedActions || [],
        relatedEmails: this.buildEmailPreviews(relevantEmails.slice(0, 5)),
        intent: intent,
        timestamp: new Date().toISOString()
      };
      
      return response;
      
    } catch (error) {
      console.error('Chat service error:', error);
      return {
        success: false,
        message: "I'm having trouble processing that request. Could you rephrase it?",
        suggestedActions: ['Show all emails', 'Summarize inbox', 'Help'],
        error: error.message
      };
    }
  }
  
  /**
   * Detect user intent from prompt
   */
  detectIntent(prompt) {
    const lowercasePrompt = prompt.toLowerCase();
    
    // Intent patterns
    if (lowercasePrompt.match(/summarize|summary|tldr|overview/)) {
      return 'summarize';
    }
    if (lowercasePrompt.match(/search|find|show|filter|get/)) {
      return 'search';
    }
    if (lowercasePrompt.match(/draft|reply|respond|write|compose/)) {
      return 'draft';
    }
    if (lowercasePrompt.match(/label|categorize|tag|organize/)) {
      return 'label';
    }
    if (lowercasePrompt.match(/mark as read|archive|delete|move/)) {
      return 'action';
    }
    if (lowercasePrompt.match(/explain|what is|tell me about/)) {
      return 'explain';
    }
    if (lowercasePrompt.match(/help|what can you do|capabilities/)) {
      return 'help';
    }
    if (lowercasePrompt.match(/urgent|important|priority/)) {
      return 'priority';
    }
    
    return 'general';
  }
  
  /**
   * Filter emails based on user query and intent
   */
  async filterRelevantEmails(allEmails, prompt, intent) {
    const lowercasePrompt = prompt.toLowerCase();
    let filtered = [...allEmails];
    
    // Filter by time period
    if (lowercasePrompt.includes('today')) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(email => 
        new Date(email.received_at) >= today
      );
    } else if (lowercasePrompt.includes('yesterday')) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(email => {
        const emailDate = new Date(email.received_at);
        return emailDate >= yesterday && emailDate < today;
      });
    } else if (lowercasePrompt.includes('this week')) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(email => 
        new Date(email.received_at) >= weekAgo
      );
    }
    
    // Filter by read status
    if (lowercasePrompt.includes('unread')) {
      filtered = filtered.filter(email => !email.is_read);
    } else if (lowercasePrompt.includes('read')) {
      filtered = filtered.filter(email => email.is_read);
    }
    
    // Filter by category/label
    const categories = ['work', 'personal', 'promotion', 'social', 'urgent', 'newsletter', 'spam'];
    for (const category of categories) {
      if (lowercasePrompt.includes(category)) {
        filtered = filtered.filter(email => 
          email.category?.toLowerCase() === category
        );
      }
    }
    
    // Filter by sender (extract from prompt)
    const senderMatch = prompt.match(/from\s+(\w+)/i);
    if (senderMatch) {
      const sender = senderMatch[1].toLowerCase();
      filtered = filtered.filter(email => 
        email.sender?.toLowerCase().includes(sender) ||
        email.sender_email?.toLowerCase().includes(sender)
      );
    }
    
    // Filter by keyword in subject or body
    const keywordMatch = prompt.match(/about\s+(\w+)/i);
    if (keywordMatch) {
      const keyword = keywordMatch[1].toLowerCase();
      filtered = filtered.filter(email => 
        email.subject?.toLowerCase().includes(keyword) ||
        email.body_text?.toLowerCase().includes(keyword)
      );
    }
    
    // Sort by date (most recent first)
    filtered.sort((a, b) => 
      new Date(b.received_at) - new Date(a.received_at)
    );
    
    // Limit results
    return filtered.slice(0, 20);
  }
  
  /**
   * Build email context for AI
   */
  buildEmailContext(emails) {
    if (!emails || emails.length === 0) {
      return 'No emails found matching the criteria.';
    }
    
    return emails.slice(0, 10).map((email, idx) => {
      return `${idx + 1}. From: ${email.sender || email.sender_email}
   Subject: ${email.subject || 'No Subject'}
   Date: ${new Date(email.received_at).toLocaleDateString()}
   Category: ${email.category || 'Uncategorized'}
   Snippet: ${email.snippet || email.body_text?.substring(0, 150) || 'No content'}...
   Read: ${email.is_read ? 'Yes' : 'No'}`;
    }).join('\n\n');
  }
  
  /**
   * Build email preview objects for frontend
   */
  buildEmailPreviews(emails) {
    if (!emails || emails.length === 0) return [];
    
    return emails.map(email => ({
      id: email.id,
      sender: email.sender || email.sender_email,
      subject: email.subject || 'No Subject',
      snippet: email.snippet || email.body_text?.substring(0, 100) || '',
      timestamp: email.received_at,
      category: email.category || 'Personal',
      isRead: email.is_read || false
    }));
  }
  
  /**
   * Execute suggested action
   */
  async executeAction(userId, action, emailIds = []) {
    try {
      switch (action.toLowerCase()) {
        case 'mark as read':
          for (const id of emailIds) {
            await messageModel.updateMessageReadStatus(id, true);
          }
          return { success: true, message: `Marked ${emailIds.length} email(s) as read` };
          
        case 'mark as unread':
          for (const id of emailIds) {
            await messageModel.updateMessageReadStatus(id, false);
          }
          return { success: true, message: `Marked ${emailIds.length} email(s) as unread` };
          
        case 'archive':
          for (const id of emailIds) {
            await messageModel.updateMessageArchived(id, true);
          }
          return { success: true, message: `Archived ${emailIds.length} email(s)` };
          
        default:
          return { success: false, message: 'Action not supported yet' };
      }
    } catch (error) {
      console.error('Action execution error:', error);
      return { success: false, message: error.message };
    }
  }
}

export default new ChatService();
