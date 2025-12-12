-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- UUID format
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL, -- Unix timestamp
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Sessions table for auth tokens
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Updated thoughts table with user association
CREATE TABLE IF NOT EXISTS thoughts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    x REAL DEFAULT 0,
    y REAL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    latitude REAL,
    longitude REAL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_thoughts_user_id ON thoughts(user_id);
CREATE INDEX IF NOT EXISTS idx_thoughts_created_at ON thoughts(created_at);

-- UserThoughts table (simplified thoughts storage)
CREATE TABLE IF NOT EXISTS UserThoughts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    time_created INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_thoughts_user_id ON UserThoughts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_thoughts_time_created ON UserThoughts(time_created);

-- Connections table with user association (optional - for later)
CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    thought_id_1 TEXT NOT NULL,
    thought_id_2 TEXT NOT NULL,
    label TEXT,
    weight REAL DEFAULT 1.0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (thought_id_1) REFERENCES thoughts(id) ON DELETE CASCADE,
    FOREIGN KEY (thought_id_2) REFERENCES thoughts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id);

