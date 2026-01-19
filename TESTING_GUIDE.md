# Testing the Email Summarization Feature

## Quick Start

### 1. Ensure Gemini API Key is Set
Check your `.env` file in the `backend` folder:
```bash
GEMINI_API_KEY=your_actual_gemini_api_key
```

### 2. Start the Backend Server
```bash
cd backend
npm start
```

### 3. Start the Frontend
```bash
cd frontend
npm run dev
```

### 4. Test the Feature

1. **Login to SmartMail** with your Google account
2. **Sync emails** from Gmail
3. **Open any email** from your inbox
4. **Click "Summarize Email"** button (purple button with brain icon)
5. **Watch the loading state** (spinning icon, "Summarizing...")
6. **View the AI summary** in the purple card below the email body
7. **Close the summary** using the ✕ button

## Test Cases

### Test Case 1: Simple Email
- **Subject**: "Team Meeting Tomorrow"
- **Expected**: Summary with key points (time, location, agenda)

### Test Case 2: HTML-Rich Email
- **Subject**: Promotional email with images/styling
- **Expected**: Clean summary without HTML artifacts

### Test Case 3: Email with Quoted Replies
- **Subject**: "Re: Re: Re: Project Update"
- **Expected**: Summary focuses on latest message, ignores quoted history

### Test Case 4: Email with Signature
- **Subject**: Professional email
- **Expected**: Summary excludes "Sent from iPhone", signature blocks

### Test Case 5: Long Email
- **Subject**: Newsletter or detailed report
- **Expected**: Concise 4-8 sentence summary capturing main points

### Test Case 6: Error Handling
- **Action**: Disable internet or use invalid API key
- **Expected**: Fallback summary or error message, no crash

### Test Case 7: Dark Mode
- **Action**: Toggle dark mode in email view
- **Expected**: Summary card adapts colors properly

## Expected Output Format

The summary should appear in this format:
```
Summary:
• First key point from the email
• Second important detail
• Third main topic or action item
• Fourth relevant point (if applicable)
```

## Debugging

### Backend Logs
Check backend console for:
```
AI Summarization - Gemini model used
Cleaned email text length
Summary generated successfully
```

### Frontend Console
Check browser console for:
```
EmailContent rendering with: { sender, subject, bodyLength }
```

### Common Issues

**Issue**: "Failed to generate summary"
- **Solution**: Check GEMINI_API_KEY in .env
- **Solution**: Ensure backend server is running
- **Solution**: Check browser console for network errors

**Issue**: Summary shows HTML tags
- **Solution**: Verify `cleanEmailText()` is being called
- **Solution**: Check DOMPurify sanitization is working

**Issue**: Summary is too long/short
- **Solution**: Adjust `maxOutputTokens` in generationConfig
- **Solution**: Modify prompt to be more specific

**Issue**: Button doesn't respond
- **Solution**: Check browser console for JavaScript errors
- **Solution**: Verify aiAPI import is correct
- **Solution**: Check network tab for API call

## Manual API Testing

Test the endpoint directly:
```bash
curl -X POST http://localhost:5000/api/ai/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test Email",
    "content": "This is a test email with some content to summarize."
  }'
```

Expected response:
```json
{
  "summary": "Summary:\n• Main point about test email\n• Additional context\n• Key takeaway"
}
```

## Performance Metrics

- **Response Time**: Should be < 3 seconds for most emails
- **Token Usage**: ~150-200 output tokens per summary
- **Preprocessing**: < 100ms for text cleaning
- **UI Rendering**: Smooth, no lag

## Success Criteria

✅ Button appears in email header
✅ Loading spinner shows during processing
✅ Summary appears in purple card
✅ Summary is concise (4-8 sentences)
✅ Summary has bullet points format
✅ Close button works
✅ Dark mode styling works
✅ Error handling prevents crashes
✅ Preprocessing removes HTML/quotes/signatures
