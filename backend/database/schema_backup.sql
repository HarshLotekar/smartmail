-- SmartMail Database Schema
-- SQLite database schema for AI-powered email organizer
-- Created: October 2025

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- =============================================================================
-- USERS TABLE
-- Stores user account information and OAuth tokens
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    
    -- OAuth2 tokens for Gmail access
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at INTEGER,
    
    -- User preferences stored as JSON
    preferences TEXT DEFAULT '{}',
    
    -- Audit fields
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- MESSAGES TABLE
-- Stores email messages with AI processing metadata
-- =============================================================================

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    
    -- Gmail-specific identifiers
    gmail_id TEXT NOT NULL,
    thread_id TEXT,
    
    -- Email metadata
    subject TEXT,
    from_email TEXT,
    from_name TEXT,
    to_email TEXT,
    cc_email TEXT,
    bcc_email TEXT,
    date DATETIME,
    
    -- Email content
    body_text TEXT,
    body_html TEXT,
    snippet TEXT,
    
    -- Email status flags
    is_read BOOLEAN DEFAULT 0,
    is_starred BOOLEAN DEFAULT 0,
    is_important BOOLEAN DEFAULT 0,
    is_draft BOOLEAN DEFAULT 0,
    is_sent BOOLEAN DEFAULT 0,
    is_trash BOOLEAN DEFAULT 0,
    is_spam BOOLEAN DEFAULT 0,
    
    -- AI processing metadata
    ai_processed BOOLEAN DEFAULT 0,
    ai_category TEXT,
    ai_priority INTEGER DEFAULT 0, -- 0=low, 1=medium, 2=high, 3=urgent
    ai_summary TEXT,
    ai_sentiment TEXT, -- positive, neutral, negative
    ai_confidence REAL DEFAULT 0.0, -- 0.0 to 1.0
    ai_keywords TEXT, -- JSON array of extracted keywords
    ai_entities TEXT, -- JSON array of named entities
    ai_suggested_reply TEXT,
    ai_processing_version TEXT DEFAULT '1.0',
    
    -- Performance optimization
    search_vector TEXT, -- For full-text search optimization
    
    -- Audit fields
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    
    -- Unique constraint for Gmail ID per user
    UNIQUE(user_id, gmail_id)
);

-- =============================================================================
-- LABELS TABLE
-- System and custom labels for email organization
-- =============================================================================

CREATE TABLE IF NOT EXISTS labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    
    -- Label properties
    name TEXT NOT NULL,
    color TEXT DEFAULT '#007bff',
    description TEXT,
    
    -- System vs custom labels
    is_system BOOLEAN DEFAULT 0,
    
    -- Gmail label mapping (for system labels)
    gmail_label_id TEXT,
    
    -- Label configuration
    auto_apply BOOLEAN DEFAULT 0, -- Whether AI should auto-apply this label
    ai_rules TEXT, -- JSON configuration for auto-labeling rules
    
    -- Statistics
    message_count INTEGER DEFAULT 0,
    last_used_at DATETIME,
    
    -- Audit fields
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    
    -- Unique constraint for label name per user
    UNIQUE(user_id, name)
);

-- =============================================================================
-- MESSAGE_LABELS JUNCTION TABLE
-- Many-to-many relationship between messages and labels
-- =============================================================================

CREATE TABLE IF NOT EXISTS message_labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    label_id INTEGER NOT NULL,
    
    -- Metadata about label assignment
    assigned_by TEXT DEFAULT 'user', -- 'user', 'ai', 'sync'
    confidence REAL DEFAULT 1.0, -- AI confidence if assigned by AI
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels (id) ON DELETE CASCADE,
    
    -- Prevent duplicate label assignments
    UNIQUE(message_id, label_id)
);

-- =============================================================================
-- EMAIL_THREADS TABLE
-- Track email conversation threads
-- =============================================================================

CREATE TABLE IF NOT EXISTS email_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    gmail_thread_id TEXT NOT NULL,
    
    -- Thread metadata
    subject TEXT,
    participants TEXT, -- JSON array of email addresses
    message_count INTEGER DEFAULT 0,
    
    -- Thread status
    is_muted BOOLEAN DEFAULT 0,
    is_archived BOOLEAN DEFAULT 0,
    
    -- AI analysis of thread
    ai_summary TEXT,
    ai_importance REAL DEFAULT 0.0,
    ai_last_processed DATETIME,
    
    -- Timestamps
    first_message_date DATETIME,
    last_message_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    
    -- Unique constraint
    UNIQUE(user_id, gmail_thread_id)
);

-- =============================================================================
-- AI_PROCESSING_LOGS TABLE
-- Track AI processing history and performance
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_processing_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message_id INTEGER,
    
    -- Processing details
    processing_type TEXT NOT NULL, -- 'categorize', 'summarize', 'reply', 'triage'
    ai_provider TEXT NOT NULL, -- 'ollama', 'gemini'
    ai_model TEXT,
    
    -- Input/output
    input_data TEXT, -- JSON of input parameters
    output_data TEXT, -- JSON of AI response
    
    -- Performance metrics
    processing_time_ms INTEGER,
    token_count INTEGER,
    success BOOLEAN DEFAULT 1,
    error_message TEXT,
    
    -- Timestamps
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages (user_id);
CREATE INDEX IF NOT EXISTS idx_messages_gmail_id ON messages (gmail_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages (thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_date ON messages (date DESC);
CREATE INDEX IF NOT EXISTS idx_messages_from_email ON messages (from_email);
CREATE INDEX IF NOT EXISTS idx_messages_subject ON messages (subject);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages (is_read);
CREATE INDEX IF NOT EXISTS idx_messages_is_starred ON messages (is_starred);
CREATE INDEX IF NOT EXISTS idx_messages_ai_category ON messages (ai_category);
CREATE INDEX IF NOT EXISTS idx_messages_ai_priority ON messages (ai_priority);
CREATE INDEX IF NOT EXISTS idx_messages_ai_processed ON messages (ai_processed);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_messages_user_date ON messages (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_read ON messages (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_user_category ON messages (user_id, ai_category);
CREATE INDEX IF NOT EXISTS idx_messages_user_priority ON messages (user_id, ai_priority DESC);

-- Labels table indexes
CREATE INDEX IF NOT EXISTS idx_labels_user_id ON labels (user_id);
CREATE INDEX IF NOT EXISTS idx_labels_name ON labels (name);
CREATE INDEX IF NOT EXISTS idx_labels_is_system ON labels (is_system);
CREATE INDEX IF NOT EXISTS idx_labels_gmail_id ON labels (gmail_label_id);
CREATE INDEX IF NOT EXISTS idx_labels_auto_apply ON labels (auto_apply);
CREATE INDEX IF NOT EXISTS idx_labels_user_name ON labels (user_id, name);

-- Message_labels junction table indexes
CREATE INDEX IF NOT EXISTS idx_message_labels_message_id ON message_labels (message_id);
CREATE INDEX IF NOT EXISTS idx_message_labels_label_id ON message_labels (label_id);
CREATE INDEX IF NOT EXISTS idx_message_labels_assigned_by ON message_labels (assigned_by);
CREATE INDEX IF NOT EXISTS idx_message_labels_assigned_at ON message_labels (assigned_at DESC);

-- Email_threads table indexes
CREATE INDEX IF NOT EXISTS idx_email_threads_user_id ON email_threads (user_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_gmail_id ON email_threads (gmail_thread_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_last_message ON email_threads (last_message_date DESC);
CREATE INDEX IF NOT EXISTS idx_email_threads_user_date ON email_threads (user_id, last_message_date DESC);

-- AI_processing_logs indexes
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON ai_processing_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_message_id ON ai_processing_logs (message_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_type ON ai_processing_logs (processing_type);
CREATE INDEX IF NOT EXISTS idx_ai_logs_provider ON ai_processing_logs (ai_provider);
CREATE INDEX IF NOT EXISTS idx_ai_logs_started_at ON ai_processing_logs (started_at DESC);

-- =============================================================================
-- FULL-TEXT SEARCH VIRTUAL TABLE
-- For advanced email search capabilities
-- =============================================================================

-- Virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    subject,
    body_text,
    from_name,
    from_email,
    content='messages',
    content_rowid='id'
);

-- Triggers to keep FTS table in sync
CREATE TRIGGER IF NOT EXISTS messages_fts_insert AFTER INSERT ON messages BEGIN
    INSERT INTO messages_fts(rowid, subject, body_text, from_name, from_email) 
    VALUES (new.id, new.subject, new.body_text, new.from_name, new.from_email);
END;

CREATE TRIGGER IF NOT EXISTS messages_fts_delete AFTER DELETE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, subject, body_text, from_name, from_email) 
    VALUES ('delete', old.id, old.subject, old.body_text, old.from_name, old.from_email);
END;

CREATE TRIGGER IF NOT EXISTS messages_fts_update AFTER UPDATE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, subject, body_text, from_name, from_email) 
    VALUES ('delete', old.id, old.subject, old.body_text, old.from_name, old.from_email);
    INSERT INTO messages_fts(rowid, subject, body_text, from_name, from_email) 
    VALUES (new.id, new.subject, new.body_text, new.from_name, new.from_email);
END;

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View for messages with label information
CREATE VIEW IF NOT EXISTS messages_with_labels AS
SELECT 
    m.*,
    GROUP_CONCAT(l.name, ', ') as label_names,
    GROUP_CONCAT(l.color, ', ') as label_colors,
    COUNT(ml.label_id) as label_count
FROM messages m
LEFT JOIN message_labels ml ON m.id = ml.message_id
LEFT JOIN labels l ON ml.label_id = l.id
GROUP BY m.id;

-- View for user statistics
CREATE VIEW IF NOT EXISTS user_stats AS
SELECT 
    u.id,
    u.email,
    u.name,
    COUNT(m.id) as total_messages,
    COUNT(CASE WHEN m.is_read = 0 THEN 1 END) as unread_messages,
    COUNT(CASE WHEN m.is_starred = 1 THEN 1 END) as starred_messages,
    COUNT(CASE WHEN m.ai_processed = 1 THEN 1 END) as ai_processed_messages,
    COUNT(DISTINCT l.id) as total_labels,
    COUNT(DISTINCT CASE WHEN l.is_system = 0 THEN l.id END) as custom_labels,
    MAX(m.date) as latest_email_date,
    u.created_at as user_created_at
FROM users u
LEFT JOIN messages m ON u.id = m.user_id
LEFT JOIN labels l ON u.id = l.user_id
GROUP BY u.id;

-- =============================================================================
-- PERFORMANCE OPTIMIZATION SETTINGS
-- =============================================================================

-- Optimize SQLite for better performance
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = memory;
PRAGMA mmap_size = 268435456; -- 256MB

-- Auto-vacuum to prevent database bloat
PRAGMA auto_vacuum = INCREMENTAL;

-- =============================================================================
-- SCHEMA VERSION TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS schema_version (
    version TEXT PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Insert current schema version
INSERT OR REPLACE INTO schema_version (version, description) 
VALUES ('1.0.0', 'Initial SmartMail database schema with users, messages, labels, and AI processing support');