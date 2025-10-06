-- Prevent double-deduct when a job restarts or retries
CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_unique_job_consume
ON credit_ledger (source_id)
WHERE reason = 'photo_staged';
