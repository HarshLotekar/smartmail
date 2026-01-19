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

// Informational/Newsletter patterns (Level 0)
const INFORMATIONAL_PATTERNS = {
  subjectKeywords: [
    'newsletter', 'bulletin', 'digest', 'roundup', 'weekly', 'monthly',
    'for your information', 'fyi', 'heads up', 'check out',
    'discover', 'explore', 'read more', 'learn about'
  ],
  pureMarketing: [
    'sale', 'discount', 'offer', 'limited time', 'exclusive deal',
    'free shipping', 'buy now', 'shop now', 'get yours'
  ]
};

// Hard decision indicators (Level 2)
const HARD_DECISION_PHRASES = [
  'please approve', 'need your approval', 'awaiting your decision',
  'yes or no', 'approve or reject', 'accept or decline',
  'must respond by', 'required by', 'deadline', 'urgent decision',
  'choose option', 'make a choice', 'decide between'
];

// Soft decision indicators (Level 1)
const SOFT_DECISION_PHRASES = [
  'rsvp', 'please confirm', 'can you attend', 'are you available',
  'interested in', 'would you like', 'let us know', 'register',
  'sign up', 'join us', 'feedback requested', 'share your thoughts'
];

// Question patterns (can be Level 1 or 2 depending on urgency)
const QUESTION_PATTERNS = [
  'can you', 'could you', 'would you', 'will you',
  'are you able', 'do you want', 'what do you think'
];

// Deadline patterns with consequences
const DEADLINE_PATTERNS = [
  /must\s+(submit|respond|reply|approve|confirm)\s+by/i,
  /required\s+by\s+\w+\s+\d{1,2}/i,
  /deadline.*(?:today|tomorrow|this week)/i,
  /respond\s+by\s+\w+\s+\d{1,2}/i
];

/**
 * Load learned exclusions from database
 */
async function getLearnedExclusions(userId) {
  return new Promise((resolve) => {
    const sql = `
      SELECT DISTINCT 
        sender_domain,
        subject_pattern
        comment
      FROM decision_feedback
      WHERE user_id = ? AND feedback_type = 'not_decision'
      LIMIT 100
    `;
    
    db.all(sql, [userId], (err, rows) => {
      if (err || !rows) {
        resolve([]);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * STEP 1: Check if email should be hard excluded (ULTRA STRICT)
 */
function isHardExcluded(email) {
  const subject = (email.subject || '').toLowerCase();
  const fromEmail = (email.from_email || '').toLowerCase();
  const bodyText = (email.body_text || '').toLowerCase();
  const combinedText = `${subject} ${bodyText}`;
  
  // 1. Automated sender domains (ALWAYS EXCLUDE)
  const isAutomated = EXCLUSION_PATTERNS.senderDomains.some(pattern => 
    fromEmail.includes(pattern)
  );
  
  if (isAutomated) {
    return {
      excluded: true,
      reason: 'Automated bulk email system'
    };
  }
  
  // 2. Known automated platforms (ALWAYS EXCLUDE)
  const isAutomatedPlatform = EXCLUSION_PATTERNS.automatedSenders.some(domain =>
    fromEmail.includes(domain)
  );
  
  if (isAutomatedPlatform) {
    return {
      excluded: true,
      reason: 'Platform-generated notification'
    };
  }
  
  // 3. Newsletter/bulletin subject patterns
  const isNewsletter = EXCLUSION_PATTERNS.subjectPrefixes.some(prefix =>
    subject.includes(prefix.toLowerCase())
  );
  
  if (isNewsletter) {
    return {
      excluded: true,
      reason: 'Newsletter/bulletin/announcement'
    };
  }
  
  // 4. FYI-only emails (informational, can be ignored)
  const isFYI = EXCLUSION_PATTERNS.fyi_phrases.some(phrase =>
    combinedText.includes(phrase.toLowerCase())
  );
  
  if (isFYI) {
    return {
      excluded: true,
      reason: 'Informational only (FYI)'
    };
  }
  
  // 5. Very long emails are usually newsletters/updates
  if (bodyText.length > 8000) {
    return {
      excluded: true,
      reason: 'Long-form content (likely newsletter)'
    };
  }
  
  // 6. Optional action phrases (read later, explore, check out)
  const optionalPhrases = ['read later', 'explore', 'check out', 'discover', 
                           'you might like', 'you may enjoy', 'learn more'];
  const isOptional = optionalPhrases.some(phrase => 
    combinedText.includes(phrase)
  );
  
  if (isOptional && !EXPLICIT_CHOICE_PHRASES.some(p => combinedText.includes(p))) {
    return {
      excluded: true,
      reason: 'Optional action (no decision required)'
    };
  }
  
  return { excluded: false };
}

/**
 * STEP 2: Decision qualification - ALL CONDITIONS MUST BE TRUE (ULTRA STRICT)
 */
function qualifyDecision(email) {
  const subject = (email.subject || '').toLowerCase();
  const bodyText = (email.body_text || '').toLowerCase();
  const fromEmail = (email.from_email || '').toLowerCase();
  const fromName = (email.from_name || '').toLowerCase();
  const combinedText = `${subject} ${bodyText}`;
  
  let score = 0;
  let type = 'none';
  let reasons = [];
  
  // CONDITION 1: Explicit choice language REQUIRED
  const hasExplicitChoice = EXPLICIT_CHOICE_PHRASES.some(phrase => 
    combinedText.includes(phrase.toLowerCase())
  );
  
  if (!hasExplicitChoice) {
    // No explicit choice = NOT a decision
    return {
      qualified: false,
      score: 0.2,
      qualifications: ['No explicit choice/decision language'],
      type: 'none'
    };
  }
  
  score += 0.4;
  reasons.push('Contains explicit choice language');
  
  // CONDITION 2: Must be from a real person (not automated)
  const hasPersonalSender = !fromEmail.includes('noreply') && 
                           !fromEmail.includes('no-reply') &&
                           !fromEmail.includes('automated') &&
                           !fromEmail.includes('notifications') &&
                           fromEmail.includes('@') &&
                           !fromEmail.endsWith('@linkedin.com') &&
                           !fromEmail.endsWith('@ieee.org');
  
  if (!hasPersonalSender) {
    return {
      qualified: false,
      score: 0.3,
      qualifications: ['Not from a real person'],
      type: 'none'
    };
  }
  
  score += 0.2;
  reasons.push('From real person');
  
  // CONDITION 3: Direct question or mandatory action
  const hasMandatoryAction = MANDATORY_ACTION_VERBS.some(verb =>
    combinedText.includes(verb.toLowerCase())
  );
  
  const hasDirectQuestion = DIRECT_QUESTION_PHRASES.some(phrase =>
    combinedText.includes(phrase.toLowerCase())
  );
  
  if (!hasMandatoryAction && !hasDirectQuestion) {
    return {
      qualified: false,
      score: 0.4,
      qualifications: ['No mandatory action or direct question'],
      type: 'none'
    };
  }
  
  if (hasMandatoryAction) {
    score += 0.3;
    reasons.push('Mandatory action required');
    type = 'action_required';
  }
  
  if (hasDirectQuestion) {
    score += 0.2;
    reasons.push('Direct question asked');
    if (type === 'none') type = 'reply_required';
  }
  
  // CONDITION 4: Consequences of ignoring (optional but boosts score)
  const hasConsequence = DEADLINE_WITH_CONSEQUENCE_PATTERNS.some(pattern =>
    pattern.test(combinedText)
  );
  
  if (hasConsequence) {
    score += 0.2;
    reasons.push('Hard deadline with consequences');
    type = 'time_sensitive';
  }
  
  // Email must be reasonably short (not a long article)
  if (bodyText.length > 5000) {
    score -= 0.3;
  }
  
  return {
    qualified: score >= 0.7,
    score: Math.min(score, 1.0),
    qualifications: reasons,
    type
  };
}

/**
 * STEP 4: Calculate confidence and apply STRICT threshold (0.85)
 */
function calculateConfidence(score, qualifications, email) {
  let confidence = score;
  
  // Only boost if we have ALL indicators
  if (qualifications.length >= 3) {
    confidence += 0.1;
  }
  
  // Penalty for automated indicators
  const fromEmail = (email.from_email || '').toLowerCase();
  const subject = (email.subject || '').toLowerCase();
  
  // Heavy penalty for any automation hints
  if (fromEmail.includes('notification') || 
      fromEmail.includes('alert') ||
      subject.includes('automatic') ||
      subject.includes('automated')) {
    confidence -= 0.3;
  }
  
  // Penalty for bulk email indicators
  if (subject.includes('unsubscribe') || 
      (email.body_text || '').toLowerCase().includes('unsubscribe')) {
    confidence -= 0.4;
  }
  
  // Penalty for promotional language
  const promoWords = ['offer', 'deal', 'discount', 'sale', 'free', 'limited time'];
  const hasPromo = promoWords.some(word => 
    subject.includes(word) || (email.body_text || '').toLowerCase().includes(word)
  );
  
  if (hasPromo) {
    confidence -= 0.3;
  }
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Check if email matches learned "Not a Decision" patterns
 */
async function checkLearnedExclusions(email, userId) {
  if (!userId) return { excluded: false };
  
  const fromEmail = (email.from_email || '').toLowerCase();
  const senderDomain = fromEmail.includes('@') 
    ? fromEmail.split('@')[1]
    : null;
  
  const subject = (email.subject || '').toLowerCase();
  const subjectStart = subject.split(/\s+/).slice(0, 3).join(' ');
  
  try {
    const learned = await getLearnedExclusions(userId);
    
    // Check if this sender domain was previously marked "Not a Decision"
    const matchesSender = learned.some(feedback => {
      const comment = (feedback.comment || '').toLowerCase();
      return senderDomain && comment.includes(senderDomain);
    });
    
    if (matchesSender) {
      return {
        excluded: true,
        reason: 'Previously marked as "Not a Decision" by user'
      };
    }
    
    // Check if similar subject pattern was marked
    const matchesSubject = learned.some(feedback => {
      const pattern = (feedback.comment || '').toLowerCase();
      return subjectStart && pattern.includes(subjectStart);
    });
    
    if (matchesSubject) {
      return {
        excluded: true,
        reason: 'Similar email previously marked as "Not a Decision"'
      };
    }
    
  } catch (err) {
    console.error('[DECISION_CLASSIFIER] Error checking learned exclusions:', err);
  }
  
  return { excluded: false };
}

/**
 * Main classification function with ultra-strict rules
 */
export async function classifyEmail(email, userId = null) {
  console.log(`[DECISION_CLASSIFIER] Classifying email: ${email.gmail_id}`);
  
  // STEP 0: Check learned exclusions first
  if (userId) {
    const learnedCheck = await checkLearnedExclusions(email, userId);
    if (learnedCheck.excluded) {
      console.log(`[DECISION_CLASSIFIER] LEARNED EXCLUSION: ${learnedCheck.reason}`);
      return {
        decision_required: false,
        decision_score: 0.0,
        decision_reason: learnedCheck.reason,
        decision_type: 'none',
        classification_method: 'learned'
      };
    }
  }
  
  // STEP 1: Hard exclusions
  const exclusionCheck = isHardExcluded(email);
  if (exclusionCheck.excluded) {
    console.log(`[DECISION_CLASSIFIER] EXCLUDED: ${exclusionCheck.reason}`);
    return {
      decision_required: false,
      decision_score: 0.0,
      decision_reason: exclusionCheck.reason,
      decision_type: 'none',
      classification_method: 'excluded'
    };
  }
  
  // STEP 2: Decision qualification
  const qualification = qualifyDecision(email);
  
  if (!qualification.qualified) {
    console.log(`[DECISION_CLASSIFIER] Not qualified - Score: ${qualification.score}`);
    return {
      decision_required: false,
      decision_score: qualification.score,
      decision_reason: qualification.qualifications[0] || 'No actionable content detected',
      decision_type: 'none',
      classification_method: 'rule-based'
    };
  }
  
  // STEP 4: Calculate confidence
  const confidence = calculateConfidence(qualification.score, qualification.qualifications, email);
  
  // STEP 4: Apply STRICT threshold (0.85) - NO EXCEPTIONS
  const DECISION_THRESHOLD = 0.85;
  const decisionRequired = confidence >= DECISION_THRESHOLD;
  
  if (!decisionRequired) {
    console.log(`[DECISION_CLASSIFIER] Below threshold - Score: ${confidence.toFixed(2)} < ${DECISION_THRESHOLD}`);
    return {
      decision_required: false,
      decision_score: confidence,
      decision_reason: `Confidence too low (${confidence.toFixed(2)})`,
      decision_type: 'none',
      classification_method: 'rule-based'
    };
  }
  
  // Generate factual reason (max 3 bullets)
  const reason = qualification.qualifications.slice(0, 3).join('; ');
  
  console.log(`[DECISION_CLASSIFIER] ✅ QUALIFIED - Score: ${confidence.toFixed(2)}, Type: ${qualification.type}`);
  
  return {
    decision_required: true,
    decision_score: confidence,
    decision_reason: reason,
    decision_type: qualification.type,
    classification_method: 'rule-based'
  };
}

/**
 * Batch classify multiple emails
 */
export async function classifyEmails(emails, userId = null) {
  const results = [];
  
  for (const email of emails) {
    try {
      const result = await classifyEmail(email, userId);
      results.push({
        gmail_id: email.gmail_id,
        ...result
      });
    } catch (error) {
      console.error(`[DECISION_CLASSIFIER] Error classifying ${email.gmail_id}:`, error);
      results.push({
        gmail_id: email.gmail_id,
        decision_required: false,
        decision_score: 0,
        decision_reason: 'Classification error',
        decision_type: 'none',
        classification_method: 'error'
      });
    }
  }
  
  return results;
}

export default {
  classifyEmail,
  classifyEmails
};
