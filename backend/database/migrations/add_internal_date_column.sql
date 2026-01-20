-- Migration: Add internal_date column to messages table
-- Date: January 20, 2026

ALTER TABLE messages ADD COLUMN internal_date INTEGER;
