CREATE TABLE IF NOT EXISTS [Thoughts] (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT,
  "time-created" INTEGER,
  "expiration-time" INTEGER,
  latitude INTEGER,
  longitude INTEGER
);

CREATE TABLE IF NOT EXISTS Connections (
  thought_id_a INTEGER NOT NULL,
  thought_id_b INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (thought_id_a, thought_id_b)
);

