-- Add attachment columns to messages table
-- Migration: Add has_attachments and attachments columns

-- Add has_attachments boolean column
ALTER TABLE messages ADD COLUMN has_attachments BOOLEAN DEFAULT 0;

-- Add attachments JSON column
ALTER TABLE messages ADD COLUMN attachments TEXT DEFAULT '[]';

-- Create index for quick attachment filtering
CREATE INDEX IF NOT EXISTS idx_messages_has_attachments ON messages(has_attachments);
