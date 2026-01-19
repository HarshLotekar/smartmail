import express from 'express';
import * as messageModel from '../models/message.model.js';
import * as aiConfig from '../config/ai.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * POST /api/recategorize/all
 * Re-categorize all emails for the authenticated user
 */
router.post('/all', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 100 } = req.body; // Process in batches
    
    console.log('🔄 Starting re-categorization for user:', userId);
    
    // Get all emails for the user
    const emails = await messageModel.getMessagesByUser(userId, { limit: 1000 });
    
    if (!emails || emails.length === 0) {
      return res.json({
        success: true,
        message: 'No emails to categorize',
        processed: 0
      });
    }

    let processed = 0;
    let updated = 0;
    let errors = 0;

    // Process emails in batches to avoid overwhelming the AI API
    const batchSize = Math.min(limit, 50);
    
    for (let i = 0; i < Math.min(emails.length, limit); i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} emails)...`);
      
      // Process batch with Promise.all for parallel execution
      const results = await Promise.allSettled(
        batch.map(async (email) => {
          try {
            // Skip if already categorized recently
            if (email.ai_category && email.ai_category !== 'Personal' && email.ai_category !== 'Updates') {
              processed++;
              return { status: 'skipped', id: email.id };
            }

            // Categorize email
            const result = await aiConfig.categorizeEmail({
              subject: email.subject || '',
              body: email.body_text || email.body_html || '',
              from: email.from_email || email.from_name || ''
            });

            if (result.success && result.category) {
              // Update email category in database
              await messageModel.updateMessageCategory(email.id, result.category);
              updated++;
              processed++;
              
              return { 
                status: 'updated', 
                id: email.id, 
                category: result.category,
                confidence: result.confidence 
              };
            } else {
              processed++;
              return { status: 'failed', id: email.id, error: 'No category returned' };
            }
          } catch (error) {
            errors++;
            processed++;
            console.error(`❌ Error categorizing email ${email.id}:`, error.message);
            return { status: 'error', id: email.id, error: error.message };
          }
        })
      );

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < Math.min(emails.length, limit)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Re-categorization complete: ${updated} updated, ${errors} errors`);

    res.json({
      success: true,
      message: 'Re-categorization complete',
      stats: {
        total: emails.length,
        processed,
        updated,
        errors,
        skipped: processed - updated - errors
      }
    });

  } catch (error) {
    console.error('❌ Re-categorization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to re-categorize emails',
      message: error.message
    });
  }
});

/**
 * POST /api/recategorize/single/:id
 * Re-categorize a single email
 */
router.post('/single/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Get the email
    const email = await messageModel.getMessageById(id);
    
    if (!email || email.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }

    // Categorize email
    const result = await aiConfig.categorizeEmail({
      subject: email.subject || '',
      body: email.body_text || email.body_html || '',
      from: email.from_email || email.from_name || ''
    });

    if (result.success && result.category) {
      // Update email category
      await messageModel.updateMessageCategory(id, result.category);
      
      res.json({
        success: true,
        category: result.category,
        confidence: result.confidence,
        reason: result.reason
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to categorize email'
      });
    }

  } catch (error) {
    console.error('❌ Single categorization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to categorize email',
      message: error.message
    });
  }
});

export default router;
