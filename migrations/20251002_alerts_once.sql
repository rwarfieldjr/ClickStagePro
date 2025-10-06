CREATE TABLE IF NOT EXISTS alerts_sent (
  user_id VARCHAR NOT NULL,         -- matches users.id type (varchar)
  threshold INTEGER NOT NULL,       -- e.g., 10,5,0
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, threshold)
);
