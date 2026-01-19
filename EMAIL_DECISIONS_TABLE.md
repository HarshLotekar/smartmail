# Email Decisions Database Table

## Overview
The `email_decisions` table stores AI-powered decision classification metadata for emails, tracking whether emails require action and their current status.

## Table Schema

```sql
CREATE TABLE email_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id TEXT NOT NULL,              -- Gmail message ID (foreign key to messages.gmail_id)
  user_id INTEGER NOT NULL,            -- User ID (foreign key to users.id)
  decision_required BOOLEAN NOT NULL DEFAULT 0,  -- Does email need action?
  decision_type TEXT NOT NULL,         -- Type: reply_required|deadline|follow_up|informational_only
  reason TEXT,                         -- Human-readable explanation (max 12 words)
  status TEXT NOT NULL DEFAULT 'pending',  -- Status: 'pending' or 'done'
  detected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- When classified
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (email_id) REFERENCES messages (gmail_id) ON DELETE CASCADE,
  UNIQUE(email_id, user_id)           -- One decision per email per user
);
```

## Indexes

### Single Column Indexes
- `idx_email_decisions_user_id` - Query by user
- `idx_email_decisions_email_id` - Lookup by email
- `idx_email_decisions_decision_required` - Filter action-required emails
- `idx_email_decisions_status` - Filter by status
- `idx_email_decisions_detected_at` - Sort by detection time

### Composite Indexes (Optimized Queries)
- `idx_email_decisions_user_decision` - User + decision_required
- `idx_email_decisions_user_status` - User + status
- `idx_email_decisions_user_type` - User + decision_type
- `idx_email_decisions_user_pending` - User + status + decision_required

## Model Functions

### `upsertDecision(decisionData)`
Create or update email decision metadata.

```javascript
await decisionModel.upsertDecision({
  email_id: 'msg_abc123',
  user_id: 1,
  decision_required: true,
  decision_type: 'reply_required',
  reason: 'Email asks for confirmation',
  detected_at: new Date().toISOString(),
  status: 'pending'
});
```

### `getDecisionByEmailId(emailId, userId)`
Get decision for specific email.

```javascript
const decision = await decisionModel.getDecisionByEmailId('msg_abc123', 1);
// Returns: { id, email_id, decision_required, decision_type, reason, status, ... }
```

### `getDecisionsByUser(userId, filters)`
Get all decisions for a user with optional filters.

```javascript
// Get all action-required decisions
const decisions = await decisionModel.getDecisionsByUser(1, {
  decision_required: true,
  status: 'pending',
  limit: 50
});

// Get all deadlines
const deadlines = await decisionModel.getDecisionsByUser(1, {
  decision_type: 'deadline'
});
```

### `getPendingDecisions(userId)`
Get pending decisions with email details (joined query).

```javascript
const pending = await decisionModel.getPendingDecisions(1);
// Returns array with: decision fields + subject, from_email, date, snippet
```

### `updateDecisionStatus(decisionId, status)`
Update decision status.

```javascript
await decisionModel.updateDecisionStatus(123, 'done');
```

### `markDecisionDone(emailId, userId)`
Mark decision as done by email ID.

```javascript
await decisionModel.markDecisionDone('msg_abc123', 1);
```

### `getDecisionStats(userId)`
Get statistics for user's decisions.

```javascript
const stats = await decisionModel.getDecisionStats(1);
/* Returns:
{
  total: 150,
  requires_action: 45,
  pending: 30,
  done: 120,
  reply_required: 20,
  deadlines: 10,
  follow_ups: 15,
  informational: 105
}
*/
```

### `bulkInsertDecisions(decisions)`
Bulk insert multiple decisions efficiently.

```javascript
await decisionModel.bulkInsertDecisions([
  { email_id: 'msg_1', user_id: 1, decision_required: true, ... },
  { email_id: 'msg_2', user_id: 1, decision_required: false, ... },
  // ... more decisions
]);
```

## Usage Examples

### Automatic Classification Storage
The AI controller automatically saves decisions when classifying emails:

```javascript
// POST /api/ai/classify-decision
{
  "messageId": "msg_abc123"
}

// 1. Classifies email
// 2. Automatically saves to email_decisions table
// 3. Returns classification + skipped_ai flag
```

### Query Pending Actions
```javascript
// Get all pending action-required emails
const actionItems = await decisionModel.getPendingDecisions(userId);

actionItems.forEach(item => {
  console.log(`${item.decision_type}: ${item.subject}`);
  console.log(`From: ${item.from_email}`);
  console.log(`Reason: ${item.reason}`);
});
```

### Mark Email as Done
```javascript
// User responds to email
await decisionModel.markDecisionDone(emailId, userId);
```

### Dashboard Statistics
```javascript
const stats = await decisionModel.getDecisionStats(userId);

console.log(`You have ${stats.pending} pending actions`);
console.log(`${stats.deadlines} deadlines`);
console.log(`${stats.reply_required} emails need replies`);
```

## Status Workflow

```
Email received
    ↓
AI Classification
    ↓
decision_required = true/false
    ↓
Save to email_decisions
    ↓
status = 'pending'
    ↓
User takes action
    ↓
status = 'done'
```

## Decision Types

| Type | Description | Example |
|------|-------------|---------|
| `reply_required` | Email needs a response | "Can you confirm?" |
| `deadline` | Time-sensitive with due date | "Report due Friday" |
| `follow_up` | Needs action but not urgent | "Let me know when ready" |
| `informational_only` | No action needed | Newsletters, updates |

## Query Patterns

### Get Today's Action Items
```javascript
const today = new Date().toISOString().split('T')[0];
const sql = `
  SELECT ed.*, m.subject, m.from_email
  FROM email_decisions ed
  JOIN messages m ON ed.email_id = m.gmail_id
  WHERE ed.user_id = ? 
    AND ed.decision_required = 1
    AND ed.status = 'pending'
    AND DATE(ed.detected_at) = ?
  ORDER BY ed.decision_type = 'deadline' DESC, ed.detected_at
`;
```

### Get Overdue Deadlines
```javascript
const sql = `
  SELECT ed.*, m.subject, m.date
  FROM email_decisions ed
  JOIN messages m ON ed.email_id = m.gmail_id
  WHERE ed.user_id = ?
    AND ed.decision_type = 'deadline'
    AND ed.status = 'pending'
    AND m.date < datetime('now', '-3 days')
  ORDER BY m.date ASC
`;
```

### Completion Rate
```javascript
const sql = `
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed,
    ROUND(SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as completion_rate
  FROM email_decisions
  WHERE user_id = ? AND decision_required = 1
`;
```

## Performance Considerations

### Index Usage
All queries use indexes for optimal performance:
- User filtering: `idx_email_decisions_user_id`
- Status filtering: `idx_email_decisions_user_status`
- Action filtering: `idx_email_decisions_user_decision`
- Pending actions: `idx_email_decisions_user_pending`

### Expected Performance
- Single decision lookup: <1ms
- User decisions query: <10ms (thousands of records)
- Pending decisions join: <20ms
- Statistics query: <15ms
- Bulk insert (100 records): <50ms

### Optimization Tips
1. Always filter by `user_id` first (indexed)
2. Use composite indexes for multi-column filters
3. Limit result sets for UI display
4. Use `bulkInsertDecisions()` for batch operations

## Migration

### Apply Migration
```bash
cd backend
node database/run-migration.js migrations/add_email_decisions_table.sql
```

### Verify Table
```bash
sqlite3 data/smartmail.db "SELECT sql FROM sqlite_master WHERE name='email_decisions';"
```

### Check Indexes
```bash
sqlite3 data/smartmail.db "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='email_decisions';"
```

## API Integration

### Classification Endpoint
```
POST /api/ai/classify-decision
```

**With messageId (recommended)**:
```json
{
  "messageId": "msg_abc123"
}
```

**Response**:
```json
{
  "success": true,
  "decision_required": true,
  "decision_type": "reply_required",
  "reason": "Email asks for confirmation",
  "skipped_ai": false
}
```

The decision is automatically saved to `email_decisions` table.

## Future Enhancements

1. **Smart Reminders**: Notify users about pending deadlines
2. **Auto-Complete**: Mark as done when user sends reply
3. **ML Training**: Use completion data to improve classifications
4. **Priority Scoring**: Add urgency score 0-100
5. **Snooze Feature**: Temporarily hide decisions
6. **Categories**: Custom user-defined decision categories
7. **Templates**: Quick actions for common decision types
8. **Analytics**: Track response times and patterns

## Summary

✅ **Table created** with proper constraints and indexes  
✅ **Model functions** for all CRUD operations  
✅ **Auto-save** on AI classification  
✅ **Performance optimized** with composite indexes  
✅ **Foreign key** cascade deletes  
✅ **Unique constraint** prevents duplicates  
✅ **Status workflow** (pending → done)  
✅ **Rich queries** with JOIN support  

The `email_decisions` table provides a complete decision tracking system integrated with AI classification! 🎯
