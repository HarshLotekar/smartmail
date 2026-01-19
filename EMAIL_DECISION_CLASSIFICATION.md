# Email Decision Classification Feature

## Overview
The Email Decision Classification feature uses AI to automatically determine if an email requires action, a response, or is purely informational. This helps users quickly identify emails that need their attention.

## Architecture

### Backend Components

#### 1. Prompt Template (`backend/src/utils/promptTemplates.js`)
- **DECISION_CLASSIFIER_PROMPT**: The AI prompt template for email classification
- **getDecisionClassifierPrompt()**: Helper function to format the prompt with email data

#### 2. AI Service (`backend/src/services/ai.service.js`)
- **classifyEmailDecisionService(subject, content)**: Core classification function
  - Supports both Ollama and Gemini AI providers
  - Returns structured JSON with decision classification
  - Includes fallback handling for errors
  - Lower temperature (0.3) for consistent classification

#### 3. Controller (`backend/src/controllers/ai.controller.js`)
- **classifyDecision**: Express controller handling API requests
  - Validates input (subject, content, or messageId)
  - Fetches email from database if messageId provided
  - Calls AI service for classification
  - Returns formatted response with error handling

#### 4. Route (`backend/src/routes/ai.routes.js`)
- **POST /api/ai/classify-decision**: API endpoint for classification requests

### Frontend Component

#### DecisionBadge (`frontend/src/components/DecisionBadge.jsx`)
- React component for displaying email decision classification
- Features:
  - Auto-fetch classification on mount (optional)
  - Manual classification trigger button
  - Loading and error states
  - Color-coded badges based on decision type
  - Icon representation for each decision type
  - Human-readable reason display

## API Specification

### Endpoint
```
POST /api/ai/classify-decision
```

### Request Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body (Option 1: Direct Content)
```json
{
  "subject": "Project deadline update",
  "content": "The project deadline has been moved to next Friday. Please confirm you can meet the new timeline."
}
```

### Request Body (Option 2: Message ID)
```json
{
  "messageId": "msg_12345"
}
```

### Response (Success)
```json
{
  "success": true,
  "decision_required": true,
  "decision_type": "reply_required",
  "reason": "Email asks for confirmation on new deadline"
}
```

### Response (Error)
```json
{
  "success": false,
  "decision_required": false,
  "decision_type": "informational_only",
  "reason": "Unable to classify email",
  "error": "AI service unavailable"
}
```

## Decision Types

### 1. reply_required
- **When**: Email explicitly asks for a response or answer
- **Examples**: 
  - "Can you confirm the meeting time?"
  - "Please let me know your availability"
  - "Do you agree with this approach?"
- **Badge Color**: Blue (bg-blue-100)
- **Icon**: MessageCircle

### 2. deadline
- **When**: Email contains time-sensitive deadline or due date
- **Examples**:
  - "Report due by Friday 5pm"
  - "Submit your response before EOD"
  - "URGENT: Action needed by tomorrow"
- **Badge Color**: Red (bg-red-100)
- **Icon**: AlertCircle

### 3. follow_up
- **When**: Email needs follow-up action but not urgent
- **Examples**:
  - "Let me know when you have time to discuss"
  - "Please review and get back to me when convenient"
  - "Keep me updated on progress"
- **Badge Color**: Yellow (bg-yellow-100)
- **Icon**: Clock

### 4. informational_only
- **When**: No action needed, purely informational, promotional, or newsletter
- **Examples**:
  - Newsletters
  - Marketing emails
  - Status updates with no questions
  - Automated notifications
- **Badge Color**: Gray (bg-gray-100)
- **Icon**: Info

## Usage Examples

### Example 1: Automatic Classification on Email Display
```jsx
import DecisionBadge from '../components/DecisionBadge';

function EmailCard({ email }) {
  return (
    <div className="email-card">
      <h3>{email.subject}</h3>
      <DecisionBadge 
        messageId={email.id}
        autoFetch={true}
      />
      <p>{email.snippet}</p>
    </div>
  );
}
```

### Example 2: Manual Classification Trigger
```jsx
import DecisionBadge from '../components/DecisionBadge';

function EmailDetail({ email }) {
  return (
    <div>
      <h2>{email.subject}</h2>
      <DecisionBadge 
        subject={email.subject}
        content={email.body}
      />
      <div dangerouslySetInnerHTML={{ __html: email.body }} />
    </div>
  );
}
```

### Example 3: Direct API Call
```javascript
async function classifyEmail(emailId) {
  const response = await fetch('http://localhost:3001/api/ai/classify-decision', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('smartmail_token')}`
    },
    body: JSON.stringify({ messageId: emailId })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log(`Decision required: ${result.decision_required}`);
    console.log(`Type: ${result.decision_type}`);
    console.log(`Reason: ${result.reason}`);
  }
}
```

### Example 4: Bulk Classification
```javascript
async function classifyMultipleEmails(emails) {
  const classifications = await Promise.all(
    emails.map(async (email) => {
      const response = await fetch('http://localhost:3001/api/ai/classify-decision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('smartmail_token')}`
        },
        body: JSON.stringify({
          subject: email.subject,
          content: email.body
        })
      });
      return response.json();
    })
  );
  
  // Filter emails requiring action
  const actionRequired = classifications.filter(c => c.decision_required);
  console.log(`${actionRequired.length} emails require action`);
}
```

## AI Provider Configuration

### Using Ollama (Local)
```env
AI_MODE=ollama
OLLAMA_MODEL=llama3
OLLAMA_BASE_URL=http://localhost:11434
AI_TIMEOUT_MS=30000
```

### Using Gemini (Cloud)
```env
AI_MODE=gemini
GEMINI_API_KEY=your_api_key_here
AI_TIMEOUT_MS=30000
```

## Performance Considerations

### Response Time
- **Ollama**: 2-5 seconds (depends on local hardware)
- **Gemini**: 1-3 seconds (depends on network)

### Token Usage
- Average tokens per classification: ~150 tokens
- Input: Subject + first 2000 chars of body
- Output: ~50-100 tokens (structured JSON)

### Caching Strategy
Consider implementing:
1. **Database caching**: Store classification result in messages table
2. **Client-side caching**: Cache results in localStorage for recent emails
3. **Batch processing**: Classify multiple emails in background

## Error Handling

### Fallback Behavior
If AI service fails, the system returns:
```json
{
  "decision_required": false,
  "decision_type": "informational_only",
  "reason": "Classification service unavailable"
}
```

### Common Error Scenarios
1. **AI service unavailable**: Returns fallback classification
2. **Invalid email content**: Returns 400 error
3. **Message not found**: Returns 404 error
4. **Unauthorized access**: Returns 403 error
5. **Malformed AI response**: Returns fallback with logged error

## Future Enhancements

### Potential Improvements
1. **Learning from user feedback**: Track if users agree with classifications
2. **Custom decision types**: Allow users to define their own decision categories
3. **Confidence scoring**: Include confidence level (0-100%) in response
4. **Batch endpoint**: Classify multiple emails in single API call
5. **Webhook support**: Trigger classification on new email arrival
6. **Database integration**: Automatically store classification in messages table
7. **Smart notifications**: Notify users only for decision-required emails

### Database Schema Addition
```sql
ALTER TABLE messages ADD COLUMN decision_required BOOLEAN DEFAULT NULL;
ALTER TABLE messages ADD COLUMN decision_type TEXT DEFAULT NULL;
ALTER TABLE messages ADD COLUMN decision_reason TEXT DEFAULT NULL;
ALTER TABLE messages ADD COLUMN decision_classified_at DATETIME DEFAULT NULL;
```

## Testing

### Manual Testing
1. Start backend: `cd backend && npm start`
2. Test with curl:
```bash
curl -X POST http://localhost:3001/api/ai/classify-decision \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subject": "Project review meeting",
    "content": "Can you join us tomorrow at 2pm for the project review? Please confirm your attendance."
  }'
```

Expected response:
```json
{
  "success": true,
  "decision_required": true,
  "decision_type": "reply_required",
  "reason": "Email asks for attendance confirmation"
}
```

### Test Cases
1. **Reply Required**: Email with question or request for confirmation
2. **Deadline**: Email with explicit deadline or due date
3. **Follow-Up**: Email requesting update when convenient
4. **Informational**: Newsletter, promotional email, status update

## Integration Checklist

- [x] Prompt template created
- [x] AI service function implemented
- [x] Controller function added
- [x] API route registered
- [x] Frontend component created
- [x] Documentation written
- [ ] Database schema updated (optional)
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Performance monitoring added
- [ ] User feedback mechanism added

## Support

For questions or issues with email decision classification:
1. Check AI service logs: `backend/logs/`
2. Verify AI provider configuration in `.env`
3. Test AI provider directly (Ollama/Gemini)
4. Review error responses in browser console
5. Check authentication token validity

## Changelog

### Version 1.0.0 (January 14, 2026)
- Initial release
- Support for Ollama and Gemini AI providers
- Four decision types: reply_required, deadline, follow_up, informational_only
- React component with loading and error states
- Comprehensive error handling and fallbacks
