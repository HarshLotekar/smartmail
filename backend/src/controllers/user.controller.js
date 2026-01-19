import * as userModel from '../models/user.model.js';
import * as labelModel from '../models/label.model.js';
import * as messageModel from '../models/message.model.js';

/**
 * User Controller
 * Handles user profile management and user-related operations
 */

/**
 * Get user profile information
 * GET /api/user/profile
 */
async function getProfile(req, res) {
  try {
    const userId = req.user.userId;
    const user = await userModel.findUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user statistics
    const messageStats = await messageModel.getMessageStats(userId);
    const labels = await labelModel.getLabelsByUser(userId);

    const profile = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      preferences: JSON.parse(user.preferences || '{}'),
      created_at: user.created_at,
      updated_at: user.updated_at,
      statistics: {
        ...messageStats,
        total_labels: labels.length,
        custom_labels: labels.filter(l => !l.is_system).length
      },
      gmail_connected: !!user.access_token,
      token_valid: userModel.isTokenValid(user)
    };

    res.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('❌ Error getting user profile:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile',
      message: error.message
    });
  }
}

/**
 * Update user preferences
 * PUT /api/user/preferences
 */
async function updatePreferences(req, res) {
  try {
    const userId = req.user.userId;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Valid preferences object is required'
      });
    }

    // Get current preferences
    const user = await userModel.findUserById(userId);
    const currentPreferences = JSON.parse(user.preferences || '{}');

    // Merge preferences
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences,
      updated_at: new Date().toISOString()
    };

    await userModel.updateUserPreferences(userId, updatedPreferences);

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: updatedPreferences
    });

  } catch (error) {
    console.error('❌ Error updating preferences:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
      message: error.message
    });
  }
}

/**
 * Get user labels
 * GET /api/user/labels
 */
async function getLabels(req, res) {
  try {
    const userId = req.user.userId;
    const { includeSystem = true } = req.query;

    const labels = await labelModel.getLabelsByUser(userId, includeSystem === 'true');

    // Get message counts for each label
    const labelsWithCounts = await Promise.all(
      labels.map(async (label) => {
        const messages = await labelModel.getMessagesForLabel(label.id, { limit: 1 });
        return {
          ...label,
          message_count: messages.length
        };
      })
    );

    res.json({
      success: true,
      labels: labelsWithCounts,
      total: labelsWithCounts.length,
      system_labels: labelsWithCounts.filter(l => l.is_system).length,
      custom_labels: labelsWithCounts.filter(l => !l.is_system).length
    });

  } catch (error) {
    console.error('❌ Error getting labels:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get labels',
      message: error.message
    });
  }
}

/**
 * Create a new label
 * POST /api/user/labels
 */
async function createLabel(req, res) {
  try {
    const userId = req.user.userId;
    const { name, color, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Label name is required'
      });
    }

    // Check if label already exists
    const existingLabel = await labelModel.findLabelByName(userId, name.trim());
    if (existingLabel) {
      return res.status(409).json({
        success: false,
        error: 'Label with this name already exists'
      });
    }

    const label = await labelModel.createLabel({
      userId,
      name: name.trim(),
      color: color || '#007bff',
      description: description || null,
      isSystem: false
    });

    res.status(201).json({
      success: true,
      message: 'Label created successfully',
      label
    });

  } catch (error) {
    console.error('❌ Error creating label:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create label',
      message: error.message
    });
  }
}

/**
 * Update a label
 * PUT /api/user/labels/:labelId
 */
async function updateLabel(req, res) {
  try {
    const userId = req.user.userId;
    const { labelId } = req.params;
    const { name, color, description } = req.body;

    // Get existing label
    const existingLabel = await labelModel.findLabelById(labelId);
    if (!existingLabel) {
      return res.status(404).json({
        success: false,
        error: 'Label not found'
      });
    }

    // Verify label belongs to user
    if (existingLabel.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Prevent updating system labels
    if (existingLabel.is_system) {
      return res.status(403).json({
        success: false,
        error: 'Cannot modify system labels'
      });
    }

    // Validate name if provided
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid label name is required'
        });
      }

      // Check for duplicate names (excluding current label)
      const duplicateLabel = await labelModel.findLabelByName(userId, name.trim());
      if (duplicateLabel && duplicateLabel.id !== parseInt(labelId)) {
        return res.status(409).json({
          success: false,
          error: 'Label with this name already exists'
        });
      }
    }

    const updateData = {
      name: name?.trim() || existingLabel.name,
      color: color || existingLabel.color,
      description: description !== undefined ? description : existingLabel.description
    };

    await labelModel.updateLabel(labelId, updateData);

    res.json({
      success: true,
      message: 'Label updated successfully',
      label: {
        ...existingLabel,
        ...updateData
      }
    });

  } catch (error) {
    console.error('❌ Error updating label:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update label',
      message: error.message
    });
  }
}

/**
 * Delete a label
 * DELETE /api/user/labels/:labelId
 */
async function deleteLabel(req, res) {
  try {
    const userId = req.user.userId;
    const { labelId } = req.params;

    // Get existing label
    const existingLabel = await labelModel.findLabelById(labelId);
    if (!existingLabel) {
      return res.status(404).json({
        success: false,
        error: 'Label not found'
      });
    }

    // Verify label belongs to user
    if (existingLabel.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Prevent deleting system labels
    if (existingLabel.is_system) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete system labels'
      });
    }

    await labelModel.deleteLabel(labelId);

    res.json({
      success: true,
      message: 'Label deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting label:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete label',
      message: error.message
    });
  }
}

/**
 * Search labels by name
 * GET /api/user/labels/search
 */
async function searchLabels(req, res) {
  try {
    const userId = req.user.userId;
    const { q: query } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const labels = await labelModel.searchLabels(userId, query.trim());

    res.json({
      success: true,
      labels,
      query: query.trim(),
      total: labels.length
    });

  } catch (error) {
    console.error('❌ Error searching labels:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search labels',
      message: error.message
    });
  }
}

/**
 * Get label statistics and insights
 * GET /api/user/labels/stats
 */
async function getLabelStats(req, res) {
  try {
    const userId = req.user.userId;

    const labels = await labelModel.getLabelsByUser(userId);
    const messageStats = await messageModel.getMessageStats(userId);

    // Calculate label usage statistics
    const labelStats = await Promise.all(
      labels.map(async (label) => {
        const messages = await labelModel.getMessagesForLabel(label.id);
        return {
          id: label.id,
          name: label.name,
          color: label.color,
          is_system: label.is_system,
          message_count: messages.length,
          usage_percentage: messageStats.total_messages > 0 ? 
                           Math.round((messages.length / messageStats.total_messages) * 100) : 0
        };
      })
    );

    // Sort by usage
    labelStats.sort((a, b) => b.message_count - a.message_count);

    const overview = {
      total_labels: labels.length,
      system_labels: labels.filter(l => l.is_system).length,
      custom_labels: labels.filter(l => !l.is_system).length,
      most_used_label: labelStats[0] || null,
      least_used_label: labelStats[labelStats.length - 1] || null,
      total_messages: messageStats.total_messages,
      labeled_messages: labelStats.reduce((sum, label) => sum + label.message_count, 0)
    };

    res.json({
      success: true,
      overview,
      labelStats,
      message_stats: messageStats
    });

  } catch (error) {
    console.error('❌ Error getting label stats:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get label statistics',
      message: error.message
    });
  }
}

/**
 * Initialize default labels for new user
 * POST /api/user/labels/initialize
 */
async function initializeLabels(req, res) {
  try {
    const userId = req.user.userId;

    // Check if user already has labels
    const existingLabels = await labelModel.getLabelsByUser(userId);
    if (existingLabels.length > 0) {
      return res.json({
        success: true,
        message: 'Labels already initialized',
        labels: existingLabels
      });
    }

    // Create system labels
    const systemLabels = await labelModel.createSystemLabels(userId);

    res.json({
      success: true,
      message: 'Default labels initialized successfully',
      labels: systemLabels,
      count: systemLabels.length
    });

  } catch (error) {
    console.error('❌ Error initializing labels:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize labels',
      message: error.message
    });
  }
}

/**
 * Get user dashboard data
 * GET /api/user/dashboard
 */
async function getDashboard(req, res) {
  try {
    const userId = req.user.userId;

    // Get user data
    const user = await userModel.findUserById(userId);
    const messageStats = await messageModel.getMessageStats(userId);
    const recentMessages = await messageModel.getMessagesByUser(userId, { 
      limit: 10, 
      sortBy: 'date', 
      sortOrder: 'DESC' 
    });

    // Get label information
    const labels = await labelModel.getLabelsByUser(userId);
    const labelStats = await Promise.all(
      labels.slice(0, 5).map(async (label) => {
        const messages = await labelModel.getMessagesForLabel(label.id, { limit: 1 });
        return {
          ...label,
          message_count: messages.length
        };
      })
    );

    const dashboard = {
      user: {
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        gmail_connected: !!user.access_token,
        member_since: user.created_at
      },
      email_stats: messageStats,
      recent_messages: recentMessages.map(msg => ({
        id: msg.id,
        subject: msg.subject,
        from_email: msg.from_email,
        from_name: msg.from_name,
        date: msg.date,
        is_read: msg.is_read,
        ai_category: msg.ai_category,
        snippet: msg.snippet
      })),
      label_overview: {
        total_labels: labels.length,
        top_labels: labelStats.sort((a, b) => b.message_count - a.message_count).slice(0, 5)
      },
      ai_insights: {
        processed_messages: messageStats.ai_processed_messages || 0,
        processing_rate: messageStats.total_messages > 0 ? 
                        Math.round(((messageStats.ai_processed_messages || 0) / messageStats.total_messages) * 100) : 0
      }
    };

    res.json({
      success: true,
      dashboard
    });

  } catch (error) {
    console.error('❌ Error getting dashboard:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard data',
      message: error.message
    });
  }
}

export {
  getProfile,
  updatePreferences,
  getLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  searchLabels,
  getLabelStats,
  initializeLabels,
  getDashboard
};