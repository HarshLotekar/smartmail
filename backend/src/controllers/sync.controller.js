import * as gmailConfig from '../config/gmail.js';
import * as messageModel from '../models/message.model.js';
import * as userModel from '../models/user.model.js';
import * as decisionModel from '../models/decision.model.js';
import { smartLabelEmail } from '../utils/smartLabel.js';

/**
 * Incremental Gmail Sync Controller
 * Uses Gmail History API for quota-efficient syncing
 * 
 * QUOTA SAFETY RULES:
 * 1. Never sync on page load
 * 2. Use history API after first sync
 * 3. Fetch message IDs only during sync (1 quota unit per call)
 * 4. Fetch full message details ONLY when user opens email
 * 5. Stop immediately on rate limit
 */

// Helper for exponential backoff delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get Gmail client for authenticated user
 */
async function getGmailClient(userId) {
  const user = await userModel.findUserById(userId);
  
  if (!user || !user.access_token) {
    throw new Error('User not authenticated with Gmail');
  }

  // Check for active rate limit
  if (userModel.isRateLimited(user)) {
    const retryAfter = new Date(user.rate_limit_retry_after);
    throw {
      status: 429,
      message: `Rate limited. Retry after ${retryAfter.toISOString()}`,
      retryAfter: retryAfter.toISOString()
    };
  }

  // Check if token needs refresh
  if (!userModel.isTokenValid(user)) {
    if (!user.refresh_token) {
      throw new Error('No refresh token available');
    }

    const newTokens = await gmailConfig.refreshAccessToken(user.refresh_token);
    const expiresAt = new Date(Date.now() + (newTokens.expires_in || 3600) * 1000);

    await userModel.updateUserTokens(
      userId,
      newTokens.access_token,
      newTokens.refresh_token || user.refresh_token,
      expiresAt
    );

    return gmailConfig.createGmailClient(newTokens.access_token, newTokens.refresh_token || user.refresh_token);
  }

  return gmailConfig.createGmailClient(user.access_token, user.refresh_token);
}

/**
 * Incremental Sync using Gmail History API
 * POST /api/mail/sync/incremental
 * 
 * QUOTA USAGE:
 * - First sync: uses messages.list (5 units per call)
 * - Subsequent syncs: uses history.list (1 unit per call)
 * - NEVER fetches full message details during sync
 */
async function incrementalSync(req, res) {
  try {
    const userId = req.user.userId;
    
    console.log(`🔄 [SYNC] Starting incremental sync for user ${userId}`);
    
    const user = await userModel.findUserById(userId);
    const gmail = await getGmailClient(userId);
    
    // Check if this is the first sync (no history ID)
    if (!user.gmail_history_id) {
      console.log('📋 [SYNC] First sync detected - fetching initial message list');
      return await initialSync(req, res, gmail, userId);
    }
    
    // Use history API for incremental sync (QUOTA EFFICIENT!)
    console.log(`📜 [SYNC] Using history API from historyId: ${user.gmail_history_id}`);
    
    let newMessages = [];
    let historyRecords = [];
    let startHistoryId = user.gmail_history_id;
    let pageToken = null;
    
    try {
      do {
        const historyResponse = await gmail.users.history.list({
          userId: 'me',
          startHistoryId: startHistoryId,
          historyTypes: ['messageAdded'],
          maxResults: 100,
          pageToken: pageToken
        });
        
        if (historyResponse.data.history) {
          historyRecords = historyRecords.concat(historyResponse.data.history);
        }
        
        pageToken = historyResponse.data.nextPageToken;
        
        // Update history ID to latest
        if (historyResponse.data.historyId) {
          startHistoryId = historyResponse.data.historyId;
        }
        
      } while (pageToken);
      
      // Extract new message IDs from history
      for (const record of historyRecords) {
        if (record.messagesAdded) {
          for (const added of record.messagesAdded) {
            newMessages.push(added.message);
          }
        }
      }
      
      console.log(`📬 [SYNC] Found ${newMessages.length} new messages since last sync`);
      
      // Store ONLY message IDs and basic metadata (NO FULL FETCH)
      let savedCount = 0;
      
      for (const msg of newMessages) {
        // Check if already exists
        const existing = await messageModel.findMessageByGmailId(msg.id);
        if (!existing) {
          // Save placeholder - will fetch full details when user opens email
          await messageModel.createMessage({
            userId: userId,
            gmailId: msg.id,
            threadId: msg.threadId,
            subject: '(Not loaded yet)',
            fromEmail: '',
            fromName: '',
            toEmail: '',
            toName: '',
            bodyText: '',
            bodyHtml: '',
            snippet: '',
            date: new Date().toISOString(),
            isRead: false,
            labels: JSON.stringify(msg.labelIds || [])
          });
          savedCount++;
        }
      }
      
      // Update user's history ID
      await userModel.updateUserHistoryId(userId, startHistoryId);
      
      res.json({
        success: true,
        message: `Incremental sync completed. ${savedCount} new messages tracked.`,
        newMessages: savedCount,
        latestHistoryId: startHistoryId,
        quotaUsed: `~${historyRecords.length} units (history API)`
      });
      
    } catch (historyError) {
      // History ID expired - need full resync
      if (historyError.code === 404 || historyError.message?.includes('historyId')) {
        console.log('⚠️ [SYNC] History ID expired - triggering controlled full resync');
        return await initialSync(req, res, gmail, userId);
      }
      throw historyError;
    }
    
  } catch (error) {
    return handleSyncError(error, req.user.userId, res);
  }
}

/**
 * Initial sync - fetches message list (NOT full details)
 * QUOTA EFFICIENT: Only fetches IDs + basic metadata
 */
async function initialSync(req, res, gmail, userId) {
  try {
    console.log('🔄 [SYNC] Initial sync - fetching message list (IDs only)');
    
    const maxMessages = 50; // Conservative limit for initial sync
    let allMessages = [];
    let pageToken = null;
    
    // Fetch message IDs only (fields parameter reduces response size)
    do {
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: maxMessages,
        pageToken: pageToken,
        fields: 'messages(id,threadId,labelIds),nextPageToken,resultSizeEstimate'
      });
      
      if (response.data.messages) {
        allMessages = allMessages.concat(response.data.messages);
      }
      
      pageToken = response.data.nextPageToken;
      
      // Stop after one page for initial sync
      break;
      
    } while (pageToken && allMessages.length < maxMessages);
    
    console.log(`📬 [SYNC] Found ${allMessages.length} messages to track`);
    
    // Save message placeholders (NO FULL FETCH)
    let savedCount = 0;
    
    for (const msg of allMessages) {
      const existing = await messageModel.findMessageByGmailId(msg.id);
      if (!existing) {
        await messageModel.createMessage({
          userId: userId,
          gmailId: msg.id,
          threadId: msg.threadId,
          subject: '(Not loaded yet)',
          fromEmail: '',
          fromName: '',
          toEmail: '',
          toName: '',
          bodyText: '',
          bodyHtml: '',
          snippet: '',
          date: new Date().toISOString(),
          isRead: false,
          labels: JSON.stringify(msg.labelIds || [])
        });
        savedCount++;
      }
    }
    
    // Get latest history ID for future incremental syncs
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const historyId = profile.data.historyId;
    
    await userModel.updateUserHistoryId(userId, historyId);
    
    res.json({
      success: true,
      message: `Initial sync completed. ${savedCount} messages tracked.`,
      newMessages: savedCount,
      latestHistoryId: historyId,
      quotaUsed: `~${Math.ceil(allMessages.length / maxMessages) * 5} units (list API)`
    });
    
  } catch (error) {
    throw error;
  }
}

/**
 * Handle sync errors with proper rate limit detection
 */
function handleSyncError(error, userId, res) {
  console.error('❌ [SYNC] Error:', error.message);
  
  // Detect rate limit errors
  const isRateLimit = 
    error.status === 429 ||
    error.code === 429 ||
    error.message?.toLowerCase().includes('rate limit') ||
    error.message?.toLowerCase().includes('quota');
  
  if (isRateLimit) {
    // Extract retry time or calculate exponential backoff
    let retryAfter;
    
    if (error.retryAfter) {
      retryAfter = error.retryAfter;
    } else {
      // Default: 15 minutes
      retryAfter = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    }
    
    // Store rate limit in database
    userModel.setRateLimitRetryAfter(userId, retryAfter).catch(err => {
      console.error('Failed to store rate limit:', err);
    });
    
    return res.status(429).json({
      success: false,
      error: 'Gmail API rate limit exceeded',
      message: 'Sync paused due to Gmail quota limits.',
      retryAfter: retryAfter,
      quotaInfo: {
        limit: '250 units/second per user',
        suggestion: 'Wait before syncing again. Use incremental sync to reduce quota usage.'
      }
    });
  }
  
  // Other errors
  return res.status(500).json({
    success: false,
    error: 'Sync failed',
    message: error.message
  });
}

/**
 * Get sync status for user
 * GET /api/mail/sync/status
 */
async function getSyncStatus(req, res) {
  try {
    const userId = req.user.userId;
    const user = await userModel.findUserById(userId);
    
    const isRateLimited = userModel.isRateLimited(user);
    const retryAfter = user.rate_limit_retry_after ? new Date(user.rate_limit_retry_after) : null;
    const lastSync = user.last_sync_at ? new Date(user.last_sync_at) : null;
    
    res.json({
      success: true,
      status: {
        isRateLimited: isRateLimited,
        retryAfter: retryAfter ? retryAfter.toISOString() : null,
        lastSyncAt: lastSync ? lastSync.toISOString() : null,
        hasHistoryId: !!user.gmail_history_id,
        canSync: !isRateLimited
      }
    });
    
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status'
    });
  }
}

/**
 * Clear rate limit manually (admin/debug)
 * POST /api/mail/sync/clear-rate-limit
 */
async function clearRateLimitManually(req, res) {
  try {
    const userId = req.user.userId;
    await userModel.clearRateLimit(userId);
    
    res.json({
      success: true,
      message: 'Rate limit cleared'
    });
    
  } catch (error) {
    console.error('Error clearing rate limit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear rate limit'
    });
  }
}

export {
  incrementalSync,
  getSyncStatus,
  clearRateLimitManually
};
