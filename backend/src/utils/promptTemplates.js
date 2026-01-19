/**
 * AI prompt templates for different email operations
 */

/**
 * Email categorization prompt template
 */
export const CATEGORIZATION_PROMPT = `
Analyze this email and categorize it into one of these categories:
- Work: Professional emails, business communications, work-related matters
- Personal: Friends, family, personal communications
- Promotions: Marketing emails, sales offers, discounts, advertisements
- Social: Social media notifications, social events, community updates
- Newsletters: Newsletters, blogs, informational updates
- Urgent: Time-sensitive matters requiring immediate attention
- Finance: Banking, payments, financial statements, bills
- Travel: Travel bookings, confirmations, itineraries

Email Details:
Subject: {subject}
Sender: {sender}
Content Preview: {snippet}

Respond with only the category name (one word).
`;

/**
 * Email summarization prompt template
 */
export const SUMMARIZATION_PROMPT = `
Summarize this email in 1-2 clear, concise sentences. Focus on:
- Main purpose/request
- Key action items
- Important deadlines or dates
- Essential information

Email Content:
{content}

Summary:
`;

/**
 * Sentiment analysis prompt template
 */
export const SENTIMENT_PROMPT = `
Analyze the sentiment/tone of this email. Consider:
- Overall emotional tone
- Urgency level
- Politeness/professionalism
- Any emotional indicators

Respond with one word: positive, negative, or neutral.

Email Content:
{content}

Sentiment:
`;

/**
 * Priority scoring prompt template
 */
export const PRIORITY_PROMPT = `
Rate this email's priority from 0-5 based on:
- Urgency keywords (urgent, ASAP, deadline, emergency)
- Sender importance (boss, client, official institutions)
- Content urgency (meetings, deadlines, problems, opportunities)
- Call-to-action presence
- Time sensitivity

Priority Scale:
- 5: Critical/Emergency (immediate action required)
- 4: High (action needed within hours)
- 3: Medium-High (action needed within a day)
- 2: Medium (action needed within a week)
- 1: Low (informational, can wait)
- 0: Very Low (newsletters, promotions)

Email Details:
Subject: {subject}
Sender: {sender}
Content: {content}

Respond with only a number from 0-5:
`;

/**
 * Email reply generation prompt template
 */
export const REPLY_PROMPT = `
Generate a {tone} email reply to the following email:

{originalEmail}

{context}

Reply Guidelines:
- Keep the response concise and appropriate
- Match the {tone} tone exactly
- Address the main points from the original email
- Include appropriate greeting and closing
- Be helpful and professional

Reply:
`;

/**
 * Meeting extraction prompt template
 */
export const MEETING_EXTRACTION_PROMPT = `
Extract meeting/appointment information from this email:

{content}

Look for:
- Date and time
- Location or meeting link (Zoom, Teams, etc.)
- Meeting purpose/agenda
- Attendees mentioned
- Meeting duration

Respond in JSON format with extracted information, or "null" if no meeting info found:
{
  "date": "extracted date",
  "time": "extracted time", 
  "location": "location or meeting link",
  "purpose": "meeting purpose",
  "attendees": ["list", "of", "attendees"],
  "duration": "duration if mentioned"
}
`;

/**
 * Action item extraction prompt template
 */
export const ACTION_ITEMS_PROMPT = `
Extract action items and tasks from this email:

{content}

Look for:
- Explicit requests ("please do...", "can you...", "need you to...")
- Deadlines and due dates
- Questions that need answers
- Documents or information needed
- Follow-up actions required

Format as a JSON array of action items, or empty array if none found:
[
  {
    "task": "description of task",
    "deadline": "deadline if mentioned",
    "priority": "high/medium/low",
    "assignee": "who should do it"
  }
]
`;

/**
 * Smart folder suggestion prompt template
 */
export const FOLDER_SUGGESTION_PROMPT = `
Based on this email content, suggest the best folder/label for organization:

Subject: {subject}
Sender: {sender}
Content: {snippet}

Available folders:
{availableFolders}

Consider:
- Email content and purpose
- Sender relationship
- Subject matter
- Existing folder structure

Respond with the most appropriate folder name from the available list, or suggest a new folder name if none fit well:
`;

/**
 * Email importance detection prompt template  
 */
export const IMPORTANCE_PROMPT = `
Determine if this email is important based on:
- Sender authority/relationship
- Content urgency
- Business impact
- Time sensitivity
- Keywords indicating importance

Email Details:
Subject: {subject}
Sender: {sender}
Content: {content}

Respond with: important, normal, or low

Importance Level:
`;

/**
 * Spam detection prompt template
 */
export const SPAM_DETECTION_PROMPT = `
Analyze this email for spam characteristics:

Subject: {subject}
Sender: {sender}
Content: {content}

Look for:
- Suspicious sender patterns
- Spam keywords (urgent, winner, free, limited time)
- Poor grammar/spelling
- Suspicious links
- Too-good-to-be-true offers
- Phishing indicators

Respond with: spam, legitimate, or suspicious

Classification:
`;

/**
 * Email thread analysis prompt template
 */
export const THREAD_ANALYSIS_PROMPT = `
Analyze this email thread and provide insights:

{threadContent}

Provide analysis on:
- Thread summary
- Key participants
- Main topics discussed
- Outstanding action items
- Next steps needed
- Thread status (resolved/ongoing/stalled)

Format response as JSON:
{
  "summary": "brief thread summary",
  "participants": ["list", "of", "key", "people"],
  "topics": ["main", "discussion", "topics"],
  "actionItems": ["outstanding", "tasks"],
  "nextSteps": ["recommended", "actions"],
  "status": "resolved/ongoing/stalled"
}
`;

/**
 * Email decision classifier prompt template
 */
export const DECISION_CLASSIFIER_PROMPT = `
You are an email decision classifier for a productivity email app.

Analyze the email and return ONLY valid JSON.

Rules:
- decision_required = true if the email needs a reply, confirmation, action, or has a deadline.
- decision_required = false if it is purely informational, promotional, or a newsletter.

Decision types (choose ONE):
- reply_required
- deadline
- follow_up
- informational_only

Also provide a short human-readable reason (max 12 words).

Email:
Subject: {email_subject}
Body: {email_body}

Output format:
{
  "decision_required": boolean,
  "decision_type": "reply_required | deadline | follow_up | informational_only",
  "reason": "string"
}
`;

/**
 * Template helper functions
 */

/**
 * Format template with variables
 */
export function formatTemplate(template, variables) {
  let formatted = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{${key}}`, 'g');
    formatted = formatted.replace(placeholder, value || '');
  }
  
  return formatted;
}

/**
 * Get categorization prompt
 */
export function getCategorizationPrompt(subject, sender, snippet) {
  return formatTemplate(CATEGORIZATION_PROMPT, { subject, sender, snippet });
}

/**
 * Get summarization prompt
 */
export function getSummarizationPrompt(content) {
  return formatTemplate(SUMMARIZATION_PROMPT, { content });
}

/**
 * Get sentiment analysis prompt
 */
export function getSentimentPrompt(content) {
  return formatTemplate(SENTIMENT_PROMPT, { content });
}

/**
 * Get priority scoring prompt
 */
export function getPriorityPrompt(subject, sender, content) {
  return formatTemplate(PRIORITY_PROMPT, { subject, sender, content });
}

/**
 * Get reply generation prompt
 */
export function getReplyPrompt(originalEmail, tone = 'professional', context = '') {
  return formatTemplate(REPLY_PROMPT, { originalEmail, tone, context });
}

/**
 * Get meeting extraction prompt
 */
export function getMeetingExtractionPrompt(content) {
  return formatTemplate(MEETING_EXTRACTION_PROMPT, { content });
}

/**
 * Get action items prompt
 */
export function getActionItemsPrompt(content) {
  return formatTemplate(ACTION_ITEMS_PROMPT, { content });
}

/**
 * Get folder suggestion prompt
 */
export function getFolderSuggestionPrompt(subject, sender, snippet, availableFolders) {
  const folders = Array.isArray(availableFolders) ? availableFolders.join(', ') : availableFolders;
  return formatTemplate(FOLDER_SUGGESTION_PROMPT, { subject, sender, snippet, availableFolders: folders });
}

/**
 * Get importance detection prompt
 */
export function getImportancePrompt(subject, sender, content) {
  return formatTemplate(IMPORTANCE_PROMPT, { subject, sender, content });
}

/**
 * Get spam detection prompt
 */
export function getSpamDetectionPrompt(subject, sender, content) {
  return formatTemplate(SPAM_DETECTION_PROMPT, { subject, sender, content });
}

/**
 * Get thread analysis prompt
 */
export function getThreadAnalysisPrompt(threadContent) {
  return formatTemplate(THREAD_ANALYSIS_PROMPT, { threadContent });
}

/**
 * Get decision classifier prompt
 */
export function getDecisionClassifierPrompt(emailSubject, emailBody) {
  return formatTemplate(DECISION_CLASSIFIER_PROMPT, { 
    email_subject: emailSubject, 
    email_body: emailBody 
  });
}