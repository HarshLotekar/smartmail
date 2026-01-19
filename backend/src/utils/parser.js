/**
 * Email parsing utilities
 */

/**
 * Extract email address from string (e.g., "John Doe <john@example.com>" -> "john@example.com")
 */
export function extractEmail(emailString) {
  if (!emailString) return '';
  
  const match = emailString.match(/<(.+?)>/);
  return match ? match[1] : emailString.trim();
}

/**
 * Extract display name from email string (e.g., "John Doe <john@example.com>" -> "John Doe")
 */
export function extractDisplayName(emailString) {
  if (!emailString) return '';
  
  const match = emailString.match(/^(.+?)\s*</);
  return match ? match[1].replace(/['"]/g, '').trim() : extractEmail(emailString);
}

/**
 * Parse multiple email addresses from a string
 */
export function parseEmailList(emailString) {
  if (!emailString) return [];
  
  return emailString
    .split(/[,;]/)
    .map(email => email.trim())
    .filter(email => email.length > 0)
    .map(email => ({
      email: extractEmail(email),
      name: extractDisplayName(email)
    }));
}

/**
 * Clean and format email subject
 */
export function cleanSubject(subject) {
  if (!subject) return 'No Subject';
  
  return subject
    .replace(/^(Re:|Fwd?:|RE:|FWD?:)\s*/gi, '') // Remove reply/forward prefixes
    .trim();
}

/**
 * Convert HTML to plain text
 */
export function htmlToText(html) {
  if (!html) return '';
  
  return html
    .replace(/<style[^>]*>.*?<\/style>/gis, '') // Remove style tags
    .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove script tags
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Extract URLs from text
 */
export function extractUrls(text) {
  if (!text) return [];
  
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
  return text.match(urlRegex) || [];
}

/**
 * Extract phone numbers from text
 */
export function extractPhoneNumbers(text) {
  if (!text) return [];
  
  const phoneRegex = /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
  const matches = [];
  let match;
  
  while ((match = phoneRegex.exec(text)) !== null) {
    matches.push(match[0].trim());
  }
  
  return matches;
}

/**
 * Check if email is likely spam based on simple heuristics
 */
export function isLikelySpam(message) {
  if (!message) return false;
  
  const spamIndicators = [
    // Subject indicators
    /urgent|winner|congratulations|free|limited time|act now/i,
    // Sender indicators
    /noreply|no-reply|donotreply|automated/i,
    // Content indicators (check snippet or body)
    /click here|unsubscribe|viagra|lottery|inheritance|prince/i
  ];
  
  const textToCheck = [
    message.subject || '',
    message.sender || '',
    message.snippet || '',
    message.body_text || ''
  ].join(' ');
  
  return spamIndicators.some(pattern => pattern.test(textToCheck));
}

/**
 * Detect if message is automated (newsletter, notification, etc.)
 */
export function isAutomatedMessage(message) {
  if (!message) return false;
  
  const automatedIndicators = [
    // Sender patterns
    /noreply|no-reply|donotreply|automated|notifications?|alerts?/i,
    // Subject patterns
    /newsletter|digest|summary|notification|alert|reminder/i,
    // Common automated domains
    /@(mailchimp|constantcontact|sendgrid|mailgun|amazonses)/i
  ];
  
  const textToCheck = [
    message.sender || '',
    message.subject || ''
  ].join(' ');
  
  return automatedIndicators.some(pattern => pattern.test(textToCheck));
}

/**
 * Extract meeting information from email content
 */
export function extractMeetingInfo(content) {
  if (!content) return null;
  
  const meetingPatterns = {
    date: /(?:meeting|call|conference).{0,50}(?:on\s+)?(\w+day,?\s+\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i,
    time: /(?:at\s+)?(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/i,
    zoom: /(https?:\/\/[^\s]*zoom[^\s]*)/i,
    teams: /(https?:\/\/[^\s]*teams[^\s]*)/i,
    meet: /(https?:\/\/[^\s]*meet[^\s]*)/i
  };
  
  const extracted = {};
  
  for (const [key, pattern] of Object.entries(meetingPatterns)) {
    const match = content.match(pattern);
    if (match) {
      extracted[key] = match[1] || match[0];
    }
  }
  
  return Object.keys(extracted).length > 0 ? extracted : null;
}

/**
 * Calculate reading time estimate for email content
 */
export function calculateReadingTime(content) {
  if (!content) return 0;
  
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  
  return Math.max(1, minutes); // Minimum 1 minute
}

/**
 * Generate email preview text
 */
export function generatePreview(content, maxLength = 150) {
  if (!content) return '';
  
  const plainText = htmlToText(content);
  
  if (plainText.length <= maxLength) {
    return plainText;
  }
  
  return plainText.substring(0, maxLength).trim() + '...';
}

/**
 * Normalize email address for comparison
 */
export function normalizeEmail(email) {
  if (!email) return '';
  
  return email.toLowerCase().trim();
}

/**
 * Check if email address is valid
 */
export function isValidEmail(email) {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Parse email thread information
 */
export function parseThreadInfo(message) {
  const headers = message.headers || {};
  
  return {
    messageId: headers['message-id'] || message.id,
    inReplyTo: headers['in-reply-to'],
    references: headers.references ? headers.references.split(/\s+/) : [],
    threadId: message.threadId || message.thread_id
  };
}

/**
 * Sanitize HTML content for safe display
 */
export function sanitizeHtml(html) {
  if (!html) return '';
  
  // Basic HTML sanitization - in production, use a proper library like DOMPurify
  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '')
    .replace(/<object[^>]*>.*?<\/object>/gis, '')
    .replace(/<embed[^>]*>/gis, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}