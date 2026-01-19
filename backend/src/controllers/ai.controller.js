import * as aiConfig from '../config/ai.js';
import * as messageModel from '../models/message.model.js';
import * as decisionModel from '../models/decision.model.js';
import gmailService from '../services/gmail.service.js';
import { summarizeEmailService, suggestReplyService, draftEmailService, analyzeToneAndRepliesService, classifyEmailDecisionService } from '../services/ai.service.js';
/**
 * AI Reply Suggestion Controller
 * POST /api/ai/reply
 */
export const suggestReply = async (req, res) => {
  try {
    const { subject, content } = req.body;
    
    if (!subject && !content) {
      return res.status(400).json({ error: "Subject or content is required" });
    }
    
    const suggestions = await suggestReplyService(subject || '', content || '');
    res.json({ suggestions });
  } catch (err) {
    console.error("AI Reply Suggestion Error:", err);
    // Provide fallback suggestions instead of error
    const fallbackSuggestions = [
      "Thank you for your email.",
      "I'll get back to you soon.", 
      "Received, will review."
    ];
    res.json({ suggestions: fallbackSuggestions });
  }
};

// Simple local fallback summarizer to avoid empty summaries on AI failure
import he from 'he';
function simpleSummarize(subject = '', content = '') {
  // Remove HTML tags and decode entities
  const sanitize = (input = '') => {
    let text = input.replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    text = he.decode(text);
    return text;
  };
  const text = `${sanitize(subject)}\n\n${sanitize(content)}`.trim();
  if (!text) return 'No content available to summarize.';
  // Take first 2 sentences or 250 chars, whichever shorter
  const sentences = text.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
  const clipped = sentences.length > 250 ? `${sentences.slice(0, 247)}...` : sentences;
  return clipped;
}

/**
 * AI Controller
 * Handles AI-powered email analysis and reply generation
 */

/**
 * Analyze single email with AI
 * POST /api/ai/analyze/:messageId
 */
async function analyzeEmail(req, res) {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    // Get message from database
    const message = await messageModel.findMessageById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Verify message belongs to user
    if (message.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check AI service availability
    const aiStatus = await aiConfig.checkAIAvailability();
    if (!aiStatus.available) {
      return res.status(503).json({
        success: false,
        error: 'AI service unavailable',
        message: aiStatus.error
      });
    }

    // Prepare email data for AI analysis
    const emailData = {
      subject: message.subject,
      body: message.body_text || message.body_html,
      from: message.from_email,
      to: message.to_email,
      date: message.date
    };

    // Run AI analysis in parallel
    const [summaryResult, categoryResult] = await Promise.allSettled([
      aiConfig.summarizeEmail(emailData),
      aiConfig.categorizeEmail(emailData)
    ]);

    const analysis = {
      summary: summaryResult.status === 'fulfilled' ? summaryResult.value : null,
      category: categoryResult.status === 'fulfilled' ? categoryResult.value : null
    };

    // Update message with AI analysis
    const aiData = {
      summary: analysis.summary?.summary || null,
      category: analysis.category?.category || null,
      actionItems: null, // Can be added later
      sentiment: null // Can be added later
    };

    await messageModel.updateMessageAI(messageId, aiData);

    res.json({
      success: true,
      message: 'Email analysis completed',
      analysis: {
        messageId,
        summary: analysis.summary,
        category: analysis.category,
        aiProvider: aiStatus.provider,
        aiModel: aiStatus.model
      }
    });

  } catch (error) {
    console.error('❌ Error analyzing email:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze email',
      message: error.message
    });
  }
}

/**
 * Batch analyze multiple emails
 * POST /api/ai/analyze/batch
 */
async function batchAnalyze(req, res) {
  try {
    const { messageIds, analysisTypes = ['summary', 'category'] } = req.body;
    const userId = req.user.userId;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Array of message IDs is required'
      });
    }

    // Check AI service availability
    const aiStatus = await aiConfig.checkAIAvailability();
    if (!aiStatus.available) {
      return res.status(503).json({
        success: false,
        error: 'AI service unavailable',
        message: aiStatus.error
      });
    }

    const results = [];
    const errors = [];

    // Process each message
    for (const messageId of messageIds) {
      try {
        const message = await messageModel.findMessageById(messageId);

        if (!message || message.user_id !== userId) {
          errors.push({ messageId, error: 'Message not found or access denied' });
          continue;
        }

        // Skip if already analyzed (optional optimization)
        if (message.ai_summary && !req.body.forceReanalyze) {
          results.push({
            messageId,
            status: 'skipped',
            reason: 'Already analyzed'
          });
          continue;
        }

        const emailData = {
          subject: message.subject,
          body: message.body_text || message.body_html,
          from: message.from_email,
          to: message.to_email,
          date: message.date
        };

        const analysisPromises = [];
        
        if (analysisTypes.includes('summary')) {
          analysisPromises.push(aiConfig.summarizeEmail(emailData));
        }
        if (analysisTypes.includes('category')) {
          analysisPromises.push(aiConfig.categorizeEmail(emailData));
        }

        const analysisResults = await Promise.allSettled(analysisPromises);
        
        let summary = null, category = null;
        let analysisIndex = 0;

        if (analysisTypes.includes('summary')) {
          summary = analysisResults[analysisIndex].status === 'fulfilled' ? 
                   analysisResults[analysisIndex].value : null;
          analysisIndex++;
        }
        
        if (analysisTypes.includes('category')) {
          category = analysisResults[analysisIndex].status === 'fulfilled' ? 
                    analysisResults[analysisIndex].value : null;
        }

        // Update message with AI analysis
        const aiData = {
          summary: summary?.summary || message.ai_summary,
          category: category?.category || message.ai_category,
          actionItems: message.ai_action_items,
          sentiment: message.ai_sentiment
        };

        await messageModel.updateMessageAI(messageId, aiData);

        results.push({
          messageId,
          status: 'completed',
          summary,
          category
        });

      } catch (error) {
        console.error(`❌ Error analyzing message ${messageId}:`, error.message);
        errors.push({ messageId, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Batch analysis completed. ${results.length} processed, ${errors.length} errors`,
      results,
      errors,
      aiProvider: aiStatus.provider,
      aiModel: aiStatus.model
    });

  } catch (error) {
    console.error('❌ Error in batch analysis:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to perform batch analysis',
      message: error.message
    });
  }
}

/**
 * Generate email reply using AI
 * POST /api/ai/reply/:messageId
 */
async function generateReply(req, res) {
  try {
    const { messageId } = req.params;
    const { replyType = 'professional', context = '' } = req.body;
    const userId = req.user.userId;

    // Get message from database
    const message = await messageModel.findMessageById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Verify message belongs to user
    if (message.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check AI service availability
    const aiStatus = await aiConfig.checkAIAvailability();
    if (!aiStatus.available) {
      return res.status(503).json({
        success: false,
        error: 'AI service unavailable',
        message: aiStatus.error
      });
    }

    // Prepare email data for reply generation
    const emailData = {
      subject: message.subject,
      body: message.body_text || message.body_html,
      from: message.from_email,
      to: message.to_email
    };

    // Generate reply
    const replyResult = await aiConfig.generateReply(emailData, replyType);

    if (!replyResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate reply',
        message: replyResult.error
      });
    }

    res.json({
      success: true,
      message: 'Reply generated successfully',
      reply: {
        content: replyResult.reply,
        replyType,
        originalMessageId: messageId,
        suggestedSubject: message.subject.startsWith('Re:') ? 
                         message.subject : `Re: ${message.subject}`,
        context,
        aiProvider: replyResult.provider,
        aiModel: replyResult.model
      }
    });

  } catch (error) {
    console.error('❌ Error generating reply:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate reply',
      message: error.message
    });
  }
}

/**
 * Generate multiple reply variations
 * POST /api/ai/reply/:messageId/variations
 */
async function generateReplyVariations(req, res) {
  try {
    const { messageId } = req.params;
    const { replyTypes = ['professional', 'friendly', 'brief'], context = '' } = req.body;
    const userId = req.user.userId;

    // Get message from database
    const message = await messageModel.findMessageById(messageId);

    if (!message || message.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Message not found or access denied'
      });
    }

    // Check AI service availability
    const aiStatus = await aiConfig.checkAIAvailability();
    if (!aiStatus.available) {
      return res.status(503).json({
        success: false,
        error: 'AI service unavailable',
        message: aiStatus.error
      });
    }

    const emailData = {
      subject: message.subject,
      body: message.body_text || message.body_html,
      from: message.from_email,
      to: message.to_email
    };

    // Generate replies for each type
    const replyPromises = replyTypes.map(type => 
      aiConfig.generateReply(emailData, type)
    );

    const replyResults = await Promise.allSettled(replyPromises);

    const variations = replyTypes.map((type, index) => ({
      replyType: type,
      success: replyResults[index].status === 'fulfilled' && replyResults[index].value.success,
      content: replyResults[index].status === 'fulfilled' ? 
               replyResults[index].value.reply : null,
      error: replyResults[index].status === 'rejected' ? 
             replyResults[index].reason.message : 
             (replyResults[index].value.success ? null : replyResults[index].value.error)
    }));

    const successfulReplies = variations.filter(v => v.success);

    res.json({
      success: true,
      message: `Generated ${successfulReplies.length} reply variations`,
      variations,
      originalMessageId: messageId,
      suggestedSubject: message.subject.startsWith('Re:') ? 
                       message.subject : `Re: ${message.subject}`,
      aiProvider: aiStatus.provider,
      aiModel: aiStatus.model
    });

  } catch (error) {
    console.error('❌ Error generating reply variations:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate reply variations',
      message: error.message
    });
  }
}

/**
 * Smart email triage - categorize and prioritize emails
 * POST /api/ai/triage
 */
async function smartTriage(req, res) {
  try {
    const userId = req.user.userId;
    const { limit = 20, includeProcessed = false } = req.body;

    // Get recent unprocessed messages
    const messages = await messageModel.getMessagesByUser(userId, {
      limit,
      sortBy: 'date',
      sortOrder: 'DESC'
    });

    // Filter to unprocessed messages if requested
    const messagesToProcess = includeProcessed ? 
      messages : 
      messages.filter(msg => !msg.ai_category);

    if (messagesToProcess.length === 0) {
      return res.json({
        success: true,
        message: 'No messages to triage',
        processedCount: 0,
        categories: {}
      });
    }

    // Check AI service availability
    const aiStatus = await aiConfig.checkAIAvailability();
    if (!aiStatus.available) {
      return res.status(503).json({
        success: false,
        error: 'AI service unavailable',
        message: aiStatus.error
      });
    }

    const triageResults = [];
    const categories = {};

    // Process each message
    for (const message of messagesToProcess) {
      try {
        const emailData = {
          subject: message.subject,
          body: message.body_text || message.body_html,
          from: message.from_email
        };

        const categoryResult = await aiConfig.categorizeEmail(emailData);

        if (categoryResult.success) {
          const category = categoryResult.category;
          
          // Update message with category
          await messageModel.updateMessageAI(message.id, {
            summary: message.ai_summary,
            category,
            actionItems: message.ai_action_items,
            sentiment: message.ai_sentiment
          });

          triageResults.push({
            messageId: message.id,
            subject: message.subject,
            from: message.from_email,
            category,
            reason: categoryResult.reason
          });

          // Count categories
          categories[category] = (categories[category] || 0) + 1;
        }

      } catch (error) {
        console.error(`❌ Error triaging message ${message.id}:`, error.message);
      }
    }

    res.json({
      success: true,
      message: `Triaged ${triageResults.length} messages`,
      processedCount: triageResults.length,
      results: triageResults,
      categories,
      aiProvider: aiStatus.provider,
      aiModel: aiStatus.model
    });

  } catch (error) {
    console.error('❌ Error in smart triage:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to perform smart triage',
      message: error.message
    });
  }
}

/**
 * Get AI service status and capabilities
 * GET /api/ai/status
 */
async function getAIStatus(req, res) {
  try {
    const status = await aiConfig.checkAIAvailability();

    res.json({
      success: true,
      ai: {
        ...status,
        capabilities: [
          'email_summarization',
          'email_categorization', 
          'reply_generation',
          'batch_processing',
          'smart_triage'
        ],
        supportedReplyTypes: [
          'professional',
          'friendly', 
          'brief',
          'detailed'
        ],
        supportedCategories: [
          'work', 'personal', 'finance', 'shopping',
          'travel', 'newsletter', 'social', 'support',
          'spam', 'other'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Error getting AI status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI status',
      message: error.message
    });
  }
}

/**
 * Summarize email content
 * POST /api/ai/summarize
 */
export const summarizeEmail = async (req, res) => {
  const { subject, content } = req.body || {};
  try {
    const summary = await summarizeEmailService(subject, content);
    return res.json({ summary });
  } catch (err) {
    console.error('AI Summarization Error:', err?.response?.data || err?.message || err);
    // Provide a graceful fallback summary so UI doesn't look empty
    const fallback = simpleSummarize(subject, content);
    return res.json({ summary: fallback, note: 'fallback' });
  }
};

export {
  analyzeEmail,
  batchAnalyze,
  generateReply,
  generateReplyVariations,
  smartTriage,
  getAIStatus
};

/**
 * AI Draft Email Controller
 * POST /api/ai/draft
 */
export const draftEmail = async (req, res) => {
  try {
    const { subject = '', content = '', instructions = '' } = req.body || {};
    const draft = await draftEmailService(subject, content, instructions);
    res.json({ draft });
  } catch (err) {
    console.error('AI Draft Error:', err?.response?.data || err?.message || err);
    res.status(500).json({ error: 'Failed to draft email' });
  }
};

/**
 * Smart Tone Analyzer Controller
 * POST /api/ai/analyze-tone
 * Analyzes email tone and generates contextual reply suggestions
 */
export const analyzeTone = async (req, res) => {
  try {
    const { subject, content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Email content is required' });
    }
    
    const result = await analyzeToneAndRepliesService(subject || '', content);
    res.json(result);
  } catch (err) {
    console.error('AI Tone Analysis Error:', err?.response?.data || err?.message || err);
    // Provide fallback response instead of error
    res.json({
      tone: 'Neutral',
      replies: ['Thank you for your email.', 'I will get back to you soon.', 'Received, will review.']
    });
  }
};

/**
 * Batch Label Emails Controller
 * POST /api/ai/batch-label
 * Labels multiple emails in a single AI request for better performance
 */
export const batchLabelEmails = async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = req.user.userId;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Array of message IDs is required'
      });
    }

    // Check AI service availability
    const aiStatus = await aiConfig.checkAIAvailability();
    if (!aiStatus.available) {
      return res.status(503).json({
        success: false,
        error: 'AI service unavailable',
        message: aiStatus.error
      });
    }

    // Fetch messages
    const messages = [];
    for (const messageId of messageIds) {
      const message = await messageModel.findMessageById(messageId);
      if (message && message.user_id === userId) {
        messages.push(message);
      }
    }

    if (messages.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No valid messages found'
      });
    }

    // Use the new batch labeling service with improved prompt
    const aiService = (await import('../services/ai.service.js')).default;
    const result = await aiService.batchLabelEmails(messages);

    // Update messages with labels
    if (result.success && result.results) {
      for (const labelResult of result.results) {
        try {
          await messageModel.updateMessageAI(labelResult.messageId, {
            category: labelResult.label,
            summary: labelResult.reason
          });
        } catch (updateError) {
          console.error(`Failed to update message ${labelResult.messageId}:`, updateError.message);
        }
      }
    }

    res.json({
      success: result.success,
      processed: result.processed || 0,
      results: result.results || [],
      provider: result.provider,
      error: result.error
    });

  } catch (err) {
    console.error('Batch Label Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to batch label emails',
      message: err.message
    });
  }
};

/**
 * Classify Email Decision Requirements
 * POST /api/ai/classify-decision
 * Determines if email requires action and categorizes the decision type
 */
export const classifyDecision = async (req, res) => {
  try {
    const { subject, content, messageId } = req.body;

    // Validate input
    if (!subject && !content && !messageId) {
      return res.status(400).json({
        success: false,
        error: 'Subject, content, or messageId is required'
      });
    }

    // If messageId provided, fetch from database
    let emailSubject = subject;
    let emailContent = content;
    let messageData = null;

    if (messageId) {
      const userId = req.user?.userId;
      const message = await messageModel.findMessageById(messageId);

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found'
        });
      }

      // Verify message belongs to user
      if (userId && message.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      emailSubject = message.subject;
      emailContent = message.body_text || message.body_html;
      messageData = message; // Pass full message for pre-check
    }

    // Classify the email (with fast pre-check)
    const classification = await classifyEmailDecisionService(
      emailSubject || '', 
      emailContent || '',
      messageData
    );

    // Save decision to database if messageId provided
    if (messageId && messageData) {
      try {
        await decisionModel.upsertDecision({
          email_id: messageData.gmail_id,
          user_id: messageData.user_id,
          decision_required: classification.decision_required,
          decision_type: classification.decision_type,
          reason: classification.reason,
          detected_at: new Date().toISOString(),
          status: 'pending'
        });

        // Apply Gmail label if action is required
        if (classification.decision_required) {
          try {
            await gmailService.applyDecisionLabel(messageData.user_id, messageData.gmail_id);
          } catch (labelError) {
            console.error('Failed to apply Gmail label:', labelError.message);
            // Continue - label application is optional
          }
        }

      } catch (dbError) {
        console.error('Failed to save decision to database:', dbError.message);
        // Continue even if save fails - classification is more important
      }
    }

    res.json({
      success: true,
      decision_required: classification.decision_required,
      decision_type: classification.decision_type,
      reason: classification.reason,
      skipped_ai: classification.skipped_ai || false
    });

  } catch (err) {
    console.error('Decision Classification Error:', err);
    // Provide safe fallback
    res.json({
      success: false,
      decision_required: false,
      decision_type: 'informational_only',
      reason: 'Unable to classify email',
      error: err.message
    });
  }
};

/**
 * Ensure SMARTMAIL_DECISION label exists in Gmail
 * POST /api/ai/ensure-decision-label
 */
export const ensureDecisionLabel = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const label = await gmailService.ensureSmartmailDecisionLabel(userId);

    res.json({
      success: true,
      label: {
        id: label.id,
        name: label.name,
        type: label.type
      },
      message: 'SMARTMAIL_DECISION label is ready'
    });

  } catch (err) {
    console.error('Ensure decision label error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to ensure decision label',
      message: err.message
    });
  }
};