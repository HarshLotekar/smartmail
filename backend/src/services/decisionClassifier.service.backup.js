import aiService from './ai.service.js';
import db from '../config/db.js';

/**
 * ⚠️ ULTRA-STRICT Decision Email Classifier ⚠️
 * 
 * PRIMARY RULE: Most emails are NOT decisions. When in doubt, exclude.
 * 
 * Philosophy:
 * - Better to miss a decision than flood the inbox
 * - Decision Inbox should be a sanctuary for critical choices only
 * - Newsletters, bulletins, FYI emails are NEVER decisions
 * - Confidence threshold: 0.85 (no exceptions)
 * 
 * A TRUE DECISION requires ALL of these:
 * 1. Explicit choice language (yes/no, approve/reject, select option)
 * 2. From a real person (not automated system)
 * 3. Direct question OR mandatory action
 * 4. Ignoring has real consequences
 * 5. Cannot be automated
 */

// STEP 1: Hard exclusion patterns (newsletters, automated, marketing) - EXPANDED
const EXCLUSION_PATTERNS = {
  senderDomains: [
    'noreply@', 'no-reply@', 'donotreply@', 'notifications@',
    'newsletter@', 'news@', 'updates@', 'marketing@',
    'info@', 'hello@', 'support@', 'team@',
    'bounce@', 'mailer@', 'automated@', 'delivery@',
    'digest@', 'bulletin@', 'announce@', 'alert@',
    'benefits@', 'welcome@', 'onboarding@', 'member@',
    'campaigns@', 'events@', 'invitations@', 'promotions@'
  ],
  subjectPrefixes: [
    '[newsletter]', '[bulletin]', '[announcement]', '[digest]',
    'weekly', 'monthly', 'daily', 'roundup', 'update',
    'fyi:', 'for your information', 'heads up',
    'welcome to', 'welcome!', 'getting started', 'your benefits',
    'member benefits', 'new features', 'what\'s new',
    'read later', 'explore', 'check out', 'discover',
    'invitation:', 'you\'re invited', 'join us', 'reminder:',
    'alert:', 'notification:', 'receipt', 'confirmation',
    'order confirmation', 'thank you for', 'thanks for'
  ],
  automatedSenders: [
    'google.com', 'facebook.com', 'twitter.com', 'instagram.com',
    'youtube.com', 'github.com', 'stackoverflow.com',
    'medium.com', 'substack.com', 'mailchimp.com',
    'linkedin.com', 'ieee.org', 'spotify.com', 'amazon.com',
    'kaggle.com', 'googleplay.com', 'microsoft.com'
  ],
  fyi_phrases: [
    'for your information', 'fyi', 'heads up', 'just letting you know',
    'thought you should know', 'wanted to share', 'check this out',
    'you might like', 'you may be interested', 'explore', 'discover',
    'read more', 'learn more', 'see more', 'view more'
  ]
};

// STEP 2: Explicit choice/decision language (VERY STRICT)
const EXPLICIT_CHOICE_PHRASES = [
  'please choose', 'please select', 'make a choice', 'decide whether',
  'yes or no', 'approve or reject', 'accept or decline',
  'do you want', 'would you like', 'will you', 'can you confirm',
  'need your approval', 'awaiting your decision', 'requires your approval',
  'pending your approval', 'needs your confirmation'
];

// Mandatory action verbs (only if explicit choice is also present)
const MANDATORY_ACTION_VERBS = [
  'must submit', 'must approve', 'must confirm', 'must respond',
  'required to', 'need to', 'have to'
];

// Direct questions from real people (not rhetorical)
const DIRECT_QUESTION_PHRASES = [
  'can you please', 'could you please', 'would you please',
  'are you able to', 'are you available on', 'do you approve',
  'what is your decision', 'which option do you prefer',
  'when can you', 'will you be', 'have you decided'
];

// Deadline with consequences (not just "deadline" keyword)
const DEADLINE_WITH_CONSEQUENCE_PATTERNS = [
  /must\s+(submit|respond|reply|approve|confirm)\s+by/i,
  /required\s+by\s+\w+\s+\d{1,2}/i,
  /deadline.*(?:will|shall|must)/i,
  /if\s+not\s+(?:submitted|approved|confirmed)\s+by/i,
  /failure\s+to.*by/i
];

/**
 * Load learned exclusions from database
 */
async function getLearnedExclusions(userId) {
  return new Promise((resolve) => {
    const sql = `
      SELECT DISTINCT 
        original_score,
        original_type,
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
 * STEP 1: Check if email should be hard excluded
 */
function isHardExcluded(email) {
  const subject = (email.subject || '').toLowerCase();
  const fromEmail = (email.from_email || '').toLo (ULTRA STRICT)
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
      excluded: true,ALL CONDITIONS MUST BE TRUE (ULTRA STRICT)
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
    if (type === 'none') type = 'reply_reqSTRICT threshold (0.85)
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
    confidence -= 0.3ength > 0) {
    qualifications.push('Time-sensitive or deadline mentioned');
    score += 0.35;
    type = 'time_sensitive';
  }
  
  // Condition 4: Human sender patterns (career, recruiting)
  const isCareerRelated = fromEmail.includes('careers') || 
                         fromEmail.includes('recruiting') ||
                         fromEmail.includes('hr') ||
                         fromName.toLowerCase().includes('recruiter') ||
                         fromName.toLowerCase().includes('hiring');
  
  const isLinkedIn = fromEmail.includes('linkedin.com');
  
  if ((isCareerRelated || isLinkedIn) && (foundActionVerbs.length > 0 || questionCount > 0)) {
    qualifications.push('Professional networking or career opportunity');
    score += 0.25;
    if (type === 'informational_only') {
      type = 'action_required';
    }
  }
  
  return {
    qualified: qualifications.length > 0,
    score: Math.min(score, 0.95),
    qualifications,
    type
  };
}

/**
 * STEP 4: Calculate confidence and apply threshold
 */
function calculateConfidence(score, qualifications, email) {
  let confidence = score;
  
  // Boost for multiple qualifications
  if (qualifications.length >= 2) {
    confidence += 0.1;
  }
  
  // Boost for human-like sender (not automated)
  const fromEmail = (email.from_email || '').toLowerCase();
  const isHumanLike = !fromEmail.includes('noreply') && 
                      !fromEmail.includes('no-reply') &&
                      !fromEmail.includes('automated');
  
  if (isHumanLike) {
    confidence += 0.05;
  }
  
  // Penalty for very long emails (likely newsletters)
  const bodyLength = (email.body_text || '').length;
  if (bodyLength > 5000) {
    confidence -= 0.15;
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
 * Main classification function with strict rules
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
        decision_tySTRICT threshold (0.85) - NO EXCEPTIONS
  const DECISION_THRESHOLD = 0.8learned'
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
      decision_type: 'informational_only',
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
      decision_reason: 'No actionable content detected',
      decision_type: 'informational_only',
      classification_method: 'rule-based'
    };
  }
  
  // STEP 4: Calculate confidence
  const confidence = calculateConfidence(qualification.score, qualification.qualifications, email);
  
  // STEP 4: Apply threshold (0.75)
  const DECISION_THRESHOLD = 0.75;
  const decisionRequired = confidence >= DECISION_THRESHOLD;
  
  if (!decisionRequired) {
    console.log(`[DECISION_CLASSIFIER] Below threshold - Score: ${confidence.toFixed(2)} < ${DECISION_THRESHOLD}`);
    return {
      decision_required: false,
      decision_score: confidence,
      decision_reason: `Confidence too low (${confidence.toFixed(2)})`,
      decision_type: 'informational_only',
      classification_method: 'rule-based'
    };
  }
  
  // Generate factual reason (max 3 bullets)
  const reason = qualification.qualifications.slice(0, 3).join('; ');
  
  console.log(`[DECISION_CLASSIFIER] QUALIFIED - Score: ${confidence.toFixed(2)}, Type: ${qualification.type}`);
  
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
        decision_type: 'informational_only',
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
