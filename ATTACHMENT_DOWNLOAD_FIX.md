# Attachment Download Fix

## Problem
Attachments were being parsed from Gmail and displayed in the UI, but clicking the download button did nothing. The error "File wasn't available on site" appeared when users tried to download attachments like "Free Preschool Worksheets (1).pdf" (7.7 MB).

## Root Cause
- ✅ Attachments were successfully parsed from Gmail API (filename, size, mimeType, attachmentId)
- ✅ Stored in database as JSON in `attachments` column
- ✅ Displayed in frontend with paperclip icons
- ❌ **Missing**: Backend endpoint to fetch actual attachment data from Gmail
- ❌ Frontend was using placeholder URLs (`#`) instead of API endpoints

## Solution Implemented

### 1. Backend - New Attachment Download Endpoint

**File**: `backend/src/controllers/mail.controller.js`

Added new `downloadAttachment()` function:
```javascript
async function downloadAttachment(req, res) {
  // Extract messageId and attachmentId from URL params
  const { messageId, attachmentId } = req.params;
  
  // Verify message ownership
  const message = await messageModel.findMessageById(messageId);
  if (!message || message.user_id !== userId) {
    return res.status(404).json({ error: 'Message not found' });
  }
  
  // Fetch attachment from Gmail API
  const gmail = await getGmailClient(userId);
  const attachmentData = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId: message.gmail_id,
    id: attachmentId
  });
  
  // Decode base64url data
  const data = attachmentData.data.data
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const buffer = Buffer.from(data, 'base64');
  
  // Get filename from stored attachment info
  const attachments = JSON.parse(message.attachments || '[]');
  const attachmentInfo = attachments.find(a => a.attachmentId === attachmentId);
  
  // Send file with proper headers
  res.setHeader('Content-Type', attachmentInfo.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${attachmentInfo.filename}"`);
  res.send(buffer);
}
```

**Key Features:**
- Uses Gmail's `users.messages.attachments.get` API
- Properly decodes base64url-encoded attachment data
- Sets correct MIME type and filename for browser download
- Includes ownership verification for security

### 2. Backend - Route Registration

**File**: `backend/src/routes/mail.routes.js`

Added route:
```javascript
router.get('/messages/:messageId/attachments/:attachmentId', 
  authenticateToken, 
  downloadAttachment
);
```

**Route Pattern**: `GET /api/mail/messages/:messageId/attachments/:attachmentId`

Example: `/api/mail/messages/123/attachments/ANGjdJ8xYz...`

### 3. Frontend - Updated Attachment URLs

**File**: `frontend/src/components/EmailContent.jsx`

Updated attachment rendering to use proper API URL:
```jsx
{attachments.map((attachment, index) => {
  // Build download URL using messageId and attachmentId
  const downloadUrl = messageId && attachment.attachmentId
    ? `/api/mail/messages/${messageId}/attachments/${attachment.attachmentId}`
    : attachment.url || '#';
  
  return (
    <div>
      <a 
        href={downloadUrl}
        download={attachment.filename || attachment.name}
      >
        <Download className="w-4 h-4" />
      </a>
    </div>
  );
})}
```

**Changes:**
- Added `messageId` prop to EmailContent component
- Dynamically build download URL from messageId + attachmentId
- Support both `filename` and `name` properties
- Fallback to old URL structure for backward compatibility

### 4. Frontend - Pass messageId to EmailContent

**File**: `frontend/src/pages/MessageView.jsx`

Updated EmailContent usage:
```jsx
<EmailContent
  messageId={id}  // Pass message ID
  attachments={parseAttachments(email.attachments).map(att => ({
    filename: att.filename || att.name,
    size: att.size || 0,
    attachmentId: att.attachmentId,  // Include attachmentId
    // ... other properties
  }))}
  // ... other props
/>
```

## Testing

### Test Case: 7.7 MB PDF Attachment
- **Email**: "test mail" from HARSH <lharsh252@gmail.com>
- **Attachment**: "Free Preschool Worksheets (1).pdf" (7.7 MB)
- **Expected Result**: 
  - Click download button
  - Browser initiates download
  - PDF file saves to downloads folder
  - File opens correctly in PDF viewer

### How to Test
1. Start backend: `cd backend && node src/index.js`
2. Start frontend: `cd frontend && npm run dev`
3. Login and navigate to an email with attachments
4. Click the download button next to the attachment
5. Verify file downloads and opens correctly

## Technical Details

### Gmail API Attachment Flow
1. **Parse**: Extract `attachmentId` from message payload during sync
2. **Store**: Save attachmentId in database as part of attachments JSON
3. **Display**: Show attachment info (filename, size) in UI
4. **Download**: Fetch actual file data using attachmentId
5. **Decode**: Convert base64url to binary buffer
6. **Serve**: Send file with proper content-type headers

### Base64url Decoding
Gmail uses base64url encoding (RFC 4648 Section 5):
- Replace `-` with `+`
- Replace `_` with `/`
- Decode using standard base64

### Security Considerations
- ✅ JWT authentication required
- ✅ Message ownership verification (user can only download their attachments)
- ✅ No direct Gmail message ID exposure (use internal message ID)
- ✅ Proper content-type headers prevent XSS

## Files Modified

### Backend
1. `backend/src/controllers/mail.controller.js` - Added `downloadAttachment()` function
2. `backend/src/routes/mail.routes.js` - Added attachment download route

### Frontend
3. `frontend/src/components/EmailContent.jsx` - Updated attachment rendering logic
4. `frontend/src/pages/MessageView.jsx` - Pass messageId and attachmentId to EmailContent

## Status
✅ **COMPLETE** - Attachment download functionality implemented and ready for testing

## Related Features
- ✅ Attachment parsing from Gmail (already working)
- ✅ Database storage of attachment metadata (already working)
- ✅ UI display of attachments (already working)
- ✅ **NEW**: Backend download endpoint
- ✅ **NEW**: Frontend download URL construction

## Next Steps
1. Test with various file types (PDF, images, docs, zip files)
2. Test with large attachments (>10 MB)
3. Test with multiple attachments in one email
4. Add loading indicator during download
5. Add error handling for failed downloads
