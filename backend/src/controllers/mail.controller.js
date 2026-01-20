import * as gmailConfig from '../config/gmail.js';
import * as messageModel from '../models/message.model.js';
import * as userModel from '../models/user.model.js';
import * as decisionModel from '../models/decision.model.js';
import * as aiConfig from '../config/ai.js';
import { smartLabelEmail } from '../utils/smartLabel.js';
import path from 'path';
import fs from 'fs';

/**
 * Mail Controller
 * Handles Gmail API operations and email management
 */

// Helper function to add delay between API calls (rate limiting)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get Gmail client for authenticated user
 */
async function getGmailClient(userId) {
  const user = await userModel.findUserById(userId);
  
  if (!user || !user.access_token) {
    throw new Error('User not authenticated with Gmail');
  }

  // Check if token needs refresh
  if (!userModel.isTokenValid(user)) {
    if (!user.refresh_token) {
      throw new Error('No refresh token available');
    }

    // Refresh tokens
    const newTokens = await gmailConfig.refreshAccessToken(user.refresh_token);
    const expiresAt = new Date(Date.now() + (newTokens.expires_in || 3600) * 1000);

    await userModel.updateUserTokens(
      userId,
      newTokens.access_token,
      newTokens.refresh_token || user.refresh_token,
      expiresAt
    );

    // Create Gmail client with new token
    return gmailConfig.createGmailClient(newTokens.access_token, newTokens.refresh_token || user.refresh_token);
  }

  return gmailConfig.createGmailClient(user.access_token, user.refresh_token);
}

/**
 * Sync messages from Gmail
 * POST /api/mail/sync
 */
async function syncMessages(req, res) {
  try {
    const userId = req.user.userId;
    // targetCount is total messages to pull this run; maxResults is per-page fetch size.
    const { targetCount = 50, maxResults = 25, query = '' } = req.body || {};

    const perPage = Math.min(Math.max(parseInt(maxResults) || 25, 1), 50); // Reduced from 500 to 50
    const totalToFetch = Math.min(Math.max(parseInt(targetCount) || 50, 1), 200); // Reduced from 2000 to 200

    console.log(`🔄 Starting Gmail sync for user ${userId}, aiming for ${totalToFetch} messages (page size ${perPage})...`);

    const gmail = await getGmailClient(userId);

    // Fetch message IDs across pages until we reach targetCount or run out
    let pageToken = null;
    let allMessageRefs = [];

    while (allMessageRefs.length < totalToFetch) {
      const remaining = totalToFetch - allMessageRefs.length;
      const pageSize = Math.min(perPage, remaining);

      const messagesResponse = await gmailConfig.fetchMessages(gmail, {
        maxResults: pageSize,
        pageToken,
        query
      });

      const refs = messagesResponse.messages || [];
      if (refs.length === 0) break;

      allMessageRefs = allMessageRefs.concat(refs);
      pageToken = messagesResponse.nextPageToken || null;

      console.log(`� Collected ${allMessageRefs.length} message refs so far...`);
      if (!pageToken) break; // no more pages
    }

    // De-duplicate by Gmail ID just in case API returns overlaps across pages
    const uniqueRefs = Array.from(new Map(allMessageRefs.map(m => [m.id, m])).values());

    console.log(`📧 Preparing to process ${uniqueRefs.length} unique messages...`);

    let syncedCount = 0;
    let updatedCount = 0;

    // Process each message (with rate limiting)
    for (let i = 0; i < uniqueRefs.length; i++) {
      const message = uniqueRefs[i];
      
      // Add delay every 3 messages to respect Gmail API rate limits
      // Each messages.get = 5 quota units, limit is 250 units/second
      // So max ~50 calls/second, we'll do 3 calls per second to be safe
      if (i > 0 && i % 3 === 0) {
        await delay(1000); // 1 second delay every 3 messages
        console.log(`⏱️  Rate limit pause... (processed ${i}/${uniqueRefs.length})`);
      }
      
      try {
        // Check if message already exists
        const existingMessage = await messageModel.findMessageByGmailId(message.id);
        
        // Get full message details (always fetch; cheaper than branchy fetches)
        const messageDetails = await gmailConfig.getMessageDetails(gmail, message.id);
        const parsedMessage = parseGmailMessage(messageDetails, userId);

        // Try AI categorization (best-effort; do not block sync)
        let aiCategory = null;
        try {
          const aiStatus = await aiConfig.checkAIAvailability();
          if (aiStatus.available) {
            const catRes = await aiConfig.categorizeEmail({
              subject: parsedMessage.subject || '',
              body: parsedMessage.bodyText || parsedMessage.snippet || '',
              from: parsedMessage.fromEmail || ''
            });
            // Only use AI category if successful and valid
            if (catRes && catRes.success && catRes.category && typeof catRes.category === 'string' && catRes.category.trim()) {
              aiCategory = catRes.category.trim();
              console.log(`[LABELING] [AI] Subject: '${parsedMessage.subject?.substring(0, 40)}' | Sender: '${parsedMessage.fromEmail}' => Category: '${aiCategory}' (confidence: ${catRes.confidence})`);
            }
          } else {
            console.log('[AI] Service not available, using smart fallback');
          }
        } catch (e) {
          console.warn('[AI] Categorization error, using smart fallback:', e.message);
          aiCategory = null;
        }
        
        // Fallback: Use rule-based smart labeling if AI fails or returns invalid result
        if (!aiCategory) {
          aiCategory = smartLabelEmail(
            parsedMessage.fromEmail || '',
            parsedMessage.subject || '',
            parsedMessage.snippet || ''
          );
          console.log(`[LABELING] [SMART] Subject: '${parsedMessage.subject?.substring(0, 40)}' | Sender: '${parsedMessage.fromEmail}' => Category: '${aiCategory}'`);
        }
        // Remove any previous labels (for demo: always overwrite)
        parsedMessage.labels = '[]';

        if (!existingMessage) {
          await messageModel.createMessage({ ...parsedMessage, aiCategory });
          syncedCount++;
          
          // Run decision classifier on new email
          try {
            const decisionClassifier = await import('../services/decisionClassifier.service.js');
            const classification = await decisionClassifier.default.classifyEmail(parsedMessage);
            
            if (classification.decision_required) {
              await decisionModel.upsertDecision({
                email_id: parsedMessage.gmailId,
                user_id: userId,
                decision_required: classification.decision_required,
                decision_score: classification.decision_score,
                decision_reason: classification.decision_reason,
                decision_type: classification.decision_type,
                status: 'pending'
              });
              console.log(`[DECISIONS] New decision: ${parsedMessage.subject?.substring(0, 40)} (score: ${classification.decision_score.toFixed(2)})`);
            }
          } catch (classifierError) {
            console.error('[DECISIONS] Classification error:', classifierError.message);
            // Don't fail sync if classification fails
          }
        } else {
          // Update existing message - Gmail is source of truth
          await messageModel.updateMessageByGmailId(parsedMessage.gmailId, {
            subject: parsedMessage.subject,
            from_email: parsedMessage.fromEmail,
            from_name: parsedMessage.fromName,
            to_email: parsedMessage.toEmail,
            to_name: parsedMessage.toName,
            cc_emails: parsedMessage.ccEmails,
            bcc_emails: parsedMessage.bccEmails,
            body_text: parsedMessage.bodyText,
            body_html: parsedMessage.bodyHtml,
            snippet: parsedMessage.snippet,
            date: parsedMessage.date,
            is_read: parsedMessage.isRead,
            is_starred: parsedMessage.isStarred,
            is_important: parsedMessage.isImportant,
            is_archived: parsedMessage.isArchived,
            is_deleted: parsedMessage.isDeleted,
            labels: parsedMessage.labels,
            ...(aiCategory ? { ai_category: aiCategory } : {})
          })
          updatedCount++;
        }
      } catch (messageError) {
        console.error(`❌ Error processing message ${message.id}:`, messageError.message);
      }
    }

    res.json({
      success: true,
      message: `Sync completed. ${syncedCount} new messages, ${updatedCount} existing messages`,
      synced: syncedCount,
      updated: updatedCount,
      total: allMessageRefs.length
    });

  } catch (error) {
    console.error('❌ Error syncing messages:', error.message);
    
    // Check if it's a rate limit error
    const isRateLimit = error.message?.includes('rate limit') || error.message?.includes('quotaExceeded');
    const rateLimitMatch = error.message?.match(/Retry after ([\d-T:.Z]+)/);
    
    res.status(isRateLimit ? 429 : 500).json({
      success: false,
      error: isRateLimit ? 'Gmail API rate limit exceeded' : 'Failed to sync messages',
      message: error.message,
      retryAfter: rateLimitMatch ? rateLimitMatch[1] : null,
      suggestion: isRateLimit 
        ? 'Please wait a few minutes before syncing again. Gmail has strict rate limits.'
        : 'Please try again later.'
    });
  }
}

/**
 * Get user messages with pagination and filters
 * GET /api/mail/messages
 */
async function getMessages(req, res) {
  try {
    const userId = req.user.userId;
    console.log('📧 getMessages called for user:', userId);
    
    const {
      page = 1,
      limit = 500,
      isRead,
      isStarred,
      isArchived,
      category,
      sortBy = 'date',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const options = {
      limit: parseInt(limit),
      offset,
      sortBy,
      sortOrder: sortOrder.toUpperCase(),
      // Exclude deleted messages from inbox by default
      isDeleted: false
    };

    // Add filters if provided
    if (isRead !== undefined) options.isRead = isRead === 'true';
    if (isStarred !== undefined) options.isStarred = isStarred === 'true';
    if (isArchived !== undefined) options.isArchived = isArchived === 'true';
    if (category) options.category = category;

    console.log('📋 Fetching messages with options:', options);

    const messages = await messageModel.getMessagesByUser(userId, options);
    console.log('✅ Retrieved', messages.length, 'messages');
    
    const stats = await messageModel.getMessageStats(userId);
    console.log('✅ Got stats:', stats);

    if (messages.length > 0) {
      console.log('Sample message structure:', {
        id: messages[0].id,
        subject: messages[0].subject,
        from_name: messages[0].from_name,
        from_email: messages[0].from_email,
        body_html: messages[0].body_html ? 'Has HTML' : 'No HTML',
        body_text: messages[0].body_text ? 'Has text' : 'No text'
      });
    }

    res.json({
      success: true,
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: stats.total_messages
      },
      stats
    });

  } catch (error) {
    console.error('❌ Error getting messages:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      userId: req.user?.userId,
      query: req.query,
      error: error.toString()
    });
    
    // Return empty result instead of 500 to allow UI to load
    console.log('⚠️  Returning empty messages array due to error (migrations may be pending)');
    res.json({
      success: true,
      messages: [],
      pagination: {
        page: 1,
        limit: 500,
        total: 0
      },
      stats: {
        total_messages: 0,
        unread_messages: 0,
        starred_messages: 0,
        archived_messages: 0,
        ai_processed_messages: 0
      },
      error: 'Database migration pending - please refresh in a moment'
    });
  }
}

/**
 * Get single message by ID
 * GET /api/mail/messages/:messageId
 * 
 * LAZY LOADING: If message details not loaded yet, fetch from Gmail
 */
async function getMessage(req, res) {
  try {
    // Support both /:id and /messages/:messageId style params
    const messageId = req.params.messageId || req.params.id;
    const userId = req.user.userId;

    let message = await messageModel.findMessageById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }
    
    // LAZY LOAD: Check if full details are loaded
    // Placeholder messages have subject "(Not loaded yet)"
    if (message.subject === '(Not loaded yet)' || !message.body_html) {
      console.log(`🔄 [LAZY LOAD] Fetching full details for message ${message.gmail_id}`);
      
      try {
        const gmail = await getGmailClient(userId);
        const messageDetails = await gmail.users.messages.get({
          userId: 'me',
          id: message.gmail_id,
          format: 'full'
        });
        
        const parsedMessage = parseGmailMessage(messageDetails.data, userId);
        
        // Update message in database with full details
        await messageModel.updateMessageByGmailId(message.gmail_id, {
          subject: parsedMessage.subject,
          from_email: parsedMessage.fromEmail,
          from_name: parsedMessage.fromName,
          to_email: parsedMessage.toEmail,
          to_name: parsedMessage.toName,
          cc_emails: parsedMessage.ccEmails,
          bcc_emails: parsedMessage.bccEmails,
          body_text: parsedMessage.bodyText,
          body_html: parsedMessage.bodyHtml,
          snippet: parsedMessage.snippet,
          date: parsedMessage.date,
          is_read: parsedMessage.isRead,
          is_starred: parsedMessage.isStarred,
          is_important: parsedMessage.isImportant,
          is_archived: parsedMessage.isArchived,
          is_deleted: parsedMessage.isDeleted,
          has_attachments: parsedMessage.hasAttachments,
          attachments: parsedMessage.attachments,
          labels: parsedMessage.labels
        });
        
        // Refetch updated message
        message = await messageModel.findMessageById(messageId);
        
        console.log(`✅ [LAZY LOAD] Loaded full details for: ${parsedMessage.subject}`);
        
      } catch (fetchError) {
        console.error('Failed to lazy load message:', fetchError.message);
        // Return placeholder data if fetch fails
      }
    }
    
    console.log('Retrieved message for ID', messageId, ':', {
      id: message.id,
      subject: message.subject,
      from_name: message.from_name,
      from_email: message.from_email,
        body_html: message.body_html ? 'Has HTML content' : 'No HTML',
        body_text: message.body_text ? 'Has text content' : 'No text'
      });

    // Verify message belongs to user
    if (message.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // If body content missing, fetch from Gmail now and update DB
    const noHtml = !message.body_html || message.body_html.trim() === ''
    const noText = !message.body_text || message.body_text.trim() === ''
    if (noHtml && noText && message.gmail_id) {
      try {
        const gmail = await getGmailClient(userId)
        const gmailDetails = await gmailConfig.getMessageDetails(gmail, message.gmail_id)
        const parsed = parseGmailMessage(gmailDetails, userId)

        await messageModel.updateMessageByGmailId(parsed.gmailId, {
          body_html: parsed.bodyHtml,
          body_text: parsed.bodyText,
          subject: parsed.subject,
          snippet: parsed.snippet
        })

        message = {
          ...message,
          body_html: parsed.bodyHtml || message.body_html,
          body_text: parsed.bodyText || message.body_text,
          subject: parsed.subject || message.subject,
          snippet: parsed.snippet || message.snippet
        }
      } catch (e) {
        console.warn('⚠️ Could not refresh message content from Gmail:', e.message)
      }
    }

    res.json({
      success: true,
      message
    });

  } catch (error) {
    console.error('❌ Error getting message:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get message',
      message: error.message
    });
  }
}

/**
 * Download attachment
 * GET /api/mail/messages/:messageId/attachments/:attachmentId
 * Query params: ?download=true (forces download) or ?download=false (inline preview)
 */
async function downloadAttachment(req, res) {
  try {
    const { messageId, attachmentId } = req.params;
    const userId = req.user.userId;
    const forceDownload = req.query.download !== 'false'; // Default to download

    console.log(`📎 [ATTACHMENT] Fetching attachment ${attachmentId} from message ${messageId} (download: ${forceDownload})`);

    // Get message from database
    const message = await messageModel.findMessageById(messageId);
    if (!message || message.user_id !== userId) {
      console.log(`❌ [ATTACHMENT] Message not found or unauthorized`);
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Parse attachments to find the requested one
    let attachments = [];
    try {
      attachments = JSON.parse(message.attachments || '[]');
    } catch (e) {
      console.error('Failed to parse attachments:', e);
    }

    const attachment = attachments.find(att => att.attachmentId === attachmentId);
    if (!attachment) {
      console.log(`❌ [ATTACHMENT] Attachment not found in message`);
      return res.status(404).json({
        success: false,
        error: 'Attachment not found'
      });
    }

    console.log(`📄 [ATTACHMENT] Found attachment: ${attachment.filename} (${attachment.mimeType})`);

    // Fetch attachment from Gmail
    const gmail = await getGmailClient(userId);
    
    const attachmentData = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: message.gmail_id,
      id: attachmentId
    });

    if (!attachmentData.data.data) {
      console.log(`❌ [ATTACHMENT] No data returned from Gmail`);
      return res.status(404).json({
        success: false,
        error: 'Attachment data not available'
      });
    }

    // Decode base64url data
    const data = attachmentData.data.data
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const buffer = Buffer.from(data, 'base64');

    console.log(`✅ [ATTACHMENT] Downloaded: ${attachment.filename} (${buffer.length} bytes)`);

    // Set appropriate headers
    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    
    // Use 'inline' for preview, 'attachment' for download
    const disposition = forceDownload ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${attachment.filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    // Add CORS headers for browser compatibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, Content-Length');

    res.send(buffer);

  } catch (error) {
    console.error('❌ Error downloading attachment:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to download attachment',
      message: error.message
    });
  }
}

/**
 * Mark message as read/unread
 * PUT /api/mail/messages/:messageId/read
 */
async function markAsRead(req, res) {
  try {
    const { messageId } = req.params;
    const { isRead = true } = req.body;
    const userId = req.user.userId;

    // Verify message belongs to user
    const message = await messageModel.findMessageById(messageId);
    if (!message || message.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    await messageModel.updateMessageReadStatus(messageId, isRead);

    res.json({
      success: true,
      message: `Message marked as ${isRead ? 'read' : 'unread'}`
    });

  } catch (error) {
    console.error('❌ Error updating read status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update read status',
      message: error.message
    });
  }
}

/**
 * Toggle message starred status
 * PUT /api/mail/messages/:messageId/star
 */
async function toggleStar(req, res) {
  try {
    const { messageId } = req.params;
    const { isStarred } = req.body;
    const userId = req.user.userId;

    // Verify message belongs to user
    const message = await messageModel.findMessageById(messageId);
    if (!message || message.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    const newStarredState = isStarred !== undefined ? isStarred : !message.is_starred;
    await messageModel.updateMessageStarred(messageId, newStarredState);

    res.json({
      success: true,
      message: `Message ${newStarredState ? 'starred' : 'unstarred'}`,
      isStarred: newStarredState
    });

  } catch (error) {
    console.error('❌ Error toggling star:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle star',
      message: error.message
    });
  }
}

/**
 * Archive/unarchive message
 * PUT /api/mail/messages/:messageId/archive
 */
async function archiveMessage(req, res) {
  try {
    const { messageId } = req.params;
    const { isArchived = true } = req.body;
    const userId = req.user.userId;

    // Verify message belongs to user
    const message = await messageModel.findMessageById(messageId);
    if (!message || message.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    await messageModel.updateMessageArchived(messageId, isArchived);

    res.json({
      success: true,
      message: `Message ${isArchived ? 'archived' : 'unarchived'}`
    });

  } catch (error) {
    console.error('❌ Error archiving message:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to archive message',
      message: error.message
    });
  }
}

/**
 * Delete message
 * DELETE /api/mail/messages/:messageId
 */
async function deleteMessage(req, res) {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    // Verify message belongs to user
    const message = await messageModel.findMessageById(messageId);
    if (!message || message.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Move to Trash in Gmail (not permanent delete)
    try {
      const gmail = await getGmailClient(userId);
      await gmail.users.messages.trash({
        userId: 'me',
        id: message.gmail_id
      });
      console.log(`✅ Message ${messageId} moved to Trash in Gmail`);
    } catch (gmailError) {
      console.error('Failed to trash in Gmail:', gmailError.message);
    }

    // Mark as deleted in local database (soft delete)
    await messageModel.updateMessage(messageId, {
      is_deleted: true,
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting message:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message',
      message: error.message
    });
  }
}

/**
 * Search messages
 * GET /api/mail/messages/search
 */
async function searchMessages(req, res) {
  try {
    const userId = req.user.userId;
    const { q: query, page = 1, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const messages = await messageModel.searchMessages(userId, query, {
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      messages,
      query,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: messages.length
      }
    });

  } catch (error) {
    console.error('❌ Error searching messages:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search messages',
      message: error.message
    });
  }
}

/**
 * Parse Gmail message data for database storage
 */
function parseGmailMessage(gmailMessage, userId) {
  const headers = gmailMessage.payload.headers || [];
  const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  // Extract body content
  let bodyText = '';
  let bodyHtml = '';

  // Gmail returns base64url encoded data; normalize to standard base64 before decoding
  const decodeBase64Url = (data) => {
    if (!data) return '';
    try {
      const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
      const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
      const finalData = normalized + padding;
      return Buffer.from(finalData, 'base64').toString('utf-8');
    } catch (e) {
      console.error('Failed to decode base64url content:', e.message);
      return '';
    }
  };

  const extractBody = (payload) => {
    if (!payload) return;
    if (payload.body && payload.body.data) {
      const decoded = decodeBase64Url(payload.body.data);
      if (payload.mimeType === 'text/html') {
        // Prefer HTML when present
        bodyHtml = bodyHtml || decoded;
      } else if (payload.mimeType === 'text/plain') {
        bodyText = bodyText || decoded;
      }
    }

    if (payload.parts && Array.isArray(payload.parts)) {
      payload.parts.forEach(extractBody);
    }
  };

  extractBody(gmailMessage.payload);

  // Extract attachments
  const attachments = [];
  const extractAttachments = (part) => {
    if (!part) return;
    
    // Check if this part is an attachment
    if (part.filename && part.body && part.body.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0,
        attachmentId: part.body.attachmentId
      });
    }
    
    // Recursively check nested parts
    if (part.parts && Array.isArray(part.parts)) {
      part.parts.forEach(extractAttachments);
    }
  };
  
  extractAttachments(gmailMessage.payload);

  // Helper function to parse email addresses
  const parseEmailAddress = (headerValue) => {
    if (!headerValue) return { email: '', name: '' };
    
    // Match patterns like "Name <email@domain.com>" or just "email@domain.com"
    const nameEmailMatch = headerValue.match(/^(.+?)\s*<(.+?)>$/);
    if (nameEmailMatch) {
      return {
        name: nameEmailMatch[1].replace(/['"]/g, '').trim(),
        email: nameEmailMatch[2].trim()
      };
    }
    
    // If no name part, just return the email
    return {
      name: '',
      email: headerValue.trim()
    };
  };

  const fromData = parseEmailAddress(getHeader('From'));
  const toData = parseEmailAddress(getHeader('To'));

  // Derive date and snippet from Gmail payload
  const internalDateMs = gmailMessage.internalDate ? parseInt(gmailMessage.internalDate, 10) : Date.now();
  const messageDateIso = new Date(internalDateMs).toISOString();
  const snippet = gmailMessage.snippet || '';

  const labelIds = gmailMessage.labelIds || [];
  
  // Extract subject for analysis
  const subject = getHeader('Subject') || '';
  
  // Detect if this is a sent email
  const isSent = labelIds.includes('SENT');
  
  // Detect if email requires reply (simple heuristic)
  const requiresReply = !isSent && 
    (subject.toLowerCase().includes('?') || 
     bodyText.toLowerCase().includes('please reply') ||
     bodyText.toLowerCase().includes('let me know') ||
     bodyText.toLowerCase().includes('get back to'));
  
  // Detect if requires action
  const requiresAction = !isSent && 
    !labelIds.includes('TRASH') &&
    (subject.toLowerCase().match(/action required|urgent|deadline|asap|respond by/i) ||
     bodyText.toLowerCase().match(/action required|please confirm|please review|please approve/i));
  
  // Detect newsletters (common patterns)
  const isNewsletter = labelIds.includes('CATEGORY_PROMOTIONS') ||
    labelIds.includes('CATEGORY_UPDATES') ||
    fromData.email.includes('noreply') ||
    fromData.email.includes('no-reply') ||
    subject.toLowerCase().includes('newsletter') ||
    subject.toLowerCase().includes('unsubscribe');
  
  return {
    userId,
    gmailId: gmailMessage.id,
    threadId: gmailMessage.threadId,
    subject,
    fromEmail: fromData.email,
    fromName: fromData.name || null,
    toEmail: toData.email,
    toName: toData.name || null,
    ccEmails: getHeader('Cc'),
    bccEmails: getHeader('Bcc'),
    bodyText,
    bodyHtml,
    snippet,
    date: messageDateIso,
    internalDate: internalDateMs,
    isRead: !labelIds.includes('UNREAD'),
    isStarred: labelIds.includes('STARRED') || false,
    isImportant: labelIds.includes('IMPORTANT') || false,
    isSent,
    isArchived: !labelIds.includes('INBOX'),
    isDeleted: labelIds.includes('TRASH'),
    labels: JSON.stringify(labelIds),
    hasAttachments: attachments.length > 0,
    attachments: JSON.stringify(attachments),
    requiresReply,
    requiresAction,
    isNewsletter
  };
}

/**
 * Get pending decisions for decision inbox
 * GET /api/mail/decisions/pending
 */
export async function getPendingDecisions(req, res) {
  try {
    const userId = req.user.userId;
    console.log(`[DECISIONS] Fetching pending decisions for user ${userId}`);
    
    // Get pending decisions with email details
    const decisions = await decisionModel.getPendingDecisions(userId);
    console.log(`[DECISIONS] Found ${decisions.length} pending decisions`);
    
    // Get count
    const count = decisions.length;
    
    res.json({
      success: true,
      count,
      decisions
    });
  } catch (err) {
    console.error('Get pending decisions error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending decisions',
      message: err.message
    });
  }
}

/**
 * Mark decision as done
 * POST /api/mail/decisions/:emailId/done
 */
export async function markDecisionAsDone(req, res) {
  try {
    const userId = req.user.userId;
    const { emailId } = req.params;
    console.log(`[DECISIONS] Marking ${emailId} as done for user ${userId}`);
    
    // Update decision status to 'done'
    const updated = await decisionModel.markDecisionDone(emailId, userId);
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Decision not found'
      });
    }
    
    // Remove Gmail label
    try {
      const gmailService = await import('../services/gmail.service.js');
      await gmailService.default.removeDecisionLabel(userId, emailId);
      console.log(`[DECISIONS] Removed SMARTMAIL_DECISION label from ${emailId}`);
    } catch (labelError) {
      console.error('Failed to remove Gmail label:', labelError.message);
      // Continue - label removal is optional
    }
    
    res.json({
      success: true,
      message: 'Decision marked as done'
    });
  } catch (err) {
    console.error('Mark decision as done error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to mark decision as done',
      message: err.message
    });
  }
}

/**
 * Mark as not a decision (negative feedback)
 * POST /api/mail/decisions/:emailId/not-decision
 */
export async function markAsNotDecision(req, res) {
  try {
    const userId = req.user.userId;
    const { emailId } = req.params;
    console.log(`[DECISIONS] Marking ${emailId} as not a decision for user ${userId}`);
    
    // Get the decision record for logging
    const decision = await decisionModel.getDecisionByEmailId(emailId, userId);
    
    if (decision) {
      console.log(`[DECISIONS] Negative feedback: decision_type=${decision.decision_type}, score=${decision.decision_score}, reason="${decision.decision_reason}"`);
      
      // Store feedback for learning
      await decisionModel.storeFeedback(emailId, userId, {
        type: 'not_decision',
        original_score: decision.decision_score,
        original_type: decision.decision_type,
        comment: 'User marked as not a decision'
      });
    }
    
    // Update decision status and mark as not required
    await decisionModel.markAsNotDecision(emailId, userId);
    
    // Remove Gmail label
    try {
      const gmailService = await import('../services/gmail.service.js');
      await gmailService.default.removeDecisionLabel(userId, emailId);
      console.log(`[DECISIONS] Removed SMARTMAIL_DECISION label from ${emailId}`);
    } catch (labelError) {
      console.error('Failed to remove Gmail label:', labelError.message);
    }
    
    res.json({
      success: true,
      message: 'Marked as not a decision'
    });
  } catch (err) {
    console.error('Mark as not decision error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to mark as not decision',
      message: err.message
    });
  }
}

/**
 * Ignore a decision
 * POST /api/mail/decisions/:emailId/ignore
 */
export async function ignoreDecision(req, res) {
  try {
    const userId = req.user.userId;
    const { emailId } = req.params;
    console.log(`[DECISIONS] Ignoring ${emailId} for user ${userId}`);
    
    // Update decision status to 'ignored'
    const updated = await decisionModel.updateDecisionStatusByEmailId(emailId, userId, 'ignored');
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Decision not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Decision ignored'
    });
  } catch (err) {
    console.error('Ignore decision error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to ignore decision',
      message: err.message
    });
  }
}

/**
 * Snooze a decision
 * POST /api/mail/decisions/:emailId/snooze
 */
export async function snoozeDecision(req, res) {
  try {
    const userId = req.user.userId;
    const { emailId } = req.params;
    const { snoozedUntil } = req.body;
    
    if (!snoozedUntil) {
      return res.status(400).json({
        success: false,
        error: 'snoozedUntil is required (ISO timestamp)'
      });
    }
    
    console.log(`[DECISIONS] Snoozing ${emailId} until ${snoozedUntil} for user ${userId}`);
    
    // Update decision status to 'snoozed' with snooze timestamp
    const updated = await decisionModel.updateDecisionStatusByEmailId(
      emailId, 
      userId, 
      'snoozed', 
      snoozedUntil
    );
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Decision not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Decision snoozed',
      snoozedUntil
    });
  } catch (err) {
    console.error('Snooze decision error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to snooze decision',
      message: err.message
    });
  }
}

/**
 * Mark decision as completed
 * POST /api/mail/decisions/:emailId/completed
 */
export async function markDecisionCompleted(req, res) {
  try {
    const userId = req.user.userId;
    const { emailId } = req.params;
    console.log(`[DECISIONS] Marking ${emailId} as completed for user ${userId}`);
    
    // Update decision status to 'completed'
    const updated = await decisionModel.updateDecisionStatusByEmailId(emailId, userId, 'completed');
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Decision not found'
      });
    }
    
    // Remove Gmail label
    try {
      const gmailService = await import('../services/gmail.service.js');
      await gmailService.default.removeDecisionLabel(userId, emailId);
      console.log(`[DECISIONS] Removed SMARTMAIL_DECISION label from ${emailId}`);
    } catch (labelError) {
      console.error('Failed to remove Gmail label:', labelError.message);
    }
    
    res.json({
      success: true,
      message: 'Decision marked as completed'
    });
  } catch (err) {
    console.error('Mark decision completed error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to mark decision as completed',
      message: err.message
    });
  }
}

export {
  syncMessages,
  getMessages,
  getMessage,
  downloadAttachment,
  getSentEmails,
  getStarredEmails,
  getTrashEmails,
  getArchivedEmails,
  markAsRead,
  toggleStar,
  archiveMessage,
  deleteMessage,
  searchMessages
};

/**
 * Send email (with optional attachments)
 * POST /api/mail/send
 */
export async function sendMessage(req, res) {
  try {
    const userId = req.user?.userId;
    const { to, cc = '', bcc = '', subject = '', body = '' } = req.body || {};
    const files = req.files || [];

    if (!to || !subject || !body) {
      return res.status(400).json({ success: false, error: 'to, subject and body are required' });
    }

    let gmail;
    try {
      gmail = await getGmailClient(userId);
    } catch (e) {
      gmail = null;
    }

    // Build MIME message
    const boundary = 'smartmail_boundary_' + Date.now();
    const headers = [
      `To: ${to}`,
      cc ? `Cc: ${cc}` : null,
      bcc ? `Bcc: ${bcc}` : null,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      files.length > 0
        ? `Content-Type: multipart/mixed; boundary="${boundary}"`
        : 'Content-Type: text/plain; charset=UTF-8',
      '',
    ].filter(Boolean).join('\r\n');

    let mime;
    if (files.length === 0) {
      mime = headers + '\r\n' + body;
    } else {
      const parts = [];
      // text part
      parts.push(
        `--${boundary}\r\n` +
        `Content-Type: text/plain; charset=UTF-8\r\n` +
        `Content-Transfer-Encoding: 7bit\r\n\r\n` +
        `${body}\r\n`
      );
      // attachments
      for (const f of files) {
        const b64 = Buffer.from(f.buffer).toString('base64');
        // Split base64 into 76-character lines as per RFC 2045
        const b64Lines = b64.match(/.{1,76}/g).join('\r\n');
        
        parts.push(
          `--${boundary}\r\n` +
          `Content-Type: ${f.mimetype}; name="${f.originalname}"\r\n` +
          `Content-Transfer-Encoding: base64\r\n` +
          `Content-Disposition: attachment; filename="${f.originalname}"\r\n\r\n` +
          `${b64Lines}\r\n`
        );
      }
      parts.push(`--${boundary}--\r\n`);
      mime = headers + '\r\n' + parts.join('');
    }

    const raw = Buffer.from(mime)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    if (gmail) {
      try {
        const resp = await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw }
        });
        
        // Fetch the sent message from Gmail and save to database
        try {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s for Gmail to index
          const gmailDetails = await gmailConfig.getMessageDetails(gmail, resp.data.id);
          const parsedMessage = parseGmailMessage(gmailDetails, userId);
          
          // Save to database
          const existing = await messageModel.findMessageByGmailId(parsedMessage.gmailId);
          if (!existing) {
            await messageModel.createMessage(parsedMessage);
            console.log('✅ Sent email saved to database');
          }
        } catch (saveErr) {
          console.warn('Failed to save sent email to database:', saveErr.message);
        }
        
        return res.json({ success: true, id: resp.data.id });
      } catch (err) {
        console.error('Gmail send failed, falling back:', err.message);
      }
    }

    // Fallback: pretend to send and return a mock id
    return res.json({ success: true, id: 'mock-' + Date.now(), note: 'sent in dev mode' });
  } catch (error) {
    console.error('Send email error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
}

/**
 * Reply All to a message
 * POST /api/mail/messages/:messageId/reply-all
 */
export async function replyAllToMessage(req, res) {
  try {
    const { messageId } = req.params;
    const { recipients, body } = req.body;
    const userId = req.user.userId;

    console.log(`Replying to message ${messageId} for user ${userId}`);

    // Get message from database to get Gmail ID
    const message = await messageModel.findMessageById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Get Gmail client
    const gmail = await getGmailClient(userId);

    // Get original message to extract headers using Gmail ID
    const originalMsg = await gmail.users.messages.get({
      userId: 'me',
      id: message.gmail_id,
      format: 'full'
    });

    // Extract message-id and references for threading
    const headers = originalMsg.data.payload.headers;
    const messageIdHeader = headers.find(h => h.name.toLowerCase() === 'message-id');
    const referencesHeader = headers.find(h => h.name.toLowerCase() === 'references');
    
    const references = referencesHeader 
      ? `${referencesHeader.value} ${messageIdHeader?.value || ''}`
      : messageIdHeader?.value || '';

    // Build email
    const toAddresses = Array.isArray(to) ? to.join(', ') : to;
    const emailLines = [
      `To: ${toAddresses}`,
      `Subject: ${subject}`,
      `In-Reply-To: ${messageIdHeader?.value || ''}`,
      `References: ${references}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body
    ];

    const raw = Buffer.from(emailLines.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    // Send via Gmail API
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { 
        raw,
        threadId: originalMsg.data.threadId // Keep in same thread
      }
    });

    console.log(`Reply All sent successfully: ${response.data.id}`);

    res.json({ 
      success: true, 
      messageId: response.data.id,
      threadId: response.data.threadId
    });

  } catch (error) {
    console.error('Reply All error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to send reply' 
    });
  }
}

/**
 * Forward a message
 * POST /api/mail/messages/:messageId/forward
 */
export async function forwardMessage(req, res) {
  try {
    const { messageId } = req.params;
    const { to, cc, subject, body, includeAttachments } = req.body;
    const userId = req.user.userId;

    console.log(`Forwarding message ${messageId} for user ${userId}`);

    // Get message from database to get Gmail ID
    const message = await messageModel.findMessageById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    console.log(`Found message in DB: ID=${message.id}, Gmail ID=${message.gmail_id}`);

    // Get Gmail client
    const gmail = await getGmailClient(userId);

    // Get original message using Gmail ID
    const originalMsg = await gmail.users.messages.get({
      userId: 'me',
      id: message.gmail_id,
      format: 'full'
    });

    // Extract original email details
    const headers = originalMsg.data.payload.headers;
    const originalFrom = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown';
    const originalDate = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';
    const originalSubject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
    const originalTo = headers.find(h => h.name.toLowerCase() === 'to')?.value || '';
    const originalCc = headers.find(h => h.name.toLowerCase() === 'cc')?.value || '';

    // Get original body from database (which has the properly formatted HTML)
    const originalBody = message.body_html || message.body_text || '';

    // Build forwarded message in Gmail style
    const forwardedContent = `
<div dir="ltr">${body || ''}</div>
<br/>
<div class="gmail_quote">
  <div dir="ltr" class="gmail_attr">---------- Forwarded message ---------<br/>
    From: <strong>${originalFrom}</strong><br/>
    Date: ${originalDate}<br/>
    Subject: ${originalSubject}<br/>
    ${originalTo ? `To: ${originalTo}<br/>` : ''}
    ${originalCc ? `Cc: ${originalCc}<br/>` : ''}
  </div>
  <br/>
  <div dir="ltr">${originalBody}</div>
</div>
`;

    // Build email
    const toAddresses = Array.isArray(to) ? to.join(', ') : to;
    const ccAddresses = cc && cc.length > 0 ? (Array.isArray(cc) ? cc.join(', ') : cc) : '';

    // Wrap in proper HTML structure
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body>
${forwardedContent}
</body>
</html>
`;

    const emailLines = [
      `To: ${toAddresses}`,
      ccAddresses ? `Cc: ${ccAddresses}` : '',
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlContent
    ].filter(line => line !== ''); // Remove empty lines

    const raw = Buffer.from(emailLines.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    // Send via Gmail API
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });

    console.log(`Email forwarded successfully: ${response.data.id}`);

    res.json({ 
      success: true, 
      messageId: response.data.id
    });

  } catch (error) {
    console.error('Forward email error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to forward email' 
    });
  }
}

/**
 * Batch delete messages
 * POST /api/mail/batch-delete
 */
export async function batchDeleteMessages(req, res) {
  try {
    const { messageIds } = req.body; // Array of database message IDs
    const userId = req.user.userId;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'messageIds must be a non-empty array' });
    }

    console.log(`Batch deleting ${messageIds.length} messages for user ${userId}`);

    // Get messages from database to get Gmail IDs
    const gmailIds = [];
    for (const msgId of messageIds) {
      const message = await messageModel.findMessageById(msgId);
      if (message) {
        gmailIds.push(message.gmail_id);
      }
    }

    if (gmailIds.length === 0) {
      return res.status(404).json({ error: 'No messages found' });
    }

    // Get Gmail client
    const gmail = await getGmailClient(userId);

    // Move to Trash instead of permanent delete (like Gmail does)
    // Trash messages one by one (no batch API for trash)
    let trashedCount = 0;
    for (const gmailId of gmailIds) {
      try {
        await gmail.users.messages.trash({
          userId: 'me',
          id: gmailId
        });
        
        // Refetch message from Gmail to get updated labels
        const gmailDetails = await gmailConfig.getMessageDetails(gmail, gmailId);
        const parsed = parseGmailMessage(gmailDetails, userId);
        
        // Update local database with Gmail's state (source of truth)
        await messageModel.updateMessageByGmailId(parsed.gmailId, {
          is_deleted: parsed.isDeleted,
          is_archived: parsed.isArchived,
          labels: parsed.labels
        });
        
        trashedCount++;
      } catch (err) {
        console.error(`Failed to trash message ${gmailId}:`, err.message);
      }
    }

    console.log(`Successfully moved ${trashedCount} messages to Trash`);

    res.json({
      success: true,
      deletedCount: gmailIds.length
    });

  } catch (error) {
    console.error('Batch delete error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to batch delete messages'
    });
  }
}

/**
 * Batch archive messages
 * POST /api/mail/batch-archive
 */
export async function batchArchiveMessages(req, res) {
  try {
    const { messageIds } = req.body; // Array of database message IDs
    const userId = req.user.userId;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'messageIds must be a non-empty array' });
    }

    console.log(`Batch archiving ${messageIds.length} messages for user ${userId}`);

    // Get messages from database to get Gmail IDs
    const gmailIds = [];
    for (const msgId of messageIds) {
      const message = await messageModel.findMessageById(msgId);
      if (message) {
        gmailIds.push(message.gmail_id);
      }
    }

    if (gmailIds.length === 0) {
      return res.status(404).json({ error: 'No messages found' });
    }

    // Get Gmail client
    const gmail = await getGmailClient(userId);

    // Batch modify to remove INBOX label (archive)
    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids: gmailIds,
        removeLabelIds: ['INBOX']
      }
    });

    // Refetch messages from Gmail to get updated labels
    let updatedCount = 0;
    for (const gmailId of gmailIds) {
      try {
        const gmailDetails = await gmailConfig.getMessageDetails(gmail, gmailId);
        const parsed = parseGmailMessage(gmailDetails, userId);
        
        // Update local database with Gmail's state (source of truth)
        await messageModel.updateMessageByGmailId(parsed.gmailId, {
          is_deleted: parsed.isDeleted,
          is_archived: parsed.isArchived,
          labels: parsed.labels
        });
        updatedCount++;
      } catch (err) {
        console.error(`Failed to refetch message ${gmailId}:`, err.message);
      }
    }

    console.log(`Successfully archived ${updatedCount} messages`);

    res.json({
      success: true,
      archivedCount: gmailIds.length
    });

  } catch (error) {
    console.error('Batch archive error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to batch archive messages'
    });
  }
}

/**
 * Batch mark messages as read/unread
 * POST /api/mail/batch-read
 */
export async function batchMarkAsRead(req, res) {
  try {
    const { messageIds, isRead } = req.body; // Array of database message IDs, boolean isRead
    const userId = req.user.userId;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'messageIds must be a non-empty array' });
    }

    if (typeof isRead !== 'boolean') {
      return res.status(400).json({ error: 'isRead must be a boolean' });
    }

    console.log(`Batch marking ${messageIds.length} messages as ${isRead ? 'read' : 'unread'} for user ${userId}`);

    // Get messages from database to get Gmail IDs
    const gmailIds = [];
    for (const msgId of messageIds) {
      const message = await messageModel.findMessageById(msgId);
      if (message) {
        gmailIds.push(message.gmail_id);
      }
    }

    if (gmailIds.length === 0) {
      return res.status(404).json({ error: 'No messages found' });
    }

    // Get Gmail client
    const gmail = await getGmailClient(userId);

    // Batch modify to add/remove UNREAD label
    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids: gmailIds,
        ...(isRead 
          ? { removeLabelIds: ['UNREAD'] }
          : { addLabelIds: ['UNREAD'] }
        )
      }
    });

    // Refetch messages from Gmail to get updated labels
    let updatedCount = 0;
    for (const gmailId of gmailIds) {
      try {
        const gmailDetails = await gmailConfig.getMessageDetails(gmail, gmailId);
        const parsed = parseGmailMessage(gmailDetails, userId);
        
        // Update local database with Gmail's state (source of truth)
        await messageModel.updateMessageByGmailId(parsed.gmailId, {
          is_read: parsed.isRead,
          labels: parsed.labels
        });
        updatedCount++;
      } catch (err) {
        console.error(`Failed to refetch message ${gmailId}:`, err.message);
      }
    }

    console.log(`Successfully marked ${updatedCount} messages as ${isRead ? 'read' : 'unread'}`);

    res.json({
      success: true,
      updatedCount: gmailIds.length
    });

  } catch (error) {
    console.error('Batch mark as read error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to batch mark messages'
    });
  }
}

/**
 * Get sent emails from local database
 * GET /api/mail/sent
 */
async function getSentEmails(req, res) {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    console.log(`Fetching sent emails for user ${userId} from database`);

    // Query local database for sent emails
    const messages = await messageModel.getMessagesByUser(userId, {
      limit,
      offset,
      isSent: true, // Filter by is_sent flag
      isDeleted: false,
      sortBy: 'date',
      sortOrder: 'DESC'
    });

    console.log(`Found ${messages.length} sent messages in database`);

    res.json({
      success: true,
      messages,
      total: messages.length
    });

  } catch (error) {
    console.error('Error fetching sent emails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sent emails',
      message: error.message
    });
  }
}

/**
 * Get starred emails from local database
 * GET /api/mail/starred
 */
async function getStarredEmails(req, res) {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    console.log(`Fetching starred emails for user ${userId} from database`);

    // Query local database for starred emails
    const messages = await messageModel.getMessagesByUser(userId, {
      limit,
      offset,
      isStarred: true,
      isDeleted: false,
      sortBy: 'date',
      sortOrder: 'DESC'
    });

    console.log(`Found ${messages.length} starred messages in database`);

    res.json({
      success: true,
      messages,
      total: messages.length
    });

  } catch (error) {
    console.error('Error fetching starred emails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch starred emails',
      message: error.message
    });
  }
}

/**
 * Get trash emails from local database
 * GET /api/mail/trash
 */
async function getTrashEmails(req, res) {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    console.log(`Fetching trash emails for user ${userId} from database`);

    // Query local database for deleted emails
    const messages = await messageModel.getMessagesByUser(userId, {
      limit,
      offset,
      isDeleted: true,
      sortBy: 'date',
      sortOrder: 'DESC'
    });

    console.log(`Found ${messages.length} trash messages in database`);

    res.json({
      success: true,
      messages,
      total: messages.length
    });

  } catch (error) {
    console.error('Error fetching trash emails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trash emails',
      message: error.message
    });
  }
}

/**
 * Get archived emails from local database
 * GET /api/mail/archive
 */
async function getArchivedEmails(req, res) {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    console.log(`Fetching archived emails for user ${userId} from database`);

    // Query local database for archived emails
    const messages = await messageModel.getMessagesByUser(userId, {
      limit,
      offset,
      isArchived: true,
      isDeleted: false,
      sortBy: 'date',
      sortOrder: 'DESC'
    });

    console.log(`Found ${messages.length} archived messages in database`);

    res.json({
      success: true,
      messages,
      total: messages.length
    });

  } catch (error) {
    console.error('Error fetching archived emails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch archived emails',
      message: error.message
    });
  }
}