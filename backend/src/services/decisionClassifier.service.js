import aiService from './ai.service.js';
import db from '../config/db.js';

/**
 * 🎯 3-Level Decision Email Classifier
 * 
 * DECISION LEVELS:
 * 
 * 🔴 Level 2 — Hard Decision (confidence ≥ 0.75)
 *    - Explicit choice required (yes/no, approve/reject)
 *    - OR hard deadline with real consequence
 *    - OR personal reply required from a real person
 * 
 * 🟠 Level 1 — Soft Decision (confidence ≥ 0.55)
 *    - RSVP, confirmation, feedback, interest check
 *    - Optional but time-sensitive
 *    - Missing may cause missed opportunity, not failure
 * 
 * ⚫ Level 0 — Not a Decision (confidence < 0.55)
 *    - Informational, newsletters, promotions
 *    - Updates, bulletins, announcements
 *    - Pure FYI or marketing
 * 
 * IMPORTANT: Automated senders CAN be decisions if they require action
 */

// Pure informational patterns (always Level 0)
const PURE_INFORMATIONAL = {
  subjectPatterns: [
    'newsletter', 'bulletin', 'digest', 'weekly update', 'monthly roundup',
    'for your information', 'fyi:', 'just a reminder', 'heads up:',
    'member benefits', 'your benefits', 'new features', 'what\'s new',
    'check out', 'discover', 'explore', 'read more about'
  ],
  pureMarketing: [
    'limited time offer', 'exclusive deal', 'shop now', 'buy now',
    'free shipping', 'sale ends', 'discount code', 'save money'
  ],
  receipts: [
    'order confirmation', 'purchase receipt', 'payment received',
    'transaction complete', 'order receipt', 'invoice'
  ]
};

// Hard decision indicators (Level 2)
const HARD_DECISION_SIGNALS = {
  explicitChoices: [
    'yes or no', 'approve or reject', 'accept or decline',
    'please approve', 'need your approval', 'awaiting your decision',
    'requires your approval', 'pending your approval',
    'choose option', 'select one', 'make a choice'
  ],
  mandatoryActions: [
    'must respond by', 'must submit by', 'required by',
    'urgent action needed', 'immediate response required',
    'action required by', 'deadline:'
  ],
  personalRequests: [
    'can you please reply', 'need your feedback by',
    'what do you think', 'which option do you prefer'
  ]
};

// Soft decision indicators (Level 1)
const SOFT_DECISION_SIGNALS = {
  rsvpConfirmation: [
    'rsvp', 'please confirm', 'confirm your attendance',
    'will you attend', 'are you coming', 'save the date'
  ],
  interestCheck: [
    'interested in', 'would you like', 'are you available',
    'let us know', 'register now', 'sign up'
  ],
  feedback: [
    'share your thoughts', 'tell us what you think',
    'your feedback', 'take our survey', 'rate your experience'
  ],
  timeboxed: [
    'register by', 'sign up before', 'limited spots',
    'ends soon', 'closing soon', 'last chance'
  ]
};

// Question patterns
const QUESTION_INDICATORS = [
  'can you', 'could you', 'would you', 'will you',
  'are you able', 'do you want', 'have you'
];

/**
 * Check if email is pure informational (Level 0)
 */
function isPureInformational(email) {
  const subject = (email.subject || '').toLowerCase();
  const bodyText = (email.body_text || '').toLowerCase();
  const fromEmail = (email.from_email || '').toLowerCase();
  const combinedText = `${subject} ${bodyText.substring(0, 1000)}`;
  
  // Check pure informational patterns
  const hasInfoPattern = PURE_INFORMATIONAL.subjectPatterns.some(pattern =>
    subject.includes(pattern)
  );
  
  if (hasInfoPattern) {
    return { isInfo: true, reason: 'Newsletter/bulletin/update' };
  }
  
  // Check pure marketing
  const isMarketing = PURE_INFORMATIONAL.pureMarketing.some(pattern =>
    combinedText.includes(pattern)
  );
  
  if (isMarketing) {
    return { isInfo: true, reason: 'Pure marketing/promotional' };
  }
  
  // Check receipts/confirmations
  const isReceipt = PURE_INFORMATIONAL.receipts.some(pattern =>
    subject.includes(pattern)
  );
  
  if (isReceipt && !combinedText.includes('action required')) {
    return { isInfo: true, reason: 'Receipt/order confirmation' };
  }
  
  // LinkedIn spam patterns
  if (fromEmail.includes('linkedin.com')) {
    const linkedinSpam = [
      'recently posted', 'reacted to', 'you have', 'new invitation',
      'add', 'follow', 'profile view', 'just posted'
    ];
    const isSpam = linkedinSpam.some(pattern => subject.includes(pattern));
    if (isSpam) {
      return { isInfo: true, reason: 'LinkedIn notification' };
    }
  }
  
  // Very long emails are usually newsletters
  if (bodyText.length > 8000) {
    return { isInfo: true, reason: 'Long-form content (newsletter)' };
  }
  
  return { isInfo: false };
}

/**
 * Extract deadline from email content
 */
function extractDeadline(email) {
  const subject = (email.subject || '').toLowerCase();
  const bodyText = (email.body_text || '').toLowerCase();
  const combinedText = `${subject} ${bodyText.substring(0, 2000)}`;
  
  // Deadline patterns with date extraction
  const deadlinePatterns = [
    /(?:deadline|due|expires?|by|before|until)[\s:]+(?:on\s+)?(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/gi,
    /(?:deadline|due|expires?|by|before|until)[\s:]+(?:on\s+)?(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/gi,
    /(?:respond|reply|register|submit)\s+(?:by|before)\s+(\w+\s+\d{1,2})/gi,
    /(?:today|tomorrow|this week|next week|(\d+)\s+(?:day|hour)s?)/gi
  ];
  
  for (const pattern of deadlinePatterns) {
    const match = pattern.exec(combinedText);
    if (match) {
      const deadlineText = match[1] || match[0];
      // Try to parse relative dates
      if (deadlineText.includes('today')) {
        return { found: true, text: 'today', hoursLeft: 12 };
      }
      if (deadlineText.includes('tomorrow')) {
        return { found: true, text: 'tomorrow', hoursLeft: 36 };
      }
      if (deadlineText.includes('this week')) {
        return { found: true, text: 'this week', hoursLeft: 72 };
      }
      // Found a deadline but can't parse exact time
      return { found: true, text: deadlineText, hoursLeft: null };
    }
  }
  
  return { found: false, text: null, hoursLeft: null };
}

/**
 * Calculate decision level and confidence with deadline awareness
 */
function calculateDecisionLevel(email) {
  const subject = (email.subject || '').toLowerCase();
  const bodyText = (email.body_text || '').toLowerCase();
  const fromEmail = (email.from_email || '').toLowerCase();
  const combinedText = `${subject} ${bodyText}`;
  
  let score = 0.3; // Base score
  let signals = [];
  let level = 0;
  let type = 'none';
  let urgencyLabel = 'optional';
  
  // Extract deadline first
  const deadline = extractDeadline(email);
  
  // Check for HARD decision signals (Level 2)
  const hasExplicitChoice = HARD_DECISION_SIGNALS.explicitChoices.some(phrase =>
    combinedText.includes(phrase)
  );
  
  if (hasExplicitChoice) {
    score += 0.35;
    signals.push('Explicit choice required');
    level = 2;
    type = 'approval_required';
    urgencyLabel = 'decide_now';
  }
  
  const hasMandatoryAction = HARD_DECISION_SIGNALS.mandatoryActions.some(phrase =>
    combinedText.includes(phrase)
  );
  
  if (hasMandatoryAction) {
    score += 0.30;
    signals.push('Mandatory action with deadline');
    level = 2;
    type = 'action_required';
    urgencyLabel = 'decide_now';
  }
  
  // If has deadline, determine urgency
  if (deadline.found) {
    signals.push(`Deadline: ${deadline.text}`);
    
    if (deadline.hoursLeft !== null) {
      if (deadline.hoursLeft <= 48) {
        score += 0.25;
        level = 2;
        urgencyLabel = 'decide_now';
      } else if (deadline.hoursLeft <= 168) { // 7 days
        score += 0.15;
        if (level < 2) level = 1;
        urgencyLabel = 'decide_soon';
      } else {
        score += 0.10;
        if (level < 1) level = 1;
        urgencyLabel = 'expires_soon';
      }
    } else {
      // Unknown deadline - assume medium priority
      score += 0.15;
      if (level < 1) level = 1;
      urgencyLabel = 'decide_soon';
    }
  }
  
  const hasPersonalRequest = HARD_DECISION_SIGNALS.personalRequests.some(phrase =>
    combinedText.includes(phrase)
  );
  
  if (hasPersonalRequest) {
    score += 0.20;
    signals.push('Personal reply requested');
    if (level < 2) level = 1;
    if (type === 'none') type = 'reply_required';
    if (urgencyLabel === 'optional') urgencyLabel = 'decide_soon';
  }
  
  // Check for SOFT decision signals (Level 1)
  const hasRSVP = SOFT_DECISION_SIGNALS.rsvpConfirmation.some(phrase =>
    combinedText.includes(phrase)
  );
  
  if (hasRSVP) {
    score += 0.25;
    signals.push('RSVP/Confirmation requested');
    if (level < 1) level = 1;
    type = 'rsvp_required';
    if (urgencyLabel === 'optional') urgencyLabel = 'decide_soon';
  }
  
  const hasInterestCheck = SOFT_DECISION_SIGNALS.interestCheck.some(phrase =>
    combinedText.includes(phrase)
  );
  
  if (hasInterestCheck) {
    score += 0.15;
    signals.push('Interest check');
    if (level < 1) level = 1;
    if (type === 'none') type = 'interest_check';
    if (urgencyLabel === 'optional') urgencyLabel = 'expires_soon';
  }
  
  const hasFeedbackRequest = SOFT_DECISION_SIGNALS.feedback.some(phrase =>
    combinedText.includes(phrase)
  );
  
  if (hasFeedbackRequest) {
    score += 0.15;
    signals.push('Feedback requested');
    if (level < 1) level = 1;
    if (type === 'none') type = 'feedback_request';
    if (urgencyLabel === 'optional') urgencyLabel = 'optional';
  }
  
  const hasTimebox = SOFT_DECISION_SIGNALS.timeboxed.some(phrase =>
    combinedText.includes(phrase)
  );
  
  if (hasTimebox) {
    score += 0.10;
    signals.push('Time-sensitive opportunity');
    if (level < 1) level = 1;
    if (urgencyLabel === 'optional') urgencyLabel = 'expires_soon';
  }
  
  // Check for questions
  const hasQuestion = QUESTION_INDICATORS.some(phrase =>
    combinedText.includes(phrase)
  ) && combinedText.includes('?');
  
  if (hasQuestion) {
    score += 0.15;
    signals.push('Contains question');
    if (level < 1) level = 1;
    if (type === 'none') type = 'question';
  }
  
  // Boost from real person (not noreply)
  const isRealPerson = !fromEmail.includes('noreply') &&
                       !fromEmail.includes('no-reply') &&
                       !fromEmail.includes('donotreply');
  
  if (isRealPerson && signals.length > 0) {
    score += 0.10;
    signals.push('From real person');
  }
  
  // Automated sender can still be a decision
  // Example: IEEE deadline, TCS HackQuest registration
  const isAutomated = fromEmail.includes('noreply') ||
                      fromEmail.includes('notifications@') ||
                      fromEmail.includes('automated@');
  
  // If automated + has action signals = still valid decision
  // Don't penalize automated senders that require action
  
  // Determine final level based on thresholds (60% minimum per requirements)
  let finalLevel = 0;
  if (score >= 0.75) {
    finalLevel = 2;
  } else if (score >= 0.60) { // Changed from 0.55 to 0.60
    finalLevel = 1;
  } else {
    finalLevel = 0;
  }
  
  // Override level if below confidence threshold
  if (score < 0.60) {
    finalLevel = 0;
    urgencyLabel = 'optional';
  }
  
  return {
    level: finalLevel,
    confidence: score,
    signals,
    type: finalLevel > 0 ? type : 'none',
    urgencyLabel,
    deadline: deadline.found ? deadline.text : null
  };
}

/**
 * Check learned exclusions from user feedback
 */
async function checkLearnedExclusions(email, userId) {
  try {
    const learned = await new Promise((resolve, reject) => {
      const sql = `
        SELECT sender_domain, subject_pattern, comment
        FROM decision_feedback
        WHERE user_id = ? AND feedback_type = 'not_decision'
        ORDER BY created_at DESC
        LIMIT 100
      `;
      
      db.all(sql, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    const fromEmail = (email.from_email || '').toLowerCase();
    const subject = (email.subject || '').toLowerCase();
    
    // Extract domain
    const domain = fromEmail.split('@')[1];
    
    // Check domain match
    const matchesDomain = learned.some(feedback =>
      feedback.sender_domain && domain && domain.includes(feedback.sender_domain)
    );
    
    if (matchesDomain) {
      return {
        excluded: true,
        reason: 'Sender previously marked as "Not a Decision"'
      };
    }
    
    // Check subject pattern
    const subjectWords = subject.split(' ').slice(0, 3).join(' ');
    const matchesSubject = learned.some(feedback =>
      feedback.subject_pattern && subject.includes(feedback.subject_pattern.toLowerCase())
    );
    
    if (matchesSubject) {
      return {
        excluded: true,
        reason: 'Similar subject previously marked as "Not a Decision"'
      };
    }
    
  } catch (err) {
    console.error('[DECISION_CLASSIFIER] Error checking learned exclusions:', err);
  }
  
  return { excluded: false };
}

/**
 * Main classification function with 3-level system
 */
export async function classifyEmail(email, userId = null) {
  console.log(`[DECISION_CLASSIFIER] Classifying email: ${email.gmail_id}`);
  
  // STEP 0: Check learned exclusions first
  if (userId) {
    const learnedCheck = await checkLearnedExclusions(email, userId);
    if (learnedCheck.excluded) {
      console.log(`[DECISION_CLASSIFIER] LEARNED EXCLUSION: ${learnedCheck.reason}`);
      return {
        decision_level: 0,
        decision_type: 'none',
        confidence: 0.0,
        reason: learnedCheck.reason
      };
    }
  }
  
  // STEP 1: Check if pure informational
  const infoCheck = isPureInformational(email);
  if (infoCheck.isInfo) {
    console.log(`[DECISION_CLASSIFIER] Level 0 - ${infoCheck.reason}`);
    return {
      decision_level: 0,
      decision_type: 'none',
      confidence: 0.0,
      reason: infoCheck.reason
    };
  }
  
  // STEP 2: Calculate decision level
  const result = calculateDecisionLevel(email);
  
  const levelEmoji = result.level === 2 ? '🔴' : result.level === 1 ? '🟠' : '⚫';
  console.log(`[DECISION_CLASSIFIER] ${levelEmoji} Level ${result.level} - Score: ${result.confidence.toFixed(2)} - ${result.urgencyLabel}`);
  
  return {
    decision_level: result.level,
    decision_type: result.type,
    confidence: result.confidence,
    reason: result.signals.join('; ') || 'No decision signals detected',
    urgency_label: result.urgencyLabel,
    deadline: result.deadline,
    explanation: generateExplanation(result)
  };
}

/**
 * Generate "Why this is here" explanation
 */
function generateExplanation(result) {
  const bullets = [];
  
  result.signals.forEach(signal => {
    bullets.push(signal);
  });
  
  if (result.confidence >= 0.75) {
    bullets.push('High confidence classification');
  }
  
  if (bullets.length === 0) {
    bullets.push('No explanation available');
  }
  
  return bullets;
}

/**
 * Batch classify emails
 */
export async function batchClassify(emails, userId = null) {
  const results = [];
  
  for (const email of emails) {
    try {
      const classification = await classifyEmail(email, userId);
      results.push({
        email_id: email.id,
        gmail_id: email.gmail_id,
        ...classification
      });
    } catch (error) {
      console.error(`[DECISION_CLASSIFIER] Error classifying ${email.gmail_id}:`, error);
      results.push({
        email_id: email.id,
        gmail_id: email.gmail_id,
        decision_level: 0,
        decision_type: 'none',
        confidence: 0.0,
        reason: 'Classification error'
      });
    }
  }
  
  return results;
}

export default {
  classifyEmail,
  batchClassify
};
