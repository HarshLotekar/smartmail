-- Migration: Fix Email Data Model
-- Add proper state flags and metadata

-- Messages table columns
ALTER TABLE messages ADD COLUMN is_sent BOOLEAN DEFAULT 0;
ALTER TABLE messages ADD COLUMN is_archived BOOLEAN DEFAULT 0;
ALTER TABLE messages ADD COLUMN has_attachments BOOLEAN DEFAULT 0;
ALTER TABLE messages ADD COLUMN attachments TEXT;
ALTER TABLE messages ADD COLUMN labels TEXT DEFAULT '[]';
ALTER TABLE messages ADD COLUMN internal_date INTEGER;
ALTER TABLE messages ADD COLUMN requires_reply BOOLEAN DEFAULT 0;
ALTER TABLE messages ADD COLUMN requires_action BOOLEAN DEFAULT 0;
ALTER TABLE messages ADD COLUMN is_newsletter BOOLEAN DEFAULT 0;

-- Users table sync metadata
ALTER TABLE users ADD COLUMN last_sync_at DATETIME;
ALTER TABLE users ADD COLUMN gmail_history_id TEXT;
ALTER TABLE users ADD COLUMN sync_page_token TEXT;
ALTER TABLE users ADD COLUMN rate_limit_retry_after DATETIME;
ALTER TABLE users ADD COLUMN sync_backoff_level INTEGER DEFAULT 0;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_messages_sent_date ON messages(user_id, is_sent, date DESC);
CREATE INDEX IF NOT EXISTS idx_messages_archived_date ON messages(user_id, is_archived, date DESC);
CREATE INDEX IF NOT EXISTS idx_messages_starred_date ON messages(user_id, is_starred, date DESC);
CREATE INDEX IF NOT EXISTS idx_messages_requires_action ON messages(user_id, requires_action, is_archived);
CREATE INDEX IF NOT EXISTS idx_messages_labels ON messages(user_id, labels);
CREATE INDEX IF NOT EXISTS idx_messages_thread_date ON messages(user_id, thread_id, internal_date);

