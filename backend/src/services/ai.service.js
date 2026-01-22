import * as aiConfig from '../config/ai.js';
import { findMessageById, updateMessageAI, getMessagesByUser } from '../models/message.model.js';
import { AppError } from '../middleware/errorHandler.js';
import axios from 'axios';
import dotenv from 'dotenv';
import he from 'he';
import db from '../config/db.js';
dotenv.config();

// Utility: Strip HTML tags and decode HTML entities
function sanitizeText(input = '') {
  if (!input) return '';
  // Remove HTML tags
  let text = input.replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Decode HTML entities
  text = he.decode(text);
  return text;
}

/**
 * Advanced email text cleaning for better summarization
 * Removes quoted replies, signatures, and noise
 */
function cleanEmailText(rawText) {
  if (!rawText) return '';
  
  let cleaned = rawText;
  
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  
  // Remove quoted replies (lines starting with >)
  cleaned = cleaned.replace(/^>.*/gm, '');
  
  // Remove "On [date] wrote:" patterns
  cleaned = cleaned.replace(/On\s+.+?wrote:/gi, '');
  
  // Remove common email footers
  cleaned = cleaned.replace(/Sent from my (iPhone|iPad|Android|Samsung|Mobile)/gi, '');
  cleaned = cleaned.replace(/Get Outlook for (iOS|Android)/gi, '');
  cleaned = cleaned.replace(/\b(Best regards?|Kind regards?|Sincerely|Thanks|Cheers),?\s*$/gim, '');
  
  // Remove email signatures (common patterns)
  cleaned = cleaned.replace(/^--+\s*$/gm, '');
  cleaned = cleaned.replace(/^_{2,}\s*$/gm, '');
  
  // Remove multiple newlines and spaces
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  
  // Decode HTML entities
  cleaned = he.decode(cleaned);
  
  return cleaned.trim();
}

/**
 * Suggest AI Reply Service
 */
export async function suggestReplyService(subject, content) {
  const cleanSubject = sanitizeText(subject);
  const cleanContent = sanitizeText(content);
  const text = `Generate 3 short, polite, natural email replies for this message.\nKeep them professional, under 20 words each, and relevant.\n\nSubject: ${cleanSubject}\nContent: ${cleanContent}\n\nReturn them as a simple numbered list.`;

  if ((process.env.AI_MODE || '').toLowerCase() === "ollama") {
    try {
      const response = await axios.post("http://localhost:11434/api/generate", {
        model: process.env.OLLAMA_MODEL || "llama3",
        prompt: text,
      }, { timeout: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10) });
      const raw = response.data.response.trim();
      return raw.split(/\n+/).map(r => r.replace(/^\d+[\).\s]*/, "").trim()).filter(Boolean);
    } catch (error) {
      console.error('Ollama AI Reply Error:', error.message);
      throw new Error('AI service unavailable');
    }
  }

  if ((process.env.AI_MODE || '').toLowerCase() === "gemini") {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
        { contents: [{ parts: [{ text }] }] },
        { headers: { 'Content-Type': 'application/json' }, timeout: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10) }
      );
      const raw = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const suggestions = raw
        .split(/\n+/)
        .map(r => r.replace(/^\d+[\).\s]*/, "").trim())
        .filter(Boolean);
      return suggestions.length > 0 ? suggestions : ["Thank you for your email.", "I'll get back to you soon.", "Received, will review."];
    } catch (error) {
      console.error('Gemini AI Reply Error:', error.response?.data || error.message);
      throw new Error('AI service unavailable');
    }
  }

  return ["Thank you for your email.", "I'll get back to you soon.", "Received, will review."];
}

/**
 * Draft a full email body using AI
 */
export async function draftEmailService(subject = '', content = '', instructions = '') {
  const cleanSubject = sanitizeText(subject);
  const cleanContent = sanitizeText(content);
  const cleanInstructions = sanitizeText(instructions);
  const text = [
    'Write a clear, concise email in a professional tone.',
    cleanInstructions && `Requirements: ${cleanInstructions}`,
    `Subject: ${cleanSubject || '(compose a suitable subject)'}`,
    cleanContent && `Context: ${cleanContent}`,
    'Return only the email body, without greetings if not necessary.'
  ].filter(Boolean).join('\n');

  const aiMode = (process.env.AI_MODE || process.env.AI_PROVIDER || '').toLowerCase();
  try {
    if (aiMode === 'ollama') {
      const response = await axios.post(
        `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/generate`,
        { model: process.env.OLLAMA_MODEL || 'llama3', prompt: text },
        { timeout: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10) }
      );
      return sanitizeText((response.data.response || '').trim());
    }
    if (aiMode === 'gemini') {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
        { contents: [{ parts: [{ text }] }] },
        { headers: { 'Content-Type': 'application/json' }, timeout: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10) }
      );
      return sanitizeText(response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '');
    }
  } catch (error) {
    console.error('AI Draft Error:', error.response?.data || error.message);
  }
  // Fallback basic draft
  return `Hello,\n\n${cleanInstructions || 'Here is my response regarding your email.'}\n\nBest regards,`;
}

/**
 * AI Service for email analysis and reply generation
 */
class AIService {
  /**
   * Analyze and categorize email
   */
  async analyzeEmail(messageId, options = {}) {
    try {
  const message = await findMessageById(messageId);
      
      if (!message) {
        throw new AppError('Message not found', 404);
      }

      const { forceReanalysis = false } = options;

      // Skip analysis if already done and not forcing reanalysis
      if (message.ai_category && message.ai_summary && !forceReanalysis) {
        return {
          messageId,
          category: message.ai_category,
          priority: message.ai_priority,
          sentiment: message.ai_sentiment,
          summary: message.ai_summary,
          cached: true
        };
      }

      // Prepare content for analysis
      const emailContent = this.prepareContentForAnalysis(message);

      // Run AI analysis
      const analysisResults = await Promise.allSettled([
        this.categorizeEmail(emailContent),
        this.generateSummary(emailContent),
        this.analyzeSentiment(emailContent),
        this.calculatePriority(emailContent)
      ]);

      // Extract results (with fallbacks for failed analyses)
      const category = analysisResults[0].status === 'fulfilled' ? analysisResults[0].value : 'Personal';
      const summary = analysisResults[1].status === 'fulfilled' ? analysisResults[1].value : 'No summary available';
      const sentiment = analysisResults[2].status === 'fulfilled' ? analysisResults[2].value : 'neutral';
      const priority = analysisResults[3].status === 'fulfilled' ? analysisResults[3].value : 0;

      // Update message with AI analysis
      const updatedMessage = await updateMessageAI(messageId, {
        category,
        priority,
        sentiment,
        summary
      });

      return {
        messageId,
        category,
        priority,
        sentiment,
        summary,
        cached: false
      };
    } catch (error) {
      console.error('Email analysis failed:', error);
      throw new AppError('Failed to analyze email', 500);
    }
  }

  /**
   * Prepare email content for AI analysis
   */
  prepareContentForAnalysis(message) {
    const content = {
      subject: message.subject || 'No Subject',
      sender: message.sender || 'Unknown Sender',
      snippet: message.snippet || '',
      bodyText: message.body_text || message.snippet || ''
    };

    // Limit content length to avoid token limits
    const maxLength = 2000;
    if (content.bodyText.length > maxLength) {
      content.bodyText = content.bodyText.substring(0, maxLength) + '...';
    }

    return content;
  }

  /**
   * Categorize email using AI
   */
  async categorizeEmail(emailContent) {
    try {
      const category = await aiConfig.categorizeEmail(
        emailContent.subject,
        emailContent.sender,
        emailContent.snippet || emailContent.bodyText
      );

      // Validate category - updated to match our 7 labels
      const validCategories = ['Work', 'Personal', 'Promotion', 'Social', 'Urgent', 'Newsletter', 'Spam'];
      return validCategories.includes(category) ? category : 'Personal';
    } catch (error) {
      console.error('Email categorization failed:', error);
      return 'Personal';
    }
  }

  /**
   * Generate email summary using AI
   */
  async generateSummary(emailContent) {
    try {
      const fullContent = `Subject: ${emailContent.subject}\nFrom: ${emailContent.sender}\n\n${emailContent.bodyText}`;
      return await aiConfig.summarizeEmail(fullContent);
    } catch (error) {
      console.error('Email summarization failed:', error);
      return emailContent.snippet || 'Summary unavailable';
    }
  }

  /**
   * Analyze email sentiment
   */
  async analyzeSentiment(emailContent) {
    try {
      const fullContent = `Subject: ${emailContent.subject}\n\n${emailContent.bodyText}`;
      return await aiConfig.analyzeSentiment(fullContent);
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      return 'neutral';
    }
  }

  /**
   * Calculate email priority based on content
   */
  async calculatePriority(emailContent) {
    try {
      const prompt = `
Analyze this email and rate its priority from 0-5 (0=lowest, 5=highest) based on urgency, importance, and content.

Email Details:
- Subject: ${emailContent.subject}
- Sender: ${emailContent.sender}
- Content: ${emailContent.bodyText.substring(0, 500)}

Consider:
- Urgent keywords (urgent, ASAP, deadline, important)
- Sender importance (boss, client, official)
- Content urgency (meetings, deadlines, problems)
- Call-to-action presence

Respond with only a number from 0-5:
      `.trim();

      const response = await aiConfig.generate(prompt, { temperature: 0.3, maxTokens: 10 });
      const priority = parseInt(response.trim());
      
      return isNaN(priority) ? 0 : Math.max(0, Math.min(5, priority));
    } catch (error) {
      console.error('Priority calculation failed:', error);
      return 0;
    }
  }

  /**
   * Generate email reply using AI
   */
  async generateReply(messageId, options = {}) {
    try {
  const message = await findMessageById(messageId);
      
      if (!message) {
        throw new AppError('Message not found', 404);
      }

      const {
        tone = 'professional',
        context = '',
        includeOriginal = true,
        language = 'en'
      } = options;

      // Prepare original email content
      const originalContent = this.formatOriginalForReply(message);
      
      // Generate reply using AI
      const reply = await aiConfig.generateReply(originalContent, tone, context);

      // Store generated reply in database
      const replyRecord = await this.storeGeneratedReply(messageId, message.user_id, {
        prompt: originalContent,
        reply,
        tone,
        context
      });

      return {
        messageId,
        replyId: replyRecord.id,
        reply,
        tone,
        originalSubject: message.subject,
        suggestedSubject: this.generateReplySubject(message.subject)
      };
    } catch (error) {
      console.error('Reply generation failed:', error);
      throw new AppError('Failed to generate reply', 500);
    }
  }

  /**
   * Format original email for reply generation
   */
  formatOriginalForReply(message) {
    return `
Original Email:
Subject: ${message.subject}
From: ${message.sender}
Date: ${new Date(message.received_date).toLocaleDateString()}

${message.body_text || message.snippet}
    `.trim();
  }

  /**
   * Generate suggested reply subject
   */
  generateReplySubject(originalSubject) {
    if (!originalSubject) return 'Re: ';
    
    if (originalSubject.toLowerCase().startsWith('re:')) {
      return originalSubject;
    }
    
    return `Re: ${originalSubject}`;
  }

  /**
   * Store generated reply in database
   */
  async storeGeneratedReply(messageId, userId, replyData) {
    // Implementation would use a database insert for ai_replies table
    // For now, return a mock record
    return {
      id: Date.now(),
      message_id: messageId,
      user_id: userId,
      prompt: replyData.prompt,
      generated_reply: replyData.reply,
      tone: replyData.tone,
      is_used: false,
      created_at: new Date()
    };
  }

  /**
   * Batch analyze multiple emails
   */
  async batchAnalyzeEmails(messageIds, options = {}) {
    const { concurrency = 3 } = options;
    const results = [];
    const errors = [];

    // Process in batches to avoid overwhelming AI service
    for (let i = 0; i < messageIds.length; i += concurrency) {
      const batch = messageIds.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (messageId) => {
        try {
          const result = await this.analyzeEmail(messageId, options);
          return { success: true, messageId, result };
        } catch (error) {
          return { success: false, messageId, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(result => {
        if (result.success) {
          results.push(result.result);
        } else {
          errors.push(result);
        }
      });

      // Brief pause between batches to respect rate limits
      if (i + concurrency < messageIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      processed: results.length,
      errors: errors.length,
      results,
      errorDetails: errors
    };
  }

  /**
   * Batch label emails using improved AI prompt (multiple emails in one request)
   */
  async batchLabelEmails(messages, options = {}) {
    try {
      if (!messages || messages.length === 0) {
        return { success: false, results: [], error: 'No messages provided' };
      }

      // Prepare emails for batch processing (max 10 at a time for better accuracy)
      const batchSize = Math.min(messages.length, 10);
      const emailsToLabel = messages.slice(0, batchSize);

      const systemMessage = `You are SmartMail AI — an intelligent email labeling engine for batch processing.

──────────────────────────────
🎯 GOAL
──────────────────────────────
Analyze and assign **accurate contextual labels** to multiple emails at once using subject line, sender, and body snippet.

──────────────────────────────
🧩 AVAILABLE LABEL CATEGORIES
──────────────────────────────
Business & Work:
- Meeting / Schedule
- Work Update
- Client Communication
- Project / Task
- Invoice / Payment
- Legal / Policy

Personal:
- Family / Friends
- Travel / Booking
- Personal Reminder
- Health / Wellness

Marketing & Promotions:
- Offer / Discount / Sale
- Newsletter / Subscription
- Brand Update
- Advertisement

Support:
- Customer Service
- Feedback / Review
- Bug Report

Others:
- Important / Urgent
- Spam / Irrelevant
- Uncategorized

──────────────────────────────
🧠 LOGIC & INSTRUCTIONS
──────────────────────────────
1. **Understand context deeply** — analyze subject, body snippet, and sender.
2. **Detect tone & intent** — identify purpose (e.g., request, invoice, update, reminder).
3. **Cross-check sender patterns** — e.g., "noreply@" → likely promotional or notification.
4. **Assign primary label** (one label per email for consistency).
5. **Estimate confidence** between 0 and 1 (how sure you are).
6. **Handle missing text gracefully** — infer from subject or sender.
7. **Be consistent** — similar emails must receive same category.
8. **If unsure, assign "Uncategorized"** with confidence score.

──────────────────────────────
🧩 RESPONSE FORMAT (CRITICAL)
──────────────────────────────
Return ONLY a valid JSON array in this exact format:
[
  {
    "subject": "string",
    "label": "Label Name",
    "confidence": 0.95,
    "reason": "Brief explanation"
  }
]

Example:
[
  {
    "subject": "Invoice #12345",
    "label": "Invoice / Payment",
    "confidence": 0.98,
    "reason": "Invoice with payment details from client"
  },
  {
    "subject": "Weekly Team Meeting",
    "label": "Meeting / Schedule",
    "confidence": 0.95,
    "reason": "Team meeting invitation"
  }
]`;

      const emailList = emailsToLabel.map((msg, idx) => 
        `${idx + 1}. Subject: "${msg.subject || 'No Subject'}"\n   Snippet: "${msg.snippet || msg.body_text?.substring(0, 150) || 'No content'}"`
      ).join('\n\n');

      const prompt = `📧 EMAILS TO ANALYZE:\n──────────────────────────────\n${emailList}\n\nReturn valid JSON array with label analysis for each email:`;

      const response = await aiConfig.makeAIRequest(prompt, systemMessage);

      try {
        // Extract JSON from response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          // Map results back to message IDs
          const results = emailsToLabel.map((msg, idx) => {
            const aiResult = parsed[idx] || { label: 'Uncategorized', confidence: 0.5, reason: 'Fallback' };
            
            // Map detailed labels to our 7 main categories
            const labelMapping = {
              'Meeting / Schedule': 'Work',
              'Work Update': 'Work',
              'Client Communication': 'Work',
              'Project / Task': 'Work',
              'Invoice / Payment': 'Work',
              'Legal / Policy': 'Work',
              'Family / Friends': 'Personal',
              'Travel / Booking': 'Personal',
              'Personal Reminder': 'Personal',
              'Health / Wellness': 'Personal',
              'Offer / Discount / Sale': 'Promotion',
              'Newsletter / Subscription': 'Newsletter',
              'Brand Update': 'Newsletter',
              'Advertisement': 'Promotion',
              'Customer Service': 'Work',
              'Feedback / Review': 'Work',
              'Bug Report': 'Work',
              'Important / Urgent': 'Urgent',
              'Spam / Irrelevant': 'Spam',
              'Uncategorized': 'Personal'
            };
            
            const mappedLabel = labelMapping[aiResult.label] || 'Personal';
            
            return {
              messageId: msg.id,
              subject: msg.subject,
              label: mappedLabel,
              detailedLabel: aiResult.label,
              confidence: aiResult.confidence || 0.7,
              reason: aiResult.reason || 'AI categorization'
            };
          });

          return {
            success: true,
            results,
            processed: results.length,
            provider: aiConfig.AI_PROVIDER
          };
        }
      } catch (parseError) {
        console.error('Failed to parse batch labeling response:', parseError.message);
      }

      // Fallback: process individually
      return await this.batchAnalyzeEmails(emailsToLabel.map(m => m.id), options);

    } catch (error) {
      console.error('Batch labeling failed:', error);
      return {
        success: false,
        results: [],
        error: error.message
      };
    }
  }

  /**
   * Generate multiple reply variations
   */
  async generateReplyVariations(messageId, options = {}) {
    const { tones = ['professional', 'casual', 'friendly'], count = 3 } = options;
    
    const variations = [];
    
    for (const tone of tones.slice(0, count)) {
      try {
        const reply = await this.generateReply(messageId, { ...options, tone });
        variations.push(reply);
      } catch (error) {
        console.error(`Failed to generate ${tone} reply:`, error);
      }
    }

    return variations;
  }

  /**
   * Get AI service status and capabilities
   */
  async getStatus() {
    try {
      const provider = aiConfig.getProvider();
      let isAvailable = false;
      let capabilities = [];

      if (provider === 'ollama') {
        isAvailable = await aiConfig.testOllamaConnection();
        capabilities = ['categorization', 'summarization', 'sentiment', 'reply_generation'];
      } else if (provider === 'gemini') {
        isAvailable = true; // Assume available if API key is configured
        capabilities = ['categorization', 'summarization', 'sentiment', 'reply_generation', 'advanced_analysis'];
      }

      return {
        provider,
        isAvailable,
        capabilities,
        model: provider === 'ollama' ? aiConfig.ollamaModel : aiConfig.geminiModel
      };
    } catch (error) {
      console.error('Failed to get AI service status:', error);
      return {
        provider: 'unknown',
        isAvailable: false,
        capabilities: [],
        error: error.message
      };
    }
  }

  /**
   * Smart email triage - automatically categorize and prioritize new emails
   */
  async smartTriage(userId, messageIds = []) {
    try {
      let targetMessages = messageIds;
      
      // If no specific messages, get recent unanalyzed messages
      if (targetMessages.length === 0) {
        const messages = await getMessagesByUser(userId, {
          limit: 20,
          sortBy: 'received_date',
          sortOrder: 'DESC'
        });
        
        targetMessages = messages
          .filter(msg => !msg.ai_category)
          .map(msg => msg.id);
      }

      if (targetMessages.length === 0) {
        return { message: 'No messages to analyze', processed: 0 };
      }

      // Batch analyze messages
      const results = await this.batchAnalyzeEmails(targetMessages, { concurrency: 2 });
      
      return {
        message: 'Smart triage completed',
        processed: results.processed,
        errors: results.errors,
        summary: this.generateTriageSummary(results.results)
      };
    } catch (error) {
      console.error('Smart triage failed:', error);
      throw new AppError('Smart triage failed', 500);
    }
  }

  /**
   * Generate triage summary
   */
  generateTriageSummary(results) {
    const summary = {
      total: results.length,
      byCategory: {},
      byPriority: { high: 0, medium: 0, low: 0 },
      bySentiment: { positive: 0, negative: 0, neutral: 0 }
    };

    results.forEach(result => {
      // Count by category
      const category = result.category || 'Unknown';
      summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;

      // Count by priority
      const priority = result.priority || 0;
      if (priority >= 4) summary.byPriority.high++;
      else if (priority >= 2) summary.byPriority.medium++;
      else summary.byPriority.low++;

      // Count by sentiment
      const sentiment = result.sentiment || 'neutral';
      if (summary.bySentiment[sentiment] !== undefined) {
        summary.bySentiment[sentiment]++;
      }
    });

    return summary;
  }
}

/**
 * Standalone email summarization service using Gemini API
 * @param {string} subject - Email subject
 * @param {string} content - Email content
 * @returns {Promise<string>} - Generated summary
 */
export async function summarizeEmailService(subject, content) {

  // Clean content before summarization
  const cleanSubject = sanitizeText(subject);
  const cleanedEmailText = cleanEmailText(content);

  if (!cleanedEmailText) {
    throw new Error('Email content is required');
  }

  // Improved prompt for better summarization
  const prompt = `You are SmartMail, an intelligent email assistant.

Your job is to summarize emails and conversations clearly and concisely.
Follow these rules:
- Keep the summary between 4 to 8 sentences
- Focus on the core message, main purpose, and any requested actions
- Ignore signatures, greetings, disclaimers, and quoted previous replies
- Preserve important details like names, dates, and key outcomes
- Use a neutral, professional tone
- For multi-message threads, summarize the conversation as a whole

Format your output as:
Summary:
• [Main point 1]
• [Main point 2]
• [Main point 3]
• [If relevant, next action or conclusion]

EMAIL SUBJECT: ${cleanSubject || 'No Subject'}

EMAIL CONTENT:
${cleanedEmailText}`;

  // Support both AI_MODE (new) and AI_PROVIDER (legacy)
  const aiMode = (process.env.AI_MODE || process.env.AI_PROVIDER || '').toLowerCase();

  if (aiMode === 'ollama') {
    const model = process.env.OLLAMA_MODEL || 'llama3';
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const { data } = await axios.post(
      `${baseUrl}/api/generate`,
      { model, prompt },
      { timeout: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10) }
    );
    return (data.response || '').trim();
  }

  if (aiMode === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key not configured');
    
    const { data } = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
      { 
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,      // factual and focused
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 200
        }
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10) }
    );
    
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No summary available.';
  }

  return 'AI mode not configured. Please set AI_MODE in .env (ollama or gemini).';
}

/**
 * Smart Tone Analyzer - Analyzes email tone and generates contextual reply suggestions
 * @param {string} subject - Email subject
 * @param {string} content - Email content
 * @returns {Promise<Object>} - Object with tone and reply suggestions
 */
export async function analyzeToneAndRepliesService(subject, content) {
  // Clean content before analysis
  const cleanSubject = sanitizeText(subject);
  const cleanedEmailText = cleanEmailText(content);

  if (!cleanedEmailText) {
    throw new Error('Email content is required');
  }

  // Combined prompt for tone detection + reply generation (single API call)
  const prompt = `You are SmartMail's Tone Analyzer. Analyze this email and provide:

1. The emotional tone (choose ONE from: Positive, Urgent, Apologetic, Friendly, Formal, Neutral)
2. Three SHORT, natural reply suggestions (under 15 words each)

IMPORTANT: Return ONLY valid JSON in this EXACT format (no markdown, no explanation):
{
  "tone": "Friendly",
  "replies": [
    "Thanks for reaching out!",
    "I'll get back to you soon.",
    "Appreciate the update!"
  ]
}

EMAIL SUBJECT: ${cleanSubject || 'No Subject'}

EMAIL CONTENT:
${cleanedEmailText}`;

  // Support both AI_MODE (new) and AI_PROVIDER (legacy)
  const aiMode = (process.env.AI_MODE || process.env.AI_PROVIDER || '').toLowerCase();

  if (aiMode === 'ollama') {
    const model = process.env.OLLAMA_MODEL || 'llama3';
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const { data } = await axios.post(
      `${baseUrl}/api/generate`,
      { model, prompt },
      { timeout: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10) }
    );
    
    const response = (data.response || '').trim();
    try {
      return JSON.parse(response);
    } catch (err) {
      console.error('Failed to parse Ollama tone response:', response);
      return {
        tone: 'Neutral',
        replies: ['Thanks for your email.', 'I will review this shortly.', 'Got it, thanks!']
      };
    }
  }

  if (aiMode === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key not configured');
    
    const { data } = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
      { 
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,      // More creative for replies
          topP: 0.9,
          topK: 50,
          maxOutputTokens: 300
        }
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10) }
    );
    
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
    
    try {
      // Clean markdown code blocks if present
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      return JSON.parse(cleanedResponse);
    } catch (err) {
      console.error('Failed to parse Gemini tone response:', responseText);
      return {
        tone: 'Neutral',
        replies: ['Thanks for your email.', 'I will review this shortly.', 'Got it, thanks!']
      };
    }
  }

  // Fallback
  return {
    tone: 'Neutral',
    replies: ['Thank you for your email.', 'I will get back to you soon.', 'Received, will review.']
  };
}

/**
 * Fast Pre-Check for Decision Classification
 * Returns true if email should be sent to AI, false if it can be skipped
 */
async function shouldUseAIClassification(subject, content, messageData = null) {
  const cleanSubject = (subject || '').toLowerCase();
  const cleanContent = (content || '').toLowerCase();
  const combinedText = `${cleanSubject} ${cleanContent}`;

  // Check 1: Contains question mark
  if (combinedText.includes('?')) {
    return true;
  }

  // Check 2: Contains action keywords
  const actionKeywords = [
    'please confirm',
    'let me know',
    'deadline',
    'due',
    'submit',
    'reply',
    'respond',
    'urgent',
    'asap',
    'action required',
    'your response',
    'waiting for',
    'need your'
  ];
  
  for (const keyword of actionKeywords) {
    if (combinedText.includes(keyword)) {
      return true;
    }
  }

  // Check 3 & 4: Require message data
  if (messageData) {
    try {
      // Check 3: Sender is someone user replied to more than 3 times
      if (messageData.from_email && messageData.user_id) {
        const repliesCount = await countRepliesToSender(
          messageData.user_id,
          messageData.from_email
        );
        if (repliesCount > 3) {
          return true;
        }
      }

      // Check 4: Email is unread for more than 3 days
      if (!messageData.is_read && messageData.date) {
        const emailDate = new Date(messageData.date);
        const now = new Date();
        const daysDiff = (now - emailDate) / (1000 * 60 * 60 * 24);
        
        if (daysDiff > 3) {
          return true;
        }
      }
    } catch (err) {
      console.error('Pre-check database query error:', err.message);
      // On error, default to using AI to be safe
      return true;
    }
  }

  // If none of the conditions are met, skip AI
  return false;
}

/**
 * Count how many times user has replied to a specific sender
 */
async function countRepliesToSender(userId, senderEmail) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT COUNT(*) as count
      FROM messages
      WHERE user_id = ?
        AND to_email LIKE ?
        AND is_deleted = 0
    `;
    
    const senderPattern = `%${senderEmail}%`;
    
    db.get(sql, [userId, senderPattern], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row?.count || 0);
      }
    });
  });
}

/**
 * Classify Email Decision Requirements
 * Determines if an email requires action/reply and categorizes the decision type
 * Now includes fast pre-check to avoid unnecessary AI calls
 */
export async function classifyEmailDecisionService(subject, content, messageData = null) {
  const cleanSubject = sanitizeText(subject);
  const cleanContent = cleanEmailText(content);

  // FAST PRE-CHECK: Skip AI if email clearly doesn't need action
  const shouldUseAI = await shouldUseAIClassification(subject, content, messageData);
  
  if (!shouldUseAI) {
    // Skip AI call - return informational_only immediately
    return {
      decision_required: false,
      decision_type: 'informational_only',
      reason: 'No action indicators found',
      skipped_ai: true  // Flag to indicate pre-check was used
    };
  }

  const prompt = `You are an email decision classifier for a productivity email app.

Analyze the email and return ONLY valid JSON.

Rules:
- decision_required = true if the email needs a reply, confirmation, action, or has a deadline.
- decision_required = false if it is purely informational, promotional, or a newsletter.

Decision types (choose ONE):
- reply_required: Email explicitly asks for a response or answer
- deadline: Email contains a time-sensitive deadline or due date
- follow_up: Email needs follow-up action but not urgent
- informational_only: No action needed, purely informational

Also provide a short human-readable reason (max 12 words).

Email:
Subject: ${cleanSubject}
Body: ${cleanContent.substring(0, 2000)}

Output format (MUST be valid JSON):
{
  "decision_required": boolean,
  "decision_type": "reply_required | deadline | follow_up | informational_only",
  "reason": "string"
}`;

  const aiMode = (process.env.AI_MODE || process.env.AI_PROVIDER || '').toLowerCase();

  try {
    if (aiMode === 'ollama') {
      const model = process.env.OLLAMA_MODEL || 'llama3';
      const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      const { data } = await axios.post(
        `${baseUrl}/api/generate`,
        { model, prompt },
        { timeout: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10) }
      );
      
      const response = (data.response || '').trim();
      try {
        // Clean markdown code blocks if present
        const cleanedResponse = response
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        return JSON.parse(cleanedResponse);
      } catch (err) {
        console.error('Failed to parse Ollama decision response:', response);
        return {
          decision_required: false,
          decision_type: 'informational_only',
          reason: 'Could not analyze email'
        };
      }
    }

    if (aiMode === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('Gemini API key not configured');
      
      const { data } = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
        { 
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,      // Lower temperature for more consistent classification
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 150
          }
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10) }
      );
      
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
      
      try {
        // Clean markdown code blocks if present
        const cleanedResponse = responseText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        
        return JSON.parse(cleanedResponse);
      } catch (err) {
        console.error('Failed to parse Gemini decision response:', responseText);
        return {
          decision_required: false,
          decision_type: 'informational_only',
          reason: 'Could not analyze email'
        };
      }
    }

    // Fallback if AI mode not recognized
    return {
      decision_required: false,
      decision_type: 'informational_only',
      reason: 'AI provider not configured'
    };

  } catch (error) {
    console.error('Email decision classification error:', error.message);
    return {
      decision_required: false,
      decision_type: 'informational_only',
      reason: 'Classification service unavailable'
    };
  }
}

// Export singleton instance
export default new AIService();
