# Email Decision Classifier - Quick Start Guide

## What It Does
The Email Decision Classifier uses AI to automatically determine if an email requires your action and categorizes it into one of four types:

1. **Reply Required** 🔵 - Email asks for a response
2. **Deadline** 🔴 - Time-sensitive with a due date  
3. **Follow-Up** 🟡 - Needs action but not urgent
4. **Informational Only** ⚪ - No action needed

## Quick Start

### 1. API Endpoint
```
POST http://localhost:3001/api/ai/classify-decision
```

### 2. Basic Usage (JavaScript)
```javascript
const response = await fetch('http://localhost:3001/api/ai/classify-decision', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${yourToken}`
  },
  body: JSON.stringify({
    subject: "Can you review this?",
    content: "Please review the attached document and let me know your thoughts by Friday."
  })
});

const result = await response.json();
// {
//   "success": true,
//   "decision_required": true,
//   "decision_type": "reply_required",
//   "reason": "Email asks for document review and response"
// }
```

### 3. Using with Message ID
```javascript
const response = await fetch('http://localhost:3001/api/ai/classify-decision', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${yourToken}`
  },
  body: JSON.stringify({
    messageId: "msg_12345"
  })
});
```

### 4. Using React Component
```jsx
import DecisionBadge from '../components/DecisionBadge';

function EmailItem({ email }) {
  return (
    <div className="email-item">
      <h3>{email.subject}</h3>
      <DecisionBadge 
        messageId={email.id} 
        autoFetch={true} 
      />
    </div>
  );
}
```

## Response Format

### Success Response
```json
{
  "success": true,
  "decision_required": true,
  "decision_type": "deadline",
  "reason": "Report submission required by Friday"
}
```

### Error Response
```json
{
  "success": false,
  "decision_required": false,
  "decision_type": "informational_only",
  "reason": "Unable to classify email",
  "error": "AI service unavailable"
}
```

## Decision Types Explained

### reply_required
- Email explicitly asks for response
- Contains questions
- Requests confirmation or approval
- Examples: "Can you confirm?", "Please let me know", "What do you think?"

### deadline
- Contains time-sensitive deadline
- Has explicit due date
- Uses urgency keywords (URGENT, ASAP, deadline)
- Examples: "Due by Friday", "Submit before EOD", "Urgent deadline"

### follow_up
- Needs action but not urgent
- Requests update "when convenient"
- Soft deadlines or timelines
- Examples: "Let me know when you can", "Keep me posted", "Circle back"

### informational_only
- No action required
- Newsletters, promotions, notifications
- Status updates without questions
- Examples: Marketing emails, automated notifications, FYI messages

## Testing

### Run Test Suite
```bash
cd backend
node test-decision-classifier.js
```

### Manual Test with cURL
```bash
curl -X POST http://localhost:3001/api/ai/classify-decision \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Meeting tomorrow",
    "content": "Can you attend the meeting at 2pm tomorrow? Please confirm."
  }'
```

## Configuration

### Environment Variables
```env
# Required: Choose AI provider
AI_MODE=gemini    # or "ollama"

# For Gemini (cloud)
GEMINI_API_KEY=your_key_here

# For Ollama (local)
OLLAMA_MODEL=llama3
OLLAMA_BASE_URL=http://localhost:11434

# Optional
AI_TIMEOUT_MS=30000
```

## Integration Examples

### Filter Action-Required Emails
```javascript
async function getActionRequiredEmails(emails) {
  const classifications = await Promise.all(
    emails.map(email => 
      fetch('/api/ai/classify-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: email.id })
      }).then(r => r.json())
    )
  );
  
  return emails.filter((email, i) => 
    classifications[i].decision_required
  );
}
```

### Priority Sorting
```javascript
const priorityOrder = {
  'deadline': 1,
  'reply_required': 2,
  'follow_up': 3,
  'informational_only': 4
};

emails.sort((a, b) => 
  priorityOrder[a.decision_type] - priorityOrder[b.decision_type]
);
```

### Smart Notifications
```javascript
async function notifyIfActionRequired(email) {
  const result = await classifyEmail(email);
  
  if (result.decision_required && 
     (result.decision_type === 'deadline' || 
      result.decision_type === 'reply_required')) {
    // Send notification
    showNotification({
      title: `Action Required: ${email.subject}`,
      body: result.reason,
      urgency: result.decision_type === 'deadline' ? 'high' : 'normal'
    });
  }
}
```

## Tips

1. **Cache Results**: Store classification in database to avoid repeated AI calls
2. **Batch Processing**: Classify multiple emails during sync
3. **User Feedback**: Let users correct misclassifications to improve accuracy
4. **Error Handling**: Always handle fallback cases gracefully
5. **Performance**: Consider classifying only recent unread emails

## Troubleshooting

### AI Service Not Responding
- Check if Ollama is running: `curl http://localhost:11434/api/version`
- Verify Gemini API key is valid
- Check backend logs for errors

### Wrong Classifications
- Ensure email content is properly extracted (not HTML-heavy)
- Verify prompt template is clear and specific
- Consider providing more context in email body

### Slow Performance
- Reduce AI_TIMEOUT_MS for faster failures
- Implement caching layer
- Use background processing for bulk classification

## Support
For issues or questions, see [EMAIL_DECISION_CLASSIFICATION.md](./EMAIL_DECISION_CLASSIFICATION.md) for full documentation.
