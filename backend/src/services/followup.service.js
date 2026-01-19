import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Smart Follow-up Detection Service
 * Analyzes emails to detect if they need follow-up
 */

class FollowUpService {
  constructor() {
    this.aiProvider = process.env.AI_PROVIDER || 'fallback'; // Use keyword fallback by default
    
    if (this.aiProvider === 'claude') {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    } else if (this.aiProvider === 'groq') {
      this.groq = new Groq({
        apiKey: process.env.GROQ_API_KEY,
      });
    }
  }

  /**
   * Analyze email to detect if follow-up is needed
   */
  async analyzeForFollowUp(emailData) {
    const { subject, body, from, date } = emailData;
    
    const prompt = `Analyze this email and determine if it needs a follow-up reminder.

EMAIL FROM: ${from}
SUBJECT: ${subject}
DATE: ${date}
BODY: ${body}

Determine:
1. Does this email need follow-up? (yes/no)
2. Why? (reason in 1 sentence)
3. Urgency level: low, medium, high, or critical
4. Type: question, request, promise, deadline, or meeting
5. Suggested follow-up date (in days from now: 1, 3, 7, 14)
6. Confidence score (0.0 to 1.0)

Respond ONLY with valid JSON:
{
  "needsFollowUp": true/false,
  "reason": "string",
  "urgency": "low/medium/high/critical",
  "commitmentType": "question/request/promise/deadline/meeting",
  "suggestedDays": number,
  "confidence": number,
  "keywords": ["keyword1", "keyword2"]
}`;

    try {
      let response;
      
      console.log('🤖 AI Provider:', this.aiProvider);
      console.log('📧 Email data:', { subject, from: from?.substring(0, 50) });
      
      if (this.aiProvider === 'claude') {
        const message = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        });
        response = message.content[0].text;
      } else if (this.aiProvider === 'groq') {
        const completion = await this.groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.3,
        });
        response = completion.choices[0]?.message?.content || '{}';
      } else {
        // Use keyword-based fallback detection directly
        console.log('🔍 Using keyword-based detection');
        return this.fallbackDetection(subject, body);
      }

      // Clean and parse JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const analysis = JSON.parse(jsonMatch[0]);
      return analysis;
      
    } catch (error) {
      console.error('❌ Follow-up analysis error:', error.message);
      console.log('🔄 Falling back to keyword detection');
      
      // Fallback: basic keyword detection
      return this.fallbackDetection(emailData);
    }
  }

  /**
   * Fallback detection using keywords if AI fails
   */
  fallbackDetection(emailData) {
    const { subject, body } = emailData;
    const text = `${subject} ${body}`.toLowerCase();
    
    const questionMarkers = ['?', 'can you', 'could you', 'would you', 'please let me know'];
    const requestMarkers = ['please send', 'need you to', 'can you provide', 'waiting for'];
    const deadlineMarkers = ['by tomorrow', 'by friday', 'deadline', 'due date', 'asap', 'urgent'];
    const meetingMarkers = ['meeting', 'schedule', 'calendar', 'available', 'let\'s meet'];
    
    let needsFollowUp = false;
    let reason = 'No follow-up needed';
    let urgency = 'low';
    let commitmentType = 'none';
    let suggestedDays = 7;
    let keywords = [];
    
    // Detect questions
    if (questionMarkers.some(marker => text.includes(marker))) {
      needsFollowUp = true;
      reason = 'Contains unanswered question';
      commitmentType = 'question';
      suggestedDays = 3;
      urgency = 'medium';
      keywords.push('question');
    }
    
    // Detect requests
    if (requestMarkers.some(marker => text.includes(marker))) {
      needsFollowUp = true;
      reason = 'Contains pending request';
      commitmentType = 'request';
      suggestedDays = 5;
      urgency = 'medium';
      keywords.push('request');
    }
    
    // Detect deadlines
    if (deadlineMarkers.some(marker => text.includes(marker))) {
      needsFollowUp = true;
      reason = 'Contains time-sensitive deadline';
      commitmentType = 'deadline';
      suggestedDays = 1;
      urgency = 'high';
      keywords.push('deadline', 'urgent');
    }
    
    // Detect meetings
    if (meetingMarkers.some(marker => text.includes(marker))) {
      needsFollowUp = true;
      reason = 'Meeting needs scheduling';
      commitmentType = 'meeting';
      suggestedDays = 2;
      urgency = 'medium';
      keywords.push('meeting');
    }
    
    return {
      needsFollowUp,
      reason,
      urgency,
      commitmentType,
      suggestedDays,
      confidence: needsFollowUp ? 0.6 : 0.3,
      keywords
    };
  }

  /**
   * Calculate reminder date from suggested days
   */
  calculateReminderDate(daysFromNow) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString();
  }
}

export default new FollowUpService();
