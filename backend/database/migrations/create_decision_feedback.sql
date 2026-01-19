-- Create decision_feedback table for learning from user actions
-- This stores when users click "Not a Decision" to prevent similar false positives

CREATE TABLE IF NOT EXISTS decision_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  email_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK(feedback_type IN ('not_decision', 'helpful', 'unhelpful')),
  original_score REAL,
  original_type TEXT,
  comment TEXT,
  sender_domain TEXT,
  subject_pattern TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (email_id) REFERENCES messages (gmail_id) ON DELETE CASCADE
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_feedback_user_type ON decision_feedback(user_id, feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_sender ON decision_feedback(sender_domain);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON decision_feedback(created_at DESC);
