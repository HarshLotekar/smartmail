-- Add is_deleted column to messages table
ALTER TABLE messages ADD COLUMN is_deleted BOOLEAN DEFAULT 0;

-- Add gmail_history_id column to users table for incremental sync
ALTER TABLE users ADD COLUMN gmail_history_id TEXT;

-- Create index for faster filtering of deleted messages
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON messages(is_deleted);

-- Create index for faster filtering by user and deleted status
CREATE INDEX IF NOT EXISTS idx_messages_user_deleted ON messages(user_id, is_deleted);
