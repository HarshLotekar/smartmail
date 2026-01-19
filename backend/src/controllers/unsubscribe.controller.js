/**
 * Unsubscribe Controller
 * Handles unsubscribe operations for emails
 */

import * as messageModel from '../models/message.model.js';
import * as userModel from '../models/user.model.js';
import * as gmailConfig from '../config/gmail.js';
import * as unsubscribeModel from '../models/unsubscribe.model.js';

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

    return gmailConfig.createGmailClient(newTokens.access_token, newTokens.refresh_token || user.refresh_token);
  }

  return gmailConfig.createGmailClient(user.access_token, user.refresh_token);
}

/**
 * Get unsubscribe info from email headers
 * GET /api/mail/messages/:messageId/unsubscribe-info
 */
export async function getUnsubscribeInfo(req, res) {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    // Get message from database
    const message = await messageModel.findMessageById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Get Gmail client
    const gmail = await getGmailClient(userId);

    // Get full message with headers
    const gmailMsg = await gmail.users.messages.get({
      userId: 'me',
      id: message.gmail_id,
      format: 'full'
    });

    const headers = gmailMsg.data.payload.headers;
    
    // Look for List-Unsubscribe header
    const listUnsubscribe = headers.find(h => h.name.toLowerCase() === 'list-unsubscribe')?.value;
    const listUnsubscribePost = headers.find(h => h.name.toLowerCase() === 'list-unsubscribe-post')?.value;

    if (!listUnsubscribe) {
      return res.json({ 
        available: false,
        message: 'This email does not support unsubscribe'
      });
    }

    // Parse unsubscribe methods
    const methods = [];
    
    // Check for HTTP unsubscribe (preferred)
    const httpMatch = listUnsubscribe.match(/<(https?:\/\/[^>]+)>/);
    if (httpMatch) {
      methods.push({
        type: 'http',
        url: httpMatch[1],
        oneClick: !!listUnsubscribePost
      });
    }

    // Check for mailto unsubscribe
    const mailtoMatch = listUnsubscribe.match(/<mailto:([^>]+)>/);
    if (mailtoMatch) {
      methods.push({
        type: 'mailto',
        email: mailtoMatch[1]
      });
    }

    res.json({
      available: methods.length > 0,
      methods,
      from: message.from_email,
      fromName: message.from_name
    });

  } catch (error) {
    console.error('Get unsubscribe info error:', error);
    res.status(500).json({ 
      error: 'Failed to get unsubscribe information',
      details: error.message 
    });
  }
}

/**
 * Perform unsubscribe action
 * POST /api/mail/messages/:messageId/unsubscribe
 */
export async function unsubscribeFromEmail(req, res) {
  try {
    const { messageId } = req.params;
    const { method } = req.body; // 'http' or 'mailto'
    const userId = req.user.userId;

    // Get unsubscribe info first
    const message = await messageModel.findMessageById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Get Gmail client
    const gmail = await getGmailClient(userId);

    // Get full message with headers
    const gmailMsg = await gmail.users.messages.get({
      userId: 'me',
      id: message.gmail_id,
      format: 'full'
    });

    const headers = gmailMsg.data.payload.headers;
    const listUnsubscribe = headers.find(h => h.name.toLowerCase() === 'list-unsubscribe')?.value;
    const listUnsubscribePost = headers.find(h => h.name.toLowerCase() === 'list-unsubscribe-post')?.value;

    if (!listUnsubscribe) {
      return res.status(400).json({ error: 'Email does not support unsubscribe' });
    }

    if (method === 'http') {
      // HTTP unsubscribe
      const httpMatch = listUnsubscribe.match(/<(https?:\/\/[^>]+)>/);
      if (!httpMatch) {
        return res.status(400).json({ error: 'HTTP unsubscribe not available' });
      }

      const unsubscribeUrl = httpMatch[1];

      // If one-click unsubscribe is supported, use POST
      if (listUnsubscribePost && listUnsubscribePost.includes('List-Unsubscribe=One-Click')) {
        const response = await fetch(unsubscribeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'List-Unsubscribe=One-Click'
        });

        if (!response.ok) {
          throw new Error(`Unsubscribe request failed: ${response.status}`);
        }

        // Track unsubscribe
        await unsubscribeModel.addUnsubscribe(userId, message.from_email, 'http-oneclick');

        return res.json({
          success: true,
          method: 'one-click',
          message: 'Successfully unsubscribed (one-click)'
        });
      } else {
        // Track unsubscribe
        await unsubscribeModel.addUnsubscribe(userId, message.from_email, 'http');

        // Return URL for user to visit
        return res.json({
          success: true,
          method: 'url',
          url: unsubscribeUrl,
          message: 'Please visit the URL to complete unsubscribe'
        });
      }

    } else if (method === 'mailto') {
      // Mailto unsubscribe - return the mailto link
      const mailtoMatch = listUnsubscribe.match(/<mailto:([^>]+)>/);
      if (!mailtoMatch) {
        return res.status(400).json({ error: 'Mailto unsubscribe not available' });
      }

      // Track unsubscribe
      await unsubscribeModel.addUnsubscribe(userId, message.from_email, 'mailto');

      return res.json({
        success: true,
        method: 'mailto',
        email: mailtoMatch[1],
        message: 'Send an email to complete unsubscribe'
      });

    } else {
      return res.status(400).json({ error: 'Invalid unsubscribe method' });
    }

  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ 
      error: 'Failed to unsubscribe',
      details: error.message 
    });
  }
}

/**
 * Get all unsubscribed email addresses
 * GET /api/mail/unsubscribes
 */
export async function getUnsubscribes(req, res) {
  try {
    const userId = req.user.userId;
    const unsubscribes = await unsubscribeModel.getUnsubscribes(userId);

    res.json({
      success: true,
      unsubscribes
    });

  } catch (error) {
    console.error('Get unsubscribes error:', error);
    res.status(500).json({
      error: 'Failed to get unsubscribes',
      details: error.message
    });
  }
}
