import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import { 
  getMessages, 
  syncMessages, 
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
  searchMessages,
  sendMessage,
  replyAllToMessage,
  forwardMessage,
  batchDeleteMessages,
  batchArchiveMessages,
  batchMarkAsRead,
  getPendingDecisions,
  markDecisionAsDone,
  markAsNotDecision,
  ignoreDecision,
  snoozeDecision,
  markDecisionCompleted
} from '../controllers/mail.controller.js';
import {
  getUnsubscribeInfo,
  unsubscribeFromEmail,
  getUnsubscribes
} from '../controllers/unsubscribe.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Mail Routes
 * Base path: /api/mail
 */

// Get emails endpoint - calls real Gmail API
router.get('/', authenticateToken, getMessages);

// Get sent emails from Gmail
router.get('/sent', authenticateToken, getSentEmails);

// Get starred emails from Gmail
router.get('/starred', authenticateToken, getStarredEmails);

// Get trash emails from Gmail
router.get('/trash', authenticateToken, getTrashEmails);

// Get archived emails from Gmail  
router.get('/archive', authenticateToken, getArchivedEmails);

// Sync emails from Gmail (reduced batch)
router.post('/sync', authenticateToken, syncMessages);

// Single message route must be last to avoid conflicts
router.get('/messages/:messageId', authenticateToken, getMessage);

// Download attachment from message
router.get('/messages/:messageId/attachments/:attachmentId', authenticateToken, downloadAttachment);

// Message actions (used by frontend)
router.patch('/messages/:messageId/read', authenticateToken, markAsRead);
router.put('/messages/:messageId/star', authenticateToken, toggleStar);
router.put('/messages/:messageId/archive', authenticateToken, archiveMessage);
router.delete('/messages/:messageId', authenticateToken, deleteMessage);
router.get('/search', authenticateToken, searchMessages);

// Decision inbox
router.get('/decisions/pending', authenticateToken, getPendingDecisions);
router.post('/decisions/:emailId/done', authenticateToken, markDecisionAsDone);
router.post('/decisions/:emailId/completed', authenticateToken, markDecisionCompleted);
router.post('/decisions/:emailId/ignore', authenticateToken, ignoreDecision);
router.post('/decisions/:emailId/snooze', authenticateToken, snoozeDecision);
router.post('/decisions/:emailId/not-decision', authenticateToken, markAsNotDecision);

// Send email (with optional attachments)
router.post('/send', authenticateToken, upload.array('attachments'), sendMessage);

// Reply All to an email
router.post('/messages/:messageId/reply-all', authenticateToken, replyAllToMessage);

// Forward an email
router.post('/messages/:messageId/forward', authenticateToken, forwardMessage);

// Get unsubscribe information
router.get('/messages/:messageId/unsubscribe-info', authenticateToken, getUnsubscribeInfo);

// Unsubscribe from email
router.post('/messages/:messageId/unsubscribe', authenticateToken, unsubscribeFromEmail);

// Get all unsubscribed addresses
router.get('/unsubscribes', authenticateToken, getUnsubscribes);

// Batch operations
router.post('/batch-delete', authenticateToken, batchDeleteMessages);
router.post('/batch-archive', authenticateToken, batchArchiveMessages);
router.post('/batch-read', authenticateToken, batchMarkAsRead);

// Smart Cleanup - get cleanup candidates
router.get('/cleanup-candidates', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const threshold = parseInt(req.query.threshold) || 45; // days
    
    // Import message model
    const messageModel = await import('../models/message.model.js');
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - threshold);
    
    // Get unopened promotional emails older than threshold
    const messages = await messageModel.findMessagesByUser(userId, {
      limit: 1000,
      includeArchived: false
    });
    
    // Filter candidates: unopened, promotional, old
    const candidates = messages.filter(msg => {
      const msgDate = new Date(msg.date);
      const isOld = msgDate < cutoffDate;
      const isUnread = !msg.is_read;
      const isPromotional = msg.ai_category && 
        (msg.ai_category.toLowerCase().includes('promotion') ||
         msg.ai_category.toLowerCase().includes('newsletter') ||
         msg.ai_category.toLowerCase().includes('update') ||
         msg.ai_category.toLowerCase().includes('marketing'));
      const notStarred = !msg.is_starred;
      
      return isOld && isUnread && isPromotional && notStarred;
    });
    
    // Group by sender
    const senderGroups = {};
    candidates.forEach(msg => {
      const email = msg.from_email;
      if (!senderGroups[email]) {
        senderGroups[email] = {
          email,
          name: msg.from_name || email,
          count: 0,
          messageIds: [],
          category: msg.ai_category,
          lastOpened: 'Never'
        };
      }
      senderGroups[email].count++;
      senderGroups[email].messageIds.push(msg.gmail_id);
    });
    
    // Convert to array and calculate last opened
    const groupedCandidates = Object.values(senderGroups).map(group => {
      const oldestMsg = candidates
        .filter(m => m.from_email === group.email)
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      
      if (oldestMsg) {
        const daysAgo = Math.floor((Date.now() - new Date(oldestMsg.date)) / (1000 * 60 * 60 * 24));
        group.lastOpened = `${daysAgo} days ago`;
      }
      
      return group;
    });
    
    // Sort by count (most emails first)
    groupedCandidates.sort((a, b) => b.count - a.count);
    
    res.json({
      success: true,
      candidates: groupedCandidates,
      total: candidates.length
    });
    
  } catch (error) {
    console.error('Error fetching cleanup candidates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cleanup candidates',
      message: error.message
    });
  }
});

// Status endpoint
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Gmail API routes active',
    routes: ['GET /', 'POST /sync', 'GET /:id', 'GET /status']
  });
});

// Get individual message (dynamic route should come last to avoid conflicts)
router.get('/:id', authenticateToken, getMessage);

export default router;