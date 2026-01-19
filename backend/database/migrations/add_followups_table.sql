-- Follow-up Reminders Table
-- Stores smart reminders for emails that need follow-up

CREATE TABLE IF NOT EXISTS follow_ups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  email_id TEXT NOT NULL,
  email_subject TEXT,
  email_from TEXT,
  email_snippet TEXT,
  
  -- Follow-up details
  reminder_date DATETIME NOT NULL,
  reason TEXT, -- AI-detected reason (e.g., "Unanswered question", "Pending response")
  urgency TEXT CHECK(urgency IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status TEXT CHECK(status IN ('pending', 'completed', 'dismissed', 'snoozed')) DEFAULT 'pending',
  
  -- AI metadata
  ai_confidence REAL, -- 0.0 to 1.0
  detected_keywords TEXT, -- JSON array of detected keywords
  commitment_type TEXT, -- 'question', 'request', 'promise', 'deadline', 'meeting'
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  snoozed_until DATETIME,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_followups_user_status ON follow_ups(user_id, status);
CREATE INDEX IF NOT EXISTS idx_followups_reminder_date ON follow_ups(reminder_date);
CREATE INDEX IF NOT EXISTS idx_followups_email_id ON follow_ups(email_id);

-- Insert test data (optional)
-- Will be populated by AI detection in production
