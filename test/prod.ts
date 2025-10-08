/*
  Production test script for ClickStagePro.com
  Usage (local or Replit shell with env set):
  tsx test/prod.ts
*/

const BASE = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

async function j(path: string, init?: RequestInit) {
  const r = await fetch(`${BASE}${path}`, { headers: { 'Content-Type':'application/json' }, ...init });
  return { status: r.status, body: await r.text() };
}

async function main() {
  console.log('Base:', BASE);

  console.log('\n[Health]');
  console.log(await j('/api/health'));

  console.log('\n[Stripe diag]');
  console.log(await j('/api/debug/stripe'));

  console.log('\n[Supabase test]');
  console.log(await j('/api/test-supabase'));

  console.log('\n[Static index]');
  const r = await fetch(BASE);
  console.log('GET /', r.status);

  console.log('\n[ZIP endpoint negative test]');
  console.log(await j('/api/files/zip', { method:'POST', body: JSON.stringify({ keys: [] }) }));

  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
