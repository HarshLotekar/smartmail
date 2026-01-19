import * as messageModel from '../models/message.model.js';

class ChatService {
  /**
   * Process user chat message with simple rule-based responses
   */
  async processMessage(userId, userPrompt, conversationHistory = []) {
    try {
      const userEmails = await messageModel.getMessagesByUser(userId);
      const response = await this.generateSimpleResponse(userPrompt, userEmails);
      return response;
    } catch (error) {
      console.error('Chat service error:', error);
      return {
        success: true,
        message: "I'm here to help! Try asking: 'Show unread emails', 'Count my emails', or 'Help'.",
        suggestedActions: ['Show unread', 'Help', 'Summarize'],
        relatedEmails: []
      };
    }
  }

  async generateSimpleResponse(prompt, userEmails) {
    const lower = prompt.toLowerCase();
    const unread = userEmails.filter(e => e.is_read === 0);
    const today = userEmails.filter(e => {
      const d = new Date(e.date);
      return d.toDateString() === new Date().toDateString();
    });

    // Help
    if (lower.includes('help') || lower.includes('what can')) {
      return {
        success: true,
        message: "I can help you manage emails! Try: 'Show unread', 'Count emails', 'Summarize today', or 'Show recent'.",
        suggestedActions: ['Show unread', 'Count emails', 'Summarize'],
        relatedEmails: []
      };
    }

    // Greetings  
    if (lower.match(/^(hi|hello|hey|yo)/)) {
      return {
        success: true,
        message: `Hi! You have ${unread.length} unread emails. What would you like to do?`,
        suggestedActions: ['Show unread', 'Summarize', 'Help'],
        relatedEmails: this.buildPreviews(unread.slice(0, 3))
      };
    }

    // Count
    if (lower.includes('count') || lower.includes('how many')) {
      return {
        success: true,
        message: `Total: ${userEmails.length} emails | Unread: ${unread.length} | Today: ${today.length}`,
        suggestedActions: ['Show unread', 'Show today', 'Archive old'],
        relatedEmails: this.buildPreviews(unread.slice(0, 3))
      };
    }

    // Unread
    if (lower.includes('unread')) {
      return {
        success: true,
        message: `You have ${unread.length} unread emails:`,
        suggestedActions: ['Mark all read', 'Show more', 'Archive'],
        relatedEmails: this.buildPreviews(unread.slice(0, 5))
      };
    }

    // Today
    if (lower.includes('today') || lower.includes('recent')) {
      return {
        success: true,
        message: `${today.length} emails received today:`,
        suggestedActions: ['Show all', 'Mark read', 'Archive'],
        relatedEmails: this.buildPreviews(today.slice(0, 5))
      };
    }

    // Summary
    if (lower.includes('summar') || lower.includes('overview')) {
      const senders = [...new Set(userEmails.slice(0, 10).map(e => e.from_name || 'Unknown'))].slice(0, 3);
      return {
        success: true,
        message: `${userEmails.length} total, ${unread.length} unread. Recent from: ${senders.join(', ')}.`,
        suggestedActions: ['Show important', 'Archive old', 'Mark all read'],
        relatedEmails: this.buildPreviews(userEmails.slice(0, 5))
      };
    }

    // Compose
    if (lower.includes('write') || lower.includes('compose') || lower.includes('draft')) {
      return {
        success: true,
        message: "Click the Compose button in the sidebar to write an email!",
        suggestedActions: ['Open compose', 'Show templates', 'Help'],
        relatedEmails: []
      };
    }

    // Default
    return {
      success: true,
      message: `I can help with emails! Try: 'Show unread', 'Count emails', or 'Summarize'.`,
      suggestedActions: ['Show unread', 'Summarize', 'Help'],
      relatedEmails: this.buildPreviews(unread.slice(0, 3))
    };
  }

  buildPreviews(emails) {
    return emails.map(e => ({
      id: e.id,
      sender: e.from_name || e.from_email || 'Unknown',
      subject: e.subject || 'No Subject',
      snippet: (e.body_text || e.body_html || '').substring(0, 150),
      timestamp: e.date,
      category: 'Personal',
      isRead: e.is_read === 1
    }));
  }
}

export default new ChatService();
