/**
 * Prove the Mswipe credentials work, without touching the database.
 *
 *   npx tsx scripts/mswipe-check.ts                 # log in only
 *   npx tsx scripts/mswipe-check.ts --link 10.00    # and create a test link
 *   npx tsx scripts/mswipe-check.ts --status <id>   # check one transaction
 *
 * Reads MSWIPE_* from .env.local. Nothing is written anywhere; the link it
 * creates lives at the gateway and expires on its own.
 */
import { config } from 'dotenv';
import { checkPaymentStatus, createPaymentLink, mswipeConfig, mswipeToken } from '../lib/payments/mswipe';

config({ path: '.env.local' });
config({ path: '.env' });

const args = process.argv.slice(2);
const arg = (name: string) => (args.includes(name) ? String(args[args.indexOf(name) + 1] ?? '') : '');

async function main() {
  const cfg = mswipeConfig();
  if (!cfg) {
    console.error('MSWIPE_USER, MSWIPE_PASSWORD and MSWIPE_CUST_CODE are not set in .env.local — see docs/mswipe.md');
    process.exit(1);
  }
  console.log(`Environment: ${cfg.env} (${cfg.baseUrl})`);
  console.log(`Merchant: user ${cfg.userName} · customer code ${cfg.custCode} · refid ${cfg.refId}`);

  const token = await mswipeToken(true);
  console.log(`Login: OK — token of ${token.length} characters`);

  const status = arg('--status');
  if (status) {
    const result = await checkPaymentStatus(status);
    console.log(`Status: ${result.paid ? 'PAID' : 'not paid'} — ${result.description}${result.paidAt ? ` (${result.paidAt})` : ''}`);
    return;
  }

  const amount = Number(arg('--link'));
  if (!Number.isFinite(amount) || amount <= 0) {
    console.log('\nPass --link <amount> to create a test payment link.');
    return;
  }

  const link = await createPaymentLink({
    invoiceId: `PCT-CHECK-${Date.now().toString(36).toUpperCase()}`,
    amount,
    customerEmail: arg('--email') || 'test@premiumchoicetravel.com',
    customerMobile: arg('--mobile') || '0500000000',
    callbackUrl: `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://premiumchoicetravel.com').replace(/\/+$/, '')}/api/payments/mswipe/callback`,
    notes: ['Premium Choice Travel', 'connectivity check', '', ''],
    validityMinutes: 60,
  });

  console.log(`\nLink created — transaction ${link.txnId}`);
  console.log(link.url);
  console.log(`\nCheck it later with:\n  npx tsx scripts/mswipe-check.ts --status ${link.encryptedId}`);
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
