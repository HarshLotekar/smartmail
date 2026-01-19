-- Add decision_level column to email_decisions table
-- Run this migration to support 3-level decision system

-- Check if decision_level column exists, add if not
ALTER TABLE email_decisions ADD COLUMN decision_level INTEGER DEFAULT 0;

-- Update existing records to set decision_level based on decision_score
UPDATE email_decisions
SET decision_level = CASE
    WHEN decision_score >= 0.75 THEN 2
    WHEN decision_score >= 0.55 THEN 1
    ELSE 0
END
WHERE decision_level IS NULL OR decision_level = 0;

-- Create index for faster queries by level
CREATE INDEX IF NOT EXISTS idx_decision_level ON email_decisions(decision_level, status);
