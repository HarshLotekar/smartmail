# SmartMail Database Documentation

## 📊 Database Schema Overview

SmartMail uses SQLite as its primary database, providing a lightweight, serverless, and zero-configuration database engine perfect for local-first applications with optional cloud deployment.

## 🗄️ Core Tables

### Users Table
Stores user account information and OAuth tokens for Gmail access.

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at INTEGER,
    preferences TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Messages Table
Stores email messages with comprehensive metadata and AI processing results.

```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    gmail_id TEXT NOT NULL,
    thread_id TEXT,
    subject TEXT,
    from_email TEXT,
    from_name TEXT,
    to_email TEXT,
    date DATETIME,
    body_text TEXT,
    body_html TEXT,
    snippet TEXT,
    -- Email status flags
    is_read BOOLEAN DEFAULT 0,
    is_starred BOOLEAN DEFAULT 0,
    is_important BOOLEAN DEFAULT 0,
    -- AI processing metadata
    ai_processed BOOLEAN DEFAULT 0,
    ai_category TEXT,
    ai_priority INTEGER DEFAULT 0,
    ai_summary TEXT,
    ai_sentiment TEXT,
    ai_confidence REAL DEFAULT 0.0,
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Constraints
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE(user_id, gmail_id)
);
```

### Labels Table
Manages both system (Gmail) labels and custom user-created labels.

```sql
CREATE TABLE labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#007bff',
    description TEXT,
    is_system BOOLEAN DEFAULT 0,
    gmail_label_id TEXT,
    auto_apply BOOLEAN DEFAULT 0,
    ai_rules TEXT,
    message_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
);
```

### Message_Labels Junction Table
Many-to-many relationship between messages and labels.

```sql
CREATE TABLE message_labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    label_id INTEGER NOT NULL,
    assigned_by TEXT DEFAULT 'user',
    confidence REAL DEFAULT 1.0,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels (id) ON DELETE CASCADE,
    UNIQUE(message_id, label_id)
);
```

## 🚀 Advanced Features

### Full-Text Search
SmartMail implements SQLite FTS5 for lightning-fast email search:

```sql
CREATE VIRTUAL TABLE messages_fts USING fts5(
    subject, body_text, from_name, from_email,
    content='messages',
    content_rowid='id'
);
```

### AI Processing Logs
Tracks AI processing history and performance metrics:

```sql
CREATE TABLE ai_processing_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message_id INTEGER,
    processing_type TEXT NOT NULL,
    ai_provider TEXT NOT NULL,
    ai_model TEXT,
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT 1,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Email Threads
Manages conversation threading:

```sql
CREATE TABLE email_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    gmail_thread_id TEXT NOT NULL,
    subject TEXT,
    participants TEXT,
    message_count INTEGER DEFAULT 0,
    ai_summary TEXT,
    last_message_date DATETIME
);
```

## 📈 Performance Optimization

### Indexes
The schema includes comprehensive indexes for optimal query performance:

- **User-based queries**: `idx_messages_user_id`, `idx_labels_user_id`
- **Date-based sorting**: `idx_messages_date`, `idx_messages_user_date`
- **Status filtering**: `idx_messages_is_read`, `idx_messages_ai_category`
- **Search optimization**: `idx_messages_from_email`, `idx_messages_subject`
- **Junction table lookups**: `idx_message_labels_message_id`, `idx_message_labels_label_id`

### Views
Pre-built views for common queries:

```sql
-- Messages with their labels
CREATE VIEW messages_with_labels AS
SELECT m.*, 
       GROUP_CONCAT(l.name, ', ') as label_names,
       COUNT(ml.label_id) as label_count
FROM messages m
LEFT JOIN message_labels ml ON m.id = ml.message_id
LEFT JOIN labels l ON ml.label_id = l.id
GROUP BY m.id;

-- User statistics
CREATE VIEW user_stats AS
SELECT u.id, u.email, u.name,
       COUNT(m.id) as total_messages,
       COUNT(CASE WHEN m.is_read = 0 THEN 1 END) as unread_messages,
       COUNT(CASE WHEN m.ai_processed = 1 THEN 1 END) as ai_processed_messages
FROM users u
LEFT JOIN messages m ON u.id = m.user_id
GROUP BY u.id;
```

## 🛠️ Database Operations

### Initialization
```bash
# Initialize database with schema
npm run init-db

# Validate schema and performance
npm run validate-db

# Reset database (development only)
npm run reset-db
```

### Backup and Restore
```bash
# Backup database
sqlite3 backend/database/smartmail.db ".backup backup.db"

# Restore from backup
sqlite3 backend/database/smartmail.db ".restore backup.db"
```

### Migration Management
The schema includes version tracking:

```sql
CREATE TABLE schema_version (
    version TEXT PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);
```

## 🔧 Configuration

### SQLite Optimizations
The schema applies several performance optimizations:

```sql
-- WAL mode for better concurrency
PRAGMA journal_mode = WAL;

-- Optimized synchronization
PRAGMA synchronous = NORMAL;

-- Increased cache size
PRAGMA cache_size = 10000;

-- Memory temp storage
PRAGMA temp_store = memory;

-- Memory-mapped I/O (256MB)
PRAGMA mmap_size = 268435456;
```

### Foreign Key Constraints
```sql
-- Enable foreign key enforcement
PRAGMA foreign_keys = ON;
```

## 📊 Sample Queries

### Get user's unread messages with labels
```sql
SELECT m.id, m.subject, m.from_email, 
       GROUP_CONCAT(l.name) as labels
FROM messages m
LEFT JOIN message_labels ml ON m.id = ml.message_id
LEFT JOIN labels l ON ml.label_id = l.id
WHERE m.user_id = ? AND m.is_read = 0
GROUP BY m.id
ORDER BY m.date DESC;
```

### Full-text search in messages
```sql
SELECT m.id, m.subject, m.from_email, 
       snippet(messages_fts, 0, '<mark>', '</mark>', '...', 32) as highlight
FROM messages_fts 
JOIN messages m ON messages_fts.rowid = m.id
WHERE messages_fts MATCH ?
AND m.user_id = ?
ORDER BY rank;
```

### AI processing statistics
```sql
SELECT 
    processing_type,
    ai_provider,
    COUNT(*) as total_processed,
    AVG(processing_time_ms) as avg_time_ms,
    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
    ROUND(AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) * 100, 2) as success_rate
FROM ai_processing_logs
WHERE user_id = ?
GROUP BY processing_type, ai_provider
ORDER BY total_processed DESC;
```

## 🔒 Security Considerations

1. **Data Isolation**: Each user's data is isolated via user_id foreign keys
2. **Token Security**: OAuth tokens are encrypted in production
3. **Input Validation**: All inputs are validated before database insertion
4. **SQL Injection Prevention**: Parameterized queries used throughout
5. **Access Control**: Database access restricted to authenticated users only

## 🚀 Scaling Considerations

### Local Scaling
- SQLite handles millions of records efficiently
- WAL mode enables concurrent read access
- Proper indexing ensures sub-millisecond queries

### Cloud Migration
When ready to scale beyond SQLite:
1. Export data using provided migration scripts
2. Adapt SQL schema for PostgreSQL/MySQL
3. Update connection configuration
4. Maintain API compatibility

This database design provides a solid foundation that can scale from single-user local deployment to multi-tenant cloud architecture as SmartMail grows.