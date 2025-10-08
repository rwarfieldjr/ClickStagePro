import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const ERROR_LOG = path.join(LOG_DIR, 'errors.log');

function ensureLogDir() {
  try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch {}
}

async function postToSupabase(table: string, row: Record<string, any>) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url.replace(/\/$/, '')}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(row)
    });
  } catch (e) {
    // swallow errors - logging must never break the app
  }
}

function writeFileLine(type: string, data: Record<string, any>) {
  ensureLogDir();
  const line = JSON.stringify({ ts: new Date().toISOString(), type, ...data });
  try { fs.appendFileSync(ERROR_LOG, line + '\n'); } catch {}
}

export async function logWebhook(event: {
  service: 'stripe' | 'supabase' | 'resend' | string;
  eventType: string;
  status: 'success' | 'failed';
  payload?: any;
  userId?: string;
  email?: string;
}) {
  writeFileLine('webhook', event as any);
  await postToSupabase('webhook_logs', {
    service: event.service,
    event_type: event.eventType,
    status: event.status,
    user_id: event.userId || null,
    email: event.email || null,
    payload: event.payload || null,
    created_at: new Date().toISOString(),
  });
}

export async function logError(err: {
  scope: 'upload' | 'auth' | 'billing' | 'email' | string;
  message: string;
  stack?: string;
  userId?: string;
  email?: string;
  context?: any;
}) {
  writeFileLine('error', err as any);
  await postToSupabase('error_logs', {
    scope: err.scope,
    message: err.message,
    stack: err.stack || null,
    user_id: err.userId || null,
    email: err.email || null,
    context: err.context || null,
    created_at: new Date().toISOString(),
  });
}

export async function logEmail(ev: {
  category: 'order_confirmation' | 'order_alert' | 'verification' | 'staged_ready' | string;
  to: string;
  subject?: string;
  status: 'sent' | 'failed';
  error?: string;
}) {
  writeFileLine('email', ev as any);
  await postToSupabase('email_logs', {
    category: ev.category,
    to_email: ev.to,
    subject: ev.subject || null,
    status: ev.status,
    error: ev.error || null,
    created_at: new Date().toISOString(),
  });
}

export async function alertAdmin(subject: string, text: string) {
  // Slack webhook optional
  const slack = process.env.SLACK_WEBHOOK_URL;
  if (slack) {
    try { await fetch(slack, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: `[*Alert*] ${subject}\n${text}` }) }); } catch {}
  }
  // Email via Resend wrapper
  try {
    const email = process.env.ADMIN_EMAIL || process.env.SMTP_FROM;
    if (email) {
      const { sendEmail } = await import('../email/resend.js');
      await sendEmail({ to: email, subject, text, html: `<pre>${text.replace(/</g,'&lt;')}</pre>` });
    }
  } catch {}
}
