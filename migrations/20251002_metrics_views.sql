-- Quick aggregates for credit totals
CREATE OR REPLACE VIEW v_credit_totals AS
SELECT
  COUNT(*) AS users_with_balance,
  SUM(balance) AS total_credits
FROM credit_balance;

-- Consumption in last 24 hours
CREATE OR REPLACE VIEW v_consumption_last_24h AS
SELECT
  COUNT(*) AS events,
  COALESCE(SUM(-delta),0) AS credits_consumed
FROM credit_ledger
WHERE reason = 'photo_staged'
  AND created_at >= now() - interval '24 hours';
