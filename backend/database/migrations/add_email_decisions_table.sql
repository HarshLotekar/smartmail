-- Migration: Add email_decisions table
-- Created: 2026-01-14
-- Purpose: Store AI decision classification metadata for emails

CREATE TABLE IF NOT EXISTS email_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  decision_required BOOLEAN NOT NULL DEFAULT 0,
  decision_type TEXT NOT NULL,
  decision_score REAL DEFAULT 0.0, -- 0.0 to 1.0 confidence score
  decision_reason TEXT, -- Human-readable explanation
  detected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'ignored', 'snoozed'
  snoozed_until DATETIME, -- When to resurface snoozed emails
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (email_id) REFERENCES messages (gmail_id) ON DELETE CASCADE,
  UNIQUE(email_id, user_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_email_decisions_user_id ON email_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_email_decisions_decision_required ON email_decisions(decision_required);
CREATE INDEX IF NOT EXISTS idx_email_decisions_user_decision ON email_decisions(user_id, decision_required);
CREATE INDEX IF NOT EXISTS idx_email_decisions_status ON email_decisions(status);
CREATE INDEX IF NOT EXISTS idx_email_decisions_user_status ON email_decisions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_email_decisions_email_id ON email_decisions(email_id);

-- Check constraint for status values
CREATE TRIGGER IF NOT EXISTS validate_decision_status_insert
BEFORE INSERT ON email_decisions
FOR EACH ROW
WHEN NEW.status NOT IN ('pending', 'completed', 'ignored', 'snoozed')
BEGIN
  SELECT RAISE(ABORT, 'Invalid status value. Must be "pending", "completed", "ignored", or "snoozed"');
END;

CREATE TRIGGER IF NOT EXISTS validate_decision_status_update
BEFORE UPDATE ON email_decisions
FOR EACH ROW
WHEN NEW.status NOT IN ('pending', 'completed', 'ignored', 'snoozed')
BEGIN
  SELECT RAISE(ABORT, 'Invalid status value. Must be "pending", "completed", "ignored", or "snoozed"');
END;

-- Auto-update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_email_decisions_timestamp
AFTER UPDATE ON email_decisions
FOR EACH ROW
BEGIN
  UPDATE email_decisions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
