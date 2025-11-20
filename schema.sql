CREATE TABLE IF NOT EXISTS thoughts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  lost INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thought_id_a INTEGER NOT NULL,
  thought_id_b INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (thought_id_a) REFERENCES thoughts(id),
  FOREIGN KEY (thought_id_b) REFERENCES thoughts(id),
  UNIQUE(thought_id_a, thought_id_b)
);

