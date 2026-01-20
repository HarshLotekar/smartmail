import * as gmailConfig from '../config/gmail.js';
import * as UserModel from '../models/user.model.js';
import * as MessageModel from '../models/message.model.js';
import * as LabelModel from '../models/label.model.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Gmail Service for handling Gmail API operations
 */
class GmailService {
  /**
   * Get authenticated Gmail client for user
   */
  async getGmailClient(userId) {
    const user = await UserModel.findUserById(userId);
    
    if (!user) {
      console.error(`❌ User ${userId} not found in database`);
      throw new AppError('User not found', 404);
    }
    
    if (!user.access_token || !user.refresh_token) {
      console.error(`❌ User ${userId} missing OAuth tokens:`, {
        hasAccessToken: !!user.access_token,
        hasRefreshToken: !!user.refresh_token
      });
      throw new AppError('User not authenticated with Gmail', 401);
    }

    try {
      // Check if token is expired (if token_expires_at exists)
      if (user.token_expires_at) {
        const expiresAt = new Date(user.token_expires_at);
        const now = new Date();
        
        // Refresh if expired or expiring in next 5 minutes
        if (expiresAt <= new Date(now.getTime() + 5 * 60 * 1000)) {
          console.log(`🔄 Token expired/expiring for user ${userId}, refreshing...`);
          
          try {
            const newTokens = await gmailConfig.refreshAccessToken(user.refresh_token);
            
            // Update tokens in database
            const expiresAt = newTokens.expiry_date 
              ? new Date(newTokens.expiry_date) 
              : new Date(Date.now() + 3600 * 1000);
            
            await UserModel.updateUserTokens(
              userId,
              newTokens.access_token,
              newTokens.refresh_token || user.refresh_token,
              expiresAt
            );
            
            console.log(`✅ Tokens refreshed for user ${userId}`);
            
            return gmailConfig.createGmailClient(newTokens.access_token, newTokens.refresh_token || user.refresh_token);
          } catch (refreshError) {
            console.error(`❌ Failed to refresh tokens for user ${userId}:`, refreshError.message);
            throw new AppError('Failed to refresh Gmail authentication. Please login again.', 401);
          }
        }
      }
      
      return gmailConfig.createGmailClient(user.access_token, user.refresh_token);
    } catch (error) {
      console.error('Failed to create Gmail client:', error);
      throw new AppError('Gmail authentication failed', 401);
    }
  }

  /**
   * Fetch user's Gmail messages
   */
  async fetchMessages(userId, options = {}) {
    const gmail = await this.getGmailClient(userId);
    const {
      maxResults = 500,
      labelIds = ['INBOX'],
      q = '', // Search query
      pageToken = null
    } = options;

    try {
      // Get message list
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        labelIds,
        q,
        pageToken
      });

      const messages = response.data.messages || [];
      const nextPageToken = response.data.nextPageToken;

      // Fetch full message details for each message
      const detailedMessages = [];
      
      for (const message of messages) {
        try {
          const messageDetail = await this.getMessageDetails(gmail, message.id);
          if (messageDetail) {
            detailedMessages.push(messageDetail);
          }
        } catch (error) {
          console.warn(`Failed to fetch message ${message.id}:`, error.message);
        }
      }

      return {
        messages: detailedMessages,
        nextPageToken,
        totalCount: response.data.resultSizeEstimate || 0
      };
    } catch (error) {
      console.error('Error fetching Gmail messages:', error);
      throw new AppError('Failed to fetch Gmail messages', 500);
    }
  }

  /**
   * Get detailed message information
   */
  async getMessageDetails(gmail, messageId) {
    try {
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      const headers = this.parseHeaders(message.payload.headers);
      const body = this.parseMessageBody(message.payload);
      const attachments = this.extractAttachments(message.payload);

      return {
        id: message.id,
        threadId: message.threadId,
        labelIds: message.labelIds || [],
        snippet: message.snippet,
        subject: headers.subject || 'No Subject',
        from: headers.from,
        to: headers.to,
        date: headers.date,
        bodyText: body.text,
        bodyHtml: body.html,
        hasAttachments: attachments.length > 0,
        attachments: JSON.stringify(attachments),
        internalDate: new Date(parseInt(message.internalDate))
      };
    } catch (error) {
      console.error(`Error getting message ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Parse message headers
   */
  parseHeaders(headers) {
    const headerMap = {};
    
    headers?.forEach(header => {
      headerMap[header.name.toLowerCase()] = header.value;
    });

    return {
      subject: headerMap.subject,
      from: headerMap.from,
      to: headerMap.to,
      date: headerMap.date ? new Date(headerMap.date) : null,
      messageId: headerMap['message-id']
    };
  }

  /**
   * Parse message body (text and HTML)
   */
  parseMessageBody(payload, body = { text: '', html: '' }) {
    if (payload.body?.data) {
      const content = Buffer.from(payload.body.data, 'base64').toString();
      
      if (payload.mimeType === 'text/plain') {
        body.text += content;
      } else if (payload.mimeType === 'text/html') {
        body.html += content;
      }
    }

    // Recursively parse multipart messages
    if (payload.parts) {
      payload.parts.forEach(part => {
        this.parseMessageBody(part, body);
      });
    }

    return body;
  }

  /**
   * Check if message has attachments
   */
  hasAttachments(payload) {
    if (payload.parts) {
      return payload.parts.some(part => 
        part.filename && part.filename.length > 0
      );
    }
    return false;
  }

  /**
   * Extract attachment details from message payload
   */
  extractAttachments(payload) {
    const attachments = [];
    
    const extractFromPart = (part) => {
      if (part.filename && part.filename.length > 0 && part.body) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size || 0,
          attachmentId: part.body.attachmentId
        });
      }
      
      // Recursively check nested parts
      if (part.parts) {
        part.parts.forEach(extractFromPart);
      }
    };
    
    if (payload.parts) {
      payload.parts.forEach(extractFromPart);
    }
    
    return attachments;
  }

  /**
   * Sync Gmail messages to database
   */
  async syncMessages(userId, options = {}) {
    const {
      maxResults = 500,
      labelIds = ['INBOX']
    } = options;

    try {
      // Fetch messages from Gmail
      const { messages } = await this.fetchMessages(userId, {
        maxResults,
        labelIds
      });

      let syncedCount = 0;
      let skippedCount = 0;

      for (const gmailMessage of messages) {
        try {
          // Check if message already exists
          const existingMessage = await MessageModel.findById(gmailMessage.id);
          
          if (existingMessage) {
            skippedCount++;
            continue;
          }

          // Create message record
          const messageData = {
            id: gmailMessage.id,
            userId,
            threadId: gmailMessage.threadId,
            subject: gmailMessage.subject,
            sender: gmailMessage.from,
            recipient: gmailMessage.to,
            snippet: gmailMessage.snippet,
            bodyText: gmailMessage.bodyText,
            bodyHtml: gmailMessage.bodyHtml,
            receivedDate: gmailMessage.internalDate,
            hasAttachments: gmailMessage.hasAttachments
          };

          await MessageModel.create(messageData);
          
          // Add Gmail labels to message
          await this.syncMessageLabels(userId, gmailMessage.id, gmailMessage.labelIds);
          
          syncedCount++;
        } catch (error) {
          console.error(`Failed to sync message ${gmailMessage.id}:`, error);
        }
      }

      return {
        syncedCount,
        skippedCount,
        totalProcessed: messages.length
      };
    } catch (error) {
      console.error('Message sync failed:', error);
      throw new AppError('Failed to sync Gmail messages', 500);
    }
  }

  /**
   * Sync Gmail labels for a message
   */
  async syncMessageLabels(userId, messageId, labelIds) {
    try {
      for (const labelId of labelIds) {
        // Ensure label exists in database
        let label = await LabelModel.findById(`${userId}_${labelId}`);
        
        if (!label) {
          // Create label if it doesn't exist
          const labelName = this.getLabelDisplayName(labelId);
          
          label = await LabelModel.create({
            id: `${userId}_${labelId}`,
            userId,
            name: labelName,
            type: 'gmail',
            isSystem: this.isSystemLabel(labelId)
          });
        }

        // Add label to message
        await LabelModel.addToMessage(messageId, label.id);
      }
    } catch (error) {
      console.error('Failed to sync message labels:', error);
    }
  }

  /**
   * Get display name for Gmail label
   */
  getLabelDisplayName(labelId) {
    const labelNames = {
      'INBOX': 'Inbox',
      'SENT': 'Sent',
      'DRAFT': 'Drafts',
      'SPAM': 'Spam',
      'TRASH': 'Trash',
      'STARRED': 'Starred',
      'IMPORTANT': 'Important',
      'UNREAD': 'Unread'
    };

    return labelNames[labelId] || labelId;
  }

  /**
   * Check if label is a system label
   */
  isSystemLabel(labelId) {
    const systemLabels = ['INBOX', 'SENT', 'DRAFT', 'SPAM', 'TRASH', 'STARRED', 'IMPORTANT', 'UNREAD'];
    return systemLabels.includes(labelId);
  }

  /**
   * Send email via Gmail API
   */
  async sendEmail(userId, emailData) {
    const gmail = await this.getGmailClient(userId);
    const { to, subject, body, isHtml = false } = emailData;

    try {
      // Create raw email message
      const rawMessage = this.createRawMessage(to, subject, body, isHtml);
      
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMessage
        }
      });

      return {
        messageId: response.data.id,
        threadId: response.data.threadId,
        success: true
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new AppError('Failed to send email', 500);
    }
  }

  /**
   * Create raw email message for sending
   */
  createRawMessage(to, subject, body, isHtml = false) {
    const messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=utf-8`,
      '',
      body
    ];

    const message = messageParts.join('\n');
    return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  }

  /**
   * Mark message as read/unread
   */
  async markAsRead(userId, messageId, isRead = true) {
    const gmail = await this.getGmailClient(userId);

    try {
      const request = {
        userId: 'me',
        id: messageId,
        requestBody: {}
      };

      if (isRead) {
        request.requestBody.removeLabelIds = ['UNREAD'];
      } else {
        request.requestBody.addLabelIds = ['UNREAD'];
      }

      await gmail.users.messages.modify(request);
      
      // Update local database
      await MessageModel.markAsRead(messageId, isRead);
      
      return true;
    } catch (error) {
      console.error('Failed to mark message as read:', error);
      throw new AppError('Failed to update message status', 500);
    }
  }

  /**
   * Add/remove star from message
   */
  async toggleStar(userId, messageId) {
    const gmail = await this.getGmailClient(userId);

    try {
      // Get current message state
      const message = await MessageModel.findById(messageId);
      const isStarred = message?.is_starred;

      const request = {
        userId: 'me',
        id: messageId,
        requestBody: {}
      };

      if (isStarred) {
        request.requestBody.removeLabelIds = ['STARRED'];
      } else {
        request.requestBody.addLabelIds = ['STARRED'];
      }

      await gmail.users.messages.modify(request);
      
      // Update local database
      await MessageModel.toggleStar(messageId);
      
      return !isStarred;
    } catch (error) {
      console.error('Failed to toggle star:', error);
      throw new AppError('Failed to update message star', 500);
    }
  }

  /**
   * Get user's Gmail profile
   */
  async getProfile(userId) {
    const gmail = await this.getGmailClient(userId);

    try {
      const response = await gmail.users.getProfile({ userId: 'me' });
      return response.data;
    } catch (error) {
      console.error('Failed to get Gmail profile:', error);
      throw new AppError('Failed to get Gmail profile', 500);
    }
  }

  /**
   * Create or get SMARTMAIL_DECISION label
   * Creates a Gmail label for decision tracking if it doesn't exist
   * @param {number} userId - User ID
   * @returns {Promise<Object>} - Gmail label object with id and name
   */
  async ensureSmartmailDecisionLabel(userId) {
    const gmail = await this.getGmailClient(userId);
    const labelName = 'SMARTMAIL_DECISION';

    try {
      // First, get all labels to check if it exists
      const labelsResponse = await gmail.users.labels.list({
        userId: 'me'
      });

      const existingLabel = labelsResponse.data.labels?.find(
        label => label.name === labelName
      );

      if (existingLabel) {
        console.log(`✅ Label "${labelName}" already exists:`, existingLabel.id);
        return existingLabel;
      }

      // Label doesn't exist, create it
      console.log(`📝 Creating Gmail label: ${labelName}`);
      
      const createResponse = await gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: labelName,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
          color: {
            backgroundColor: '#4986e7', // Blue
            textColor: '#ffffff'
          }
        }
      });

      const newLabel = createResponse.data;
      console.log(`✅ Created label "${labelName}":`, newLabel.id);

      return newLabel;

    } catch (error) {
      console.error('Failed to create/get SMARTMAIL_DECISION label:', error);
      throw new AppError('Failed to manage Gmail label', 500);
    }
  }

  /**
   * Apply SMARTMAIL_DECISION label to a message
   * @param {number} userId - User ID
   * @param {string} messageId - Gmail message ID
   * @returns {Promise<boolean>} - Success status
   */
  async applyDecisionLabel(userId, messageId) {
    const gmail = await this.getGmailClient(userId);

    try {
      // Ensure label exists
      const label = await this.ensureSmartmailDecisionLabel(userId);

      // Apply label to message
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [label.id]
        }
      });

      console.log(`✅ Applied SMARTMAIL_DECISION label to message: ${messageId}`);
      return true;

    } catch (error) {
      console.error('Failed to apply decision label:', error);
      throw new AppError('Failed to apply label to message', 500);
    }
  }

  /**
   * Remove SMARTMAIL_DECISION label from a message
   * @param {number} userId - User ID
   * @param {string} messageId - Gmail message ID
   * @returns {Promise<boolean>} - Success status
   */
  async removeDecisionLabel(userId, messageId) {
    const gmail = await this.getGmailClient(userId);

    try {
      // Get label ID
      const label = await this.ensureSmartmailDecisionLabel(userId);

      // Remove label from message
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: [label.id]
        }
      });

      console.log(`✅ Removed SMARTMAIL_DECISION label from message: ${messageId}`);
      return true;

    } catch (error) {
      console.error('Failed to remove decision label:', error);
      throw new AppError('Failed to remove label from message', 500);
    }
  }
}

// Export singleton instance
export default new GmailService();