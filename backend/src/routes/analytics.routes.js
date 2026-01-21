import express from 'express';
import * as messageModel from '../models/message.model.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * POST /api/analytics/insights
 * Generate email insights
 */
router.post('/insights', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    if (!userId) {
      console.error('❌ No user ID found in request');
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        message: 'Please log in again'
      });
    }
    
    console.log('📊 Generating insights for user:', userId);
    
    // Fetch user's emails
    const emails = await messageModel.getMessagesByUser(userId);
    
    // Debug: Check email categories
    console.log('📊 Sample email categories:', emails.slice(0, 5).map(e => ({
      subject: e.subject?.substring(0, 30),
      ai_category: e.ai_category,
      category: e.category
    })));
    
    // Generate insights
    const insights = generateInsights(emails);

    res.json({
      success: true,
      data: insights,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate insights',
      message: error.message
    });
  }
});

/**
 * Generate insights from email data
 */
function generateInsights(emails) {
  const total = emails.length;
  const unread = emails.filter(e => e.is_read === 0).length;
  const starred = emails.filter(e => e.is_starred === 1).length;
  
  // Count by label/category with smart categorization
  const labelCounts = {};
  emails.forEach(e => {
    let label = e.ai_category || e.category;
    
    // If no category, try to infer from Gmail labels
    if (!label && e.labels) {
      const gmailLabels = typeof e.labels === 'string' ? e.labels.split(',') : e.labels;
      if (gmailLabels.includes('CATEGORY_PROMOTIONS')) label = 'Promotion';
      else if (gmailLabels.includes('CATEGORY_SOCIAL')) label = 'Social';
      else if (gmailLabels.includes('CATEGORY_UPDATES')) label = 'Updates';
      else if (gmailLabels.includes('CATEGORY_FORUMS')) label = 'Forums';
      else if (gmailLabels.includes('SPAM')) label = 'Spam';
      else if (gmailLabels.includes('IMPORTANT')) label = 'Important';
    }
    
    // If still no category, check sender domain for common patterns
    if (!label && e.from_email) {
      const domain = e.from_email.split('@')[1]?.toLowerCase();
      if (domain?.includes('noreply') || domain?.includes('notification')) label = 'Updates';
      else if (domain?.includes('linkedin') || domain?.includes('facebook') || domain?.includes('twitter')) label = 'Social';
      else if (domain?.includes('promotional') || domain?.includes('marketing')) label = 'Promotion';
    }
    
    // Final fallback
    if (!label) label = 'Personal';
    
    labelCounts[label] = (labelCounts[label] || 0) + 1;
  });
  
  console.log('📊 Label distribution:', labelCounts);
  
  // Top senders
  const senderCounts = {};
  emails.forEach(e => {
    const sender = e.from_name || e.from_email || 'Unknown';
    senderCounts[sender] = (senderCounts[sender] || 0) + 1;
  });
  const topSenders = Object.entries(senderCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sender, count]) => ({ sender, count }));

  // Day distribution (for most active day)
  const dayCounts = {};
  emails.forEach(e => {
    try {
      // Try multiple date fields
      let emailDate;
      if (e.internal_date) {
        // internal_date is milliseconds since epoch
        emailDate = new Date(parseInt(e.internal_date));
      } else if (e.date) {
        emailDate = new Date(e.date);
      } else if (e.created_at) {
        emailDate = new Date(e.created_at);
      } else {
        return; // Skip if no valid date
      }
      
      if (isNaN(emailDate.getTime())) return; // Skip invalid dates
      
      const day = emailDate.toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    } catch (err) {
      // Skip invalid dates
    }
  });
  const mostActiveDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

  // Weekly activity (last 7 days) - show actual distribution by date
  const last7Days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    last7Days.push({
      date: date,
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      count: 0
    });
  }
  
  // Count emails for each of the last 7 days
  emails.forEach(e => {
    try {
      // Try multiple date fields
      let emailDate;
      if (e.internal_date) {
        emailDate = new Date(parseInt(e.internal_date));
      } else if (e.date) {
        emailDate = new Date(e.date);
      } else if (e.created_at) {
        emailDate = new Date(e.created_at);
      } else {
        return;
      }
      
      if (isNaN(emailDate.getTime())) return;
      
      const emailDay = emailDate.toDateString();
      
      last7Days.forEach(day => {
        if (day.date.toDateString() === emailDay) {
          day.count++;
        }
      });
    } catch (err) {
      // Skip invalid dates
    }
  });
  
  const weeklyActivity = last7Days.map(({ day, count }) => ({ day, count }));

  return {
    overview: {
      totalEmails: total,
      unreadEmails: unread,
      starredEmails: starred,
      workEmails: labelCounts['Work'] || 0,
      personalEmails: labelCounts['Personal'] || 0,
      promotionEmails: labelCounts['Promotion'] || 0
    },
    insights: [
      {
        title: "Email Activity Summary",
        description: `You have ${total} total emails with ${unread} unread messages${starred > 0 ? ` and ${starred} starred for quick access` : ''}.`,
        type: "summary"
      },
      {
        title: "Peak Email Day",
        description: `${mostActiveDay} is your most active email day with the highest volume of messages.`,
        type: "trend"
      },
      {
        title: unread > 20 ? "High Unread Count" : "Inbox Status",
        description: unread > 20 
          ? `You have ${unread} unread emails. Consider scheduling time to process your inbox.`
          : `Your inbox is relatively organized with ${unread} unread emails.`,
        type: unread > 20 ? "alert" : "summary"
      }
    ],
    analytics: {
      mostActiveDay,
      averageEmailsPerDay: Math.round(total / 30),
      weeklyActivity,
      topSenders,
      labelDistribution: Object.entries(labelCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({ label, count, percentage: Math.round((count / total) * 100) }))
    },
    recommendations: [
      {
        title: unread > 10 ? "Review Unread Emails" : "Stay Organized",
        suggestion: unread > 10
          ? `You have ${unread} unread emails. Set aside 15-20 minutes to review and organize them.`
          : `Great job! Keep your inbox organized by regularly archiving or deleting old emails.`,
        impact: unread > 20 ? "high" : unread > 10 ? "medium" : "low"
      },
      {
        title: "Optimize Email Management",
        suggestion: `Your top sender is ${topSenders[0]?.sender}. Consider creating filters or labels for frequent senders.`,
        impact: "medium"
      }
    ]
  };
}

export default router;
