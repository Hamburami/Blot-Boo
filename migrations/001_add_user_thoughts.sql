-- Migration: Add UserThoughts table
-- Run with: wrangler d1 execute blot-auth-db --file=./migrations/001_add_user_thoughts.sql

CREATE TABLE IF NOT EXISTS UserThoughts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    time_created INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_thoughts_user_id ON UserThoughts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_thoughts_time_created ON UserThoughts(time_created);

