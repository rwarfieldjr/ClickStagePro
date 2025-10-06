import type { Pool, PoolClient } from "pg";

export async function needsAlert(db: Pool | PoolClient, userId: string | number, threshold: number) {
  const { rows } = await db.query(
    "SELECT 1 FROM alerts_sent WHERE user_id=$1 AND threshold=$2 LIMIT 1",
    [userId, threshold]
  );
  return rows.length === 0;
}

export async function markAlertSent(db: Pool | PoolClient, userId: string | number, threshold: number) {
  await db.query(
    "INSERT INTO alerts_sent (user_id, threshold) VALUES ($1,$2) ON CONFLICT DO NOTHING",
    [userId, threshold]
  );
}
