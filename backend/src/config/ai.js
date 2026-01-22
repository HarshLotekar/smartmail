import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * AI Service Configuration
 * Supports both Ollama (local) and Google Gemini (cloud) providers
 */

// AI Provider Configuration
const AI_PROVIDER = process.env.AI_PROVIDER || 'ollama'; // 'ollama' or 'gemini'
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-pro';

/**
 * Check if AI service is configured and available
 */
async function checkAIAvailability() {
  const status = {
    provider: AI_PROVIDER,
    available: false,
    model: null,
    error: null
  };

  try {
    if (AI_PROVIDER === 'ollama') {
      // Check Ollama availability
      const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
        timeout: 5000
      });
      
      const models = response.data.models || [];
      const targetModel = models.find(model => model.name.includes(OLLAMA_MODEL));
      
      if (targetModel) {
        status.available = true;
        status.model = targetModel.name;
      } else {
        status.error = `Model ${OLLAMA_MODEL} not found. Available models: ${models.map(m => m.name).join(', ')}`;
      }
    } else if (AI_PROVIDER === 'gemini') {
      // Check Gemini API key
      if (!GEMINI_API_KEY) {
        status.error = 'GEMINI_API_KEY not configured in environment variables';
      } else {
        status.available = true;
        status.model = GEMINI_MODEL;
      }
    } else {
      status.error = `Unsupported AI provider: ${AI_PROVIDER}`;
    }
  } catch (error) {
    status.error = error.message;
    console.error(`❌ AI service ${AI_PROVIDER} not available:`, error.message);
  }

  return status;
}

/**
 * Make request to Ollama API
 */
async function callOllama(prompt, systemMessage = null) {
  try {
    const payload = {
      model: OLLAMA_MODEL,
      prompt: systemMessage ? `${systemMessage}\n\nUser: ${prompt}` : prompt,
      stream: false
    };

    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, payload, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data.response;
  } catch (error) {
    console.error('❌ Ollama API error:', error.message);
    throw new Error(`Ollama request failed: ${error.message}`);
  }
}

/**
 * Make request to Gemini API
 */
async function callGemini(prompt, systemMessage = null) {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const fullPrompt = systemMessage ? `${systemMessage}\n\n${prompt}` : prompt;
    
    const payload = {
      contents: [{
        parts: [{ text: fullPrompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024
      }
    };

    // Use v1beta API and gemini-1.5-pro model
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
      payload,
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return response.data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Invalid response format from Gemini API');
    }
  } catch (error) {
    console.error('❌ Gemini API error:', error.response?.data || error.message);
    throw new Error(`Gemini request failed: ${error.message}`);
  }
}

/**
 * Generic AI request function that routes to the configured provider
 */
async function makeAIRequest(prompt, systemMessage = null) {
  try {
    if (AI_PROVIDER === 'ollama') {
      return await callOllama(prompt, systemMessage);
    } else if (AI_PROVIDER === 'gemini') {
      return await callGemini(prompt, systemMessage);
    } else {
      throw new Error(`Unsupported AI provider: ${AI_PROVIDER}`);
    }
  } catch (error) {
    console.error('❌ AI request failed:', error.message);
    throw error;
  }
}

/**
 * Summarize email content
 */
async function summarizeEmail(emailData) {
  try {
    const { subject, body, from, date } = emailData;
    
    const systemMessage = `You are an email summarization assistant. Provide a concise, professional summary of the email content. Focus on:
1. Main topic/purpose
2. Key points or requests  
3. Required actions (if any)
4. Urgency level (high/medium/low)

Keep the summary under 100 words and use bullet points for clarity.`;

    const prompt = `Email to summarize:
From: ${from}
Date: ${date}
Subject: ${subject}

Body:
${body}

Please provide a structured summary of this email.`;

    const response = await makeAIRequest(prompt, systemMessage);
    
    return {
      success: true,
      summary: response.trim(),
      provider: AI_PROVIDER,
      model: AI_PROVIDER === 'ollama' ? OLLAMA_MODEL : GEMINI_MODEL
    };
  } catch (error) {
    console.error('❌ Email summarization failed:', error.message);
    return {
      success: false,
      error: error.message,
      summary: null
    };
  }
}

/**
 * Generate email reply suggestions
 */
async function generateReply(emailData, replyType = 'professional') {
  try {
    const { subject, body, from, to } = emailData;
    
    const systemMessage = `You are an email reply assistant. Generate appropriate email responses based on the original email content. 

Reply types:
- professional: Formal, business-appropriate tone
- friendly: Warm but professional tone  
- brief: Short, concise responses
- detailed: Comprehensive responses

Always:
- Match the tone and context of the original email
- Be helpful and constructive
- Include appropriate greetings and closings
- Keep responses relevant and on-topic`;

    const prompt = `Generate a ${replyType} reply to this email:

Original Email:
From: ${from}
To: ${to}
Subject: ${subject}

Body:
${body}

Please generate an appropriate reply that addresses the main points and maintains a ${replyType} tone.`;

    const response = await makeAIRequest(prompt, systemMessage);
    
    return {
      success: true,
      reply: response.trim(),
      replyType,
      provider: AI_PROVIDER,
      model: AI_PROVIDER === 'ollama' ? OLLAMA_MODEL : GEMINI_MODEL
    };
  } catch (error) {
    console.error('❌ Reply generation failed:', error.message);
    return {
      success: false,
      error: error.message,
      reply: null
    };
  }
}

/**
 * Categorize email content
 */
async function categorizeEmail(emailData) {
  try {
    const { subject, body, from } = emailData;
    
    const prompt = `You are an email classification system for SmartMail app.
Given an email's subject, sender, and preview text, assign ONE suitable label from this list:
["Work", "Personal", "Promotions", "Social", "Updates", "Security", "Spam", "Education", "Newsletter", "Events"]

📋 CLASSIFICATION RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 Work:
- Professional domains: @linkedin, @ieee, @kaggle, @company.com
- Business emails, job offers, professional networking
- Conference invitations, research papers

👤 Personal:
- Friends or personal domains: @gmail, @yahoo, @outlook
- Personal conversations, family matters
- Non-commercial personal updates

🎁 Promotions:
- Contains: "sale", "offer", "discount", "deal", "promotion", "limited time"
- Marketing campaigns, shopping deals
- Black Friday, seasonal sales

👥 Social:
- Social media platforms: Instagram, Facebook, Twitter, LinkedIn
- Social network notifications, friend requests
- Comments, likes, shares, mentions

🔐 Security:
- OTP codes, verification emails
- Password reset, account security alerts
- Two-factor authentication
- Suspicious activity warnings

📚 Education:
- Academic institutions, universities
- Conference calls (IEEE, ACM), research
- Online courses, certifications (Coursera, Udemy)
- Student portals, educational content

📰 Newsletter:
- Subscription-based content
- Regular digest emails
- Blog updates, content roundups
- "Weekly/Monthly digest", "Newsletter"

🔔 Updates:
- System updates, app notifications
- Service announcements
- Order tracking, delivery updates
- Account activity summaries

🎉 Events:
- Event invitations, RSVP requests
- Webinar registrations
- Calendar invites, meetups
- Concert/conference tickets

⚠️ Spam:
- Suspicious senders, random text
- Phishing attempts, fake offers
- Unrelated promotional content
- Too many links, broken English

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Email to classify:
Subject: ${subject || 'No subject'}
Sender: ${from || 'Unknown'}
Preview: ${(body || '').substring(0, 300)}

IMPORTANT: Analyze the content carefully. Don't default to "Personal" unless it's truly a personal message. Look for keywords and patterns to assign the most appropriate category.

Return ONLY valid JSON in this exact format:
{
  "label": "Work",
  "confidence": 0.94,
  "reason": "From IEEE, related to professional conference"
}`;

    const response = await makeAIRequest(prompt);
    
    try {
      // Try to parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Get the label (new format uses single "label" field)
        const category = parsed.label;
        
        // Validate the category
        const validLabels = ['Work', 'Personal', 'Promotions', 'Social', 'Updates', 'Security', 'Spam', 'Education', 'Newsletter', 'Events'];
        if (!category || !validLabels.includes(category)) {
          console.warn('[AI] Invalid category returned:', category);
          throw new Error('Invalid category');
        }
        
        console.log('[AI] Categorization success:', JSON.stringify({ from, subject: subject?.substring(0, 50), category, confidence: parsed.confidence }));
        
        return {
          success: true,
          category,
          confidence: parsed.confidence || 0.8,
          reason: parsed.reason || 'AI categorization',
          provider: AI_PROVIDER,
          model: AI_PROVIDER === 'ollama' ? OLLAMA_MODEL : 'gemini-1.5-pro'
        };
      }
    } catch (parseError) {
      console.warn('[AI] Failed to parse AI JSON response, using text fallback:', parseError.message);
    }
    
    // Fallback: Extract category from text response
    const validLabels = ['Work', 'Personal', 'Promotions', 'Social', 'Updates', 'Security', 'Spam', 'Education', 'Newsletter', 'Events'];
    let category = null;
    
    // Try to find any valid label in the response
    for (const label of validLabels) {
      if (response.toLowerCase().includes(label.toLowerCase())) {
        category = label;
        console.log('[AI] Extracted category from text:', category);
        break;
      }
    }
    
    // If still no category found, throw error to trigger smartLabel fallback
    if (!category) {
      console.warn('[AI] No valid category found in response:', response.substring(0, 100));
      throw new Error('No valid category in AI response');
    }
    
    return {
      success: true,
      category,
      confidence: 0.6,
      reason: 'Extracted from AI text response',
      provider: AI_PROVIDER,
      model: AI_PROVIDER === 'ollama' ? OLLAMA_MODEL : 'gemini-1.5-pro'
    };
  } catch (error) {
    console.error('[AI] Email categorization failed:', error.message);
    // Return failure so that smartLabel fallback is used
    return {
      success: false,
      error: error.message,
      category: null, // Changed from 'Personal' to null to force fallback
      confidence: 0,
      reason: 'AI categorization failed'
    };
  }
}

/**
 * Extract action items from email
 */
async function extractActionItems(emailData) {
  try {
    const { subject, body } = emailData;
    
    const systemMessage = `You are an action item extraction assistant. Analyze emails and identify specific tasks, deadlines, and action items.

For each action item, provide:
1. Task description (brief but clear)
2. Deadline (if mentioned, or "No deadline specified")
3. Priority (High/Medium/Low based on urgency indicators)

Format as a simple list. If no action items found, respond with "No action items found."`;

    const prompt = `Extract action items from this email:

Subject: ${subject}

Body:
${body}

Action items:`;

    const response = await makeAIRequest(prompt, systemMessage);
    
    return {
      success: true,
      actionItems: response.trim(),
      provider: AI_PROVIDER,
      model: AI_PROVIDER === 'ollama' ? OLLAMA_MODEL : GEMINI_MODEL
    };
  } catch (error) {
    console.error('❌ Action item extraction failed:', error.message);
    return {
      success: false,
      error: error.message,
      actionItems: null
    };
  }
}

/**
 * Chat with AI assistant for email management
 */
async function chatWithAssistant(userPrompt, emailContext, conversationHistory = [], intent = 'general') {
  try {
    const systemMessage = `You are SmartMail Agent — an intelligent, context-aware assistant integrated inside an email productivity app.

🎯 YOUR PURPOSE:
Help users manage their inbox, understand emails, and take smart actions such as:
- Summarizing the inbox or specific emails
- Suggesting professional or friendly replies
- Categorizing or labeling emails
- Detecting urgent or promotional messages
- Providing analytics (count, senders, categories)

📤 OUTPUT FORMAT (ALWAYS RETURN VALID JSON):
You must ALWAYS return a JSON object with this exact structure:

{
  "response": "string — short, natural text reply (1-3 sentences max)",
  "suggestedActions": ["action1", "action2"]
}

🧩 BEHAVIOR RULES:
1. Be brief and clear — 1-3 sentences max in response
2. If unclear, ask one clarifying question
3. Base reasoning only on provided email data
4. For summaries, focus on important senders or time-sensitive items
5. For reply suggestions, write short context-aware drafts
6. If no matching email found: "I couldn't find any relevant emails. Would you like me to check again?"
7. Always include at least 1-2 suggestedActions
8. Never include markdown, code blocks, or explanations outside JSON

CRITICAL: Your entire response must be valid JSON only. No text before or after the JSON object.`;

    const prompt = `USER REQUEST: ${userPrompt}

EMAIL CONTEXT:
${emailContext}

INTENT: ${intent}

Return ONLY valid JSON with "response" and "suggestedActions" fields:`;

    const response = await makeAIRequest(prompt, systemMessage);
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          response: parsed.response || "I processed your request.",
          suggestedActions: parsed.suggestedActions || ['Help', 'Show Emails'],
          intent: intent,
          provider: AI_PROVIDER,
          model: AI_PROVIDER === 'ollama' ? OLLAMA_MODEL : GEMINI_MODEL
        };
      }
    } catch (parseError) {
      console.warn('Chat JSON parse failed:', parseError.message);
    }
    
    return {
      success: true,
      response: response.trim(),
      suggestedActions: ['Help', 'Show All Emails', 'Search'],
      intent: intent,
      provider: AI_PROVIDER,
      model: AI_PROVIDER === 'ollama' ? OLLAMA_MODEL : GEMINI_MODEL
    };
    
  } catch (error) {
    console.error('Chat assistant failed:', error.message);
    return {
      success: false,
      response: "I'm having trouble processing that request. Could you try rephrasing?",
      suggestedActions: ['Try again', 'Help'],
      error: error.message
    };
  }
}

export {
  checkAIAvailability,
  makeAIRequest,
  summarizeEmail,
  generateReply,
  categorizeEmail,
  extractActionItems,
  chatWithAssistant,
  AI_PROVIDER,
  OLLAMA_MODEL,
  GEMINI_MODEL
};

