# EmailContent Action Handlers - Implementation Guide

## Overview
This document describes the action handlers wired into the EmailContent component in MessageView.jsx and what needs to be implemented.

## Current Status

### ✅ Fully Implemented

#### 1. **onReply**
```javascript
onReply={() => {
  setShowManualReply(true);
  setSelectedReply('');
  // Scroll to reply box
  setTimeout(() => {
    const replyBox = document.querySelector('textarea');
    if (replyBox) replyBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
}}
```
- **Status**: ✅ Working
- **Behavior**: Opens the manual reply composer and scrolls to it
- **UI**: Smart Reply Suggestions section below email

#### 2. **onArchive**
```javascript
onArchive={handleArchive}

const handleArchive = async () => {
  if (!email) return
  try {
    const next = !email.is_archived
    setEmail(prev => ({ ...prev, is_archived: next }))
    await mailAPI.archiveEmail(id, next)
  } catch (error) {
    console.error('Archive toggle failed:', error)
    setEmail(prev => ({ ...prev, is_archived: !prev.is_archived }))
  }
}
```
- **Status**: ✅ Working
- **Backend Endpoint**: `PUT /api/mail/:id/archive`
- **Behavior**: Toggles archive status, optimistic UI update with rollback on error

#### 3. **onDelete**
```javascript
onDelete={handleDelete}

const handleDelete = async () => {
  if (!email) return
  
  if (window.confirm('Are you sure you want to delete this email?')) {
    try {
      await mailAPI.deleteEmail(id)
      navigate('/inbox')
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }
}
```
- **Status**: ✅ Working
- **Backend Endpoint**: `DELETE /api/mail/:id`
- **Behavior**: Confirms with user, deletes email, navigates back to inbox

#### 4. **onMarkUnread**
```javascript
onMarkUnread={async () => {
  try {
    await mailAPI.markAsRead(id, false);
    setEmail(prev => ({ ...prev, is_read: false }));
  } catch (error) {
    console.error('Mark unread failed:', error);
  }
}}
```
- **Status**: ✅ Working
- **Backend Endpoint**: `PUT /api/mail/:id/read`
- **Behavior**: Marks email as unread, updates UI

### ⚠️ Placeholder Implementations

#### 5. **onReplyAll**
```javascript
onReplyAll={() => console.log('Reply all')}
```
- **Status**: ⚠️ Placeholder
- **Current Behavior**: Logs to console
- **Needed**: 
  - Create reply composer that includes all recipients
  - Backend endpoint to send reply to all
  - UI to show all recipients being replied to

**Implementation Steps:**
1. Extract all recipients from email (to, cc, bcc)
2. Create reply composer with all recipients pre-filled
3. Add "Reply All" indicator in composer
4. Backend endpoint: `POST /api/mail/:id/reply-all`

#### 6. **onForward**
```javascript
onForward={() => console.log('Forward')}
```
- **Status**: ⚠️ Placeholder
- **Current Behavior**: Logs to console
- **Needed**:
  - Create forward composer
  - Recipient selector
  - Include original email in forward body
  - Backend endpoint to send forwarded email

**Implementation Steps:**
1. Create forward modal/composer
2. Add recipient input field
3. Include original email content (quoted)
4. Handle attachments (optional re-attach)
5. Backend endpoint: `POST /api/mail/:id/forward`

## Backend API Requirements

### Current Endpoints (Working)
```
✅ PUT  /api/mail/:id/archive    - Toggle archive status
✅ DELETE /api/mail/:id           - Delete email
✅ PUT  /api/mail/:id/read        - Mark as read/unread
```

### Needed Endpoints

#### 1. Reply All
```javascript
POST /api/mail/:id/reply-all
Body: {
  body: string,
  includeOriginal: boolean
}

Response: {
  success: boolean,
  messageId: string
}
```

**Implementation:**
- Get all recipients from original email
- Use Gmail API to send reply to all
- Update thread if needed

#### 2. Forward
```javascript
POST /api/mail/:id/forward
Body: {
  to: string[],
  cc?: string[],
  body: string,
  includeAttachments: boolean
}

Response: {
  success: boolean,
  messageId: string
}
```

**Implementation:**
- Fetch original email
- Format with "Forwarded message" header
- Use Gmail API to send new email
- Optionally include attachments

## Frontend Components Needed

### 1. Reply All Composer
```jsx
// Create: src/components/ReplyAllComposer.jsx

<ReplyAllComposer
  emailId={id}
  recipients={allRecipients}
  subject={`Re: ${email.subject}`}
  onSend={handleSendReplyAll}
  onCancel={() => setShowReplyAll(false)}
/>
```

**Features:**
- Show all recipients (To, Cc)
- Allow editing recipient list
- Include original message (quoted)
- Send button with loading state

### 2. Forward Composer
```jsx
// Create: src/components/ForwardComposer.jsx

<ForwardComposer
  emailId={id}
  originalEmail={email}
  onSend={handleSendForward}
  onCancel={() => setShowForward(false)}
/>
```

**Features:**
- Recipient input (To, Cc)
- Subject line (Fwd: original subject)
- Body editor
- Include attachments checkbox
- Original message (quoted)

## State Management

### Add to MessageView.jsx
```javascript
const [showReplyAll, setShowReplyAll] = useState(false)
const [showForward, setShowForward] = useState(false)
```

### Wire Up Handlers
```javascript
onReplyAll={() => setShowReplyAll(true)}
onForward={() => setShowForward(true)}
```

### Add Composers to JSX
```jsx
{showReplyAll && (
  <ReplyAllComposer
    emailId={id}
    recipients={getAllRecipients(email)}
    subject={`Re: ${email.subject}`}
    onSend={handleSendReplyAll}
    onCancel={() => setShowReplyAll(false)}
  />
)}

{showForward && (
  <ForwardComposer
    emailId={id}
    originalEmail={email}
    onSend={handleSendForward}
    onCancel={() => setShowForward(false)}
  />
)}
```

## Helper Functions

### Extract All Recipients
```javascript
const getAllRecipients = (email) => {
  const recipients = []
  
  // Add sender
  if (email.sender_email) {
    recipients.push({
      name: email.sender_name,
      email: email.sender_email
    })
  }
  
  // Add to addresses
  if (Array.isArray(email.to_addresses)) {
    email.to_addresses.forEach(addr => {
      if (typeof addr === 'string') {
        recipients.push({ email: addr })
      } else if (addr.email) {
        recipients.push(addr)
      }
    })
  }
  
  // Add cc addresses
  if (Array.isArray(email.cc_addresses)) {
    email.cc_addresses.forEach(addr => {
      if (typeof addr === 'string') {
        recipients.push({ email: addr })
      } else if (addr.email) {
        recipients.push(addr)
      }
    })
  }
  
  return recipients
}
```

### Format Original Message
```javascript
const formatOriginalMessage = (email) => {
  const date = new Date(email.date || email.received_at).toLocaleString()
  const from = email.sender_name 
    ? `${email.sender_name} <${email.sender_email}>`
    : email.sender_email
  
  return `

---------- Forwarded message ---------
From: ${from}
Date: ${date}
Subject: ${email.subject}
To: ${email.to_addresses?.join(', ') || ''}

${email.body_text || htmlToText(email.body_html)}
`
}
```

## API Service Updates

### Add to src/services/api.js
```javascript
export const mailAPI = {
  // ... existing methods
  
  replyAll: async (messageId, data) => {
    return api.post(`/mail/${messageId}/reply-all`, data)
  },
  
  forward: async (messageId, data) => {
    return api.post(`/mail/${messageId}/forward`, data)
  }
}
```

## Testing Checklist

### Reply All
- [ ] Opens composer with all recipients
- [ ] Excludes current user from recipients
- [ ] Includes original message
- [ ] Sends successfully
- [ ] Shows success/error feedback
- [ ] Closes composer after send

### Forward
- [ ] Opens composer
- [ ] Allows recipient selection
- [ ] Includes original message
- [ ] Handles attachments
- [ ] Sends successfully
- [ ] Shows success/error feedback
- [ ] Closes composer after send

## Priority Order

1. **High Priority**: Reply All (commonly used)
2. **Medium Priority**: Forward (useful feature)
3. **Low Priority**: Advanced features (schedule send, etc.)

## Estimated Effort

- **Reply All**: 2-3 hours
  - Frontend composer: 1 hour
  - Backend endpoint: 1 hour
  - Testing: 1 hour

- **Forward**: 3-4 hours
  - Frontend composer: 1.5 hours
  - Backend endpoint: 1.5 hours
  - Testing: 1 hour

Total: ~5-7 hours for both features

## Notes

- Consider reusing existing reply composer UI
- Gmail API has built-in threading support
- Test with various email formats (HTML, plain text)
- Handle edge cases (no recipients, missing fields)
- Add keyboard shortcuts (Ctrl+Shift+R for Reply All, Ctrl+Shift+F for Forward)
