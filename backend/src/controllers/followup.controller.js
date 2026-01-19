import { followUpDB } from '../models/followup.model.js';
import followUpService from '../services/followup.service.js';

/**
 * Follow-up Reminders Controller
 */

/**
 * Detect if an email needs follow-up (AI-powered)
 * POST /api/followups/detect
 */
export async function detectFollowUp(req, res) {
  try {
    const { emailId, subject, body, from, date } = req.body;
    const userId = req.user?.userId || req.user?.id || 1; // Fallback to user 1 for now

    if (!emailId || !body) {
      return res.status(400).json({
        success: false,
        message: 'Email ID and body are required'
      });
    }

    // Analyze email with AI
    const analysis = await followUpService.analyzeForFollowUp({
      subject: subject || '',
      body,
      from: from || 'Unknown',
      date: date || new Date().toISOString()
    });

    if (!analysis.needsFollowUp) {
      return res.json({
        success: true,
        needsFollowUp: false,
        message: 'No follow-up needed',
        analysis
      });
    }

    // Calculate reminder date
    const reminderDate = followUpService.calculateReminderDate(analysis.suggestedDays);

    // Save to database
    const result = await followUpDB.insert({
      user_id: userId,
      email_id: emailId,
      email_subject: subject || '(No Subject)',
      email_from: from || 'Unknown',
      email_snippet: body.substring(0, 200),
      reminder_date: reminderDate,
      reason: analysis.reason,
      urgency: analysis.urgency,
      ai_confidence: analysis.confidence,
      detected_keywords: JSON.stringify(analysis.keywords),
      commitment_type: analysis.commitmentType
    });

    res.json({
      success: true,
      needsFollowUp: true,
      followUp: {
        id: result.id,
        emailId,
        reminderDate,
        reason: analysis.reason,
        urgency: analysis.urgency,
        commitmentType: analysis.commitmentType,
        confidence: analysis.confidence
      }
    });

  } catch (error) {
    console.error('Detect follow-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect follow-up',
      error: error.message
    });
  }
}

/**
 * Get all follow-ups for the authenticated user
 * GET /api/followups
 */
export async function getFollowUps(req, res) {
  try {
    const userId = req.user?.userId || req.user?.id || 1;
    const { status = 'pending' } = req.query;

    console.log('📋 Fetching follow-ups for user:', userId, 'status:', status);

    const followUps = await followUpDB.getAll(userId, status);

    console.log('📋 Found follow-ups:', followUps.length);
    if (followUps.length > 0) {
      console.log('📋 Sample follow-up:', followUps[0]);
    }

    // Parse JSON fields
    const parsedFollowUps = followUps.map(f => ({
      ...f,
      detected_keywords: f.detected_keywords ? JSON.parse(f.detected_keywords) : []
    }));

    res.json({
      success: true,
      count: parsedFollowUps.length,
      followUps: parsedFollowUps
    });

  } catch (error) {
    console.error('Get follow-ups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get follow-ups',
      error: error.message
    });
  }
}

/**
 * Get a single follow-up
 * GET /api/followups/:id
 */
export async function getFollowUp(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id || 1;

    const followUp = await followUpDB.getById(id, userId);

    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up not found'
      });
    }

    // Parse JSON fields
    followUp.detected_keywords = followUp.detected_keywords 
      ? JSON.parse(followUp.detected_keywords) 
      : [];

    res.json({
      success: true,
      followUp
    });

  } catch (error) {
    console.error('Get follow-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get follow-up',
      error: error.message
    });
  }
}

/**
 * Mark follow-up as completed
 * PUT /api/followups/:id/complete
 */
export async function completeFollowUp(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id || 1;

    const result = await followUpDB.updateStatus(id, userId, 'completed', {
      completed_at: new Date().toISOString()
    });

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up not found'
      });
    }

    res.json({
      success: true,
      message: 'Follow-up marked as completed'
    });

  } catch (error) {
    console.error('Complete follow-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete follow-up',
      error: error.message
    });
  }
}

/**
 * Snooze follow-up
 * PUT /api/followups/:id/snooze
 */
export async function snoozeFollowUp(req, res) {
  try {
    const { id } = req.params;
    const { days = 1 } = req.body;
    const userId = req.user?.userId || req.user?.id || 1;

    const snoozeDate = followUpService.calculateReminderDate(days);

    const result = await followUpDB.updateStatus(id, userId, 'snoozed', {
      snoozed_until: snoozeDate,
      reminder_date: snoozeDate
    });

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up not found'
      });
    }

    res.json({
      success: true,
      message: `Follow-up snoozed for ${days} day(s)`,
      snoozedUntil: snoozeDate
    });

  } catch (error) {
    console.error('Snooze follow-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to snooze follow-up',
      error: error.message
    });
  }
}

/**
 * Dismiss follow-up
 * PUT /api/followups/:id/dismiss
 */
export async function dismissFollowUp(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id || 1;

    const result = await followUpDB.updateStatus(id, userId, 'dismissed');

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up not found'
      });
    }

    res.json({
      success: true,
      message: 'Follow-up dismissed'
    });

  } catch (error) {
    console.error('Dismiss follow-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to dismiss follow-up',
      error: error.message
    });
  }
}

/**
 * Delete follow-up
 * DELETE /api/followups/:id
 */
export async function deleteFollowUp(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id || 1;

    const result = await followUpDB.delete(id, userId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up not found'
      });
    }

    res.json({
      success: true,
      message: 'Follow-up deleted'
    });

  } catch (error) {
    console.error('Delete follow-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete follow-up',
      error: error.message
    });
  }
}

/**
 * Get follow-up statistics
 * GET /api/followups/stats
 */
export async function getFollowUpStats(req, res) {
  try {
    const userId = req.user?.userId || req.user?.id || 1;
    const stats = await followUpDB.getStats(userId);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get follow-up stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message
    });
  }
}
