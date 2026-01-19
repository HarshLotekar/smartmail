import * as aiConfig from '../config/ai.js';

class ChatService {
  /**
   * Process user chat message with AI - no email context needed
   */
  async processMessage(userId, userPrompt, conversationHistory = []) {
    try {
      // Simple AI conversation without email context
      const aiResponse = await this.getAIResponse(userPrompt, conversationHistory);
      
      return {
        success: true,
        message: aiResponse,
        suggestedActions: this.getSuggestedActions(userPrompt),
        relatedEmails: [], // No emails shown
        intent: 'general',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Chat service error:', error);
      return {
        success: true,
        message: "I'm your email assistant! I can help answer questions, write emails, or provide suggestions. What would you like help with?",
        suggestedActions: ['Write an email', 'Get help', 'Ask a question'],
        relatedEmails: [],
        intent: 'general',
        timestamp: new Date().toISOString()
      };
    }
  }

  async getAIResponse(prompt, history) {
    const systemPrompt = `You are a helpful email writing assistant. Your job is to:

1. When user asks to write/draft/compose an email:
   - Write a complete, professional email based on their request
   - Include subject line, greeting, body, and closing
   - Format it clearly with line breaks
   - Match the tone they request (professional, casual, formal, friendly)

2. For other questions:
   - Answer helpfully in 1-3 sentences
   - Be friendly and conversational

3. Always be ready to:
   - Revise emails if asked
   - Make emails longer or shorter
   - Change the tone
   - Fix grammar

Examples:
User: "Write an email to my boss asking for time off"
You: "Here's your email:

Subject: Request for Time Off

Dear [Boss Name],

I hope this email finds you well. I would like to request time off from [start date] to [end date] for [reason - personal/vacation/family matter].

I will ensure all my current projects are completed before my leave, and I'm happy to brief the team on any ongoing tasks.

Please let me know if this works with the team schedule.

Best regards,
[Your Name]"

User: "Make it more casual"
You: "Here's a more casual version:

Subject: Time Off Request

Hi [Boss Name],

Hope you're doing well! I wanted to ask if I could take some time off from [start date] to [end date].

I'll make sure everything's wrapped up before I go, and I can hand off anything urgent to the team.

Let me know if that works!

Thanks,
[Your Name]"

Now respond to the user's request:`;

    try {
      // Call AI with simple prompt
      const response = await aiConfig.makeAIRequest(
        `${prompt}`,
        systemPrompt
      );
      
      return response.trim();
    } catch (error) {
      console.error('AI request failed:', error);
      
      // Fallback responses if AI fails
      return this.getFallbackResponse(prompt);
    }
  }

  getFallbackResponse(prompt) {
    const lower = prompt.toLowerCase();
    
    if (lower.match(/^(hi|hello|hey)/)) {
      return "Hello! I'm your email writing assistant. I can help you write professional emails. Try saying 'Write an email to...' or ask me anything!";
    }
    
    if (lower.includes('write') || lower.includes('draft') || lower.includes('compose')) {
      // Try to extract context
      const isBoss = lower.includes('boss') || lower.includes('manager');
      const isClient = lower.includes('client') || lower.includes('customer');
      const isColleague = lower.includes('colleague') || lower.includes('coworker') || lower.includes('team');
      
      let recipient = 'the recipient';
      if (isBoss) recipient = 'your boss';
      if (isClient) recipient = 'your client';
      if (isColleague) recipient = 'your colleague';
      
      return `Here's a draft email for ${recipient}:

Subject: [Your Subject Here]

Dear [Name],

I hope this email finds you well. I'm writing to [state your purpose - please provide more details about what you need].

[Add your main points here]

Please let me know if you have any questions or need additional information.

Best regards,
[Your Name]

💡 Tip: Tell me more about what you need to say, and I'll write a complete email for you!`;
    }
    
    if (lower.includes('help')) {
      return "I can help you write emails! Just tell me:\n- Who you're writing to\n- What you need to say\n- The tone you want (professional, casual, formal)\n\nExample: 'Write a professional email to my client about a project delay'";
    }
    
    if (lower.includes('thank')) {
      return "You're welcome! Need help with another email? Just ask!";
    }
    
    return "I'm your email writing assistant! Tell me who you want to write to and what you want to say. For example: 'Write an email to my boss requesting time off'";
  }

  getSuggestedActions(prompt) {
    const lower = prompt.toLowerCase();
    
    if (lower.includes('write') || lower.includes('email')) {
      return ['Compose email', 'Get template', 'Try again'];
    }
    
    if (lower.includes('help')) {
      return ['Write an email', 'Ask a question', 'Get tips'];
    }
    
    return ['Write an email', 'Ask question', 'Get help'];
  }
}

export default new ChatService();
