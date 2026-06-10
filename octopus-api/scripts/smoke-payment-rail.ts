// End-to-end smoke test through Klokd's PaymentRailClient.
// Activates when Silvia provisions Railway (KP-1-Ops).
//
// Run:
//   PAYMENT_RAIL_API_BASE=https://<live> \
//   PAYMENT_RAIL_APP_ID=klokd_sandbox \
//   PAYMENT_RAIL_APP_SECRET=<base64url-43> \
//   IDENTITI_API_BASE=https://identiti-production.up.railway.app \
//   IDENTITI_APP_ID=klokd_sandbox \
//   IDENTITI_APP_SECRET=<hex-64> \
//   npx tsx scripts/smoke-payment-rail.ts

import { identityRailClient } from '../src/modules/rails/identiti.client';
import { paymentRailClient } from '../src/modules/rails/payment-rail.client';
import crypto from 'crypto';

async function main() {
  const ts = Date.now();
  const phone = `+25470${String(ts).slice(-7)}`;

  console.log('1. Create payer (employer) account in Identiti...');
  const employer = await identityRailClient.createCustomer({
    phone,
    nameFirst: 'KP',
    nameLast: 'Smoke',
    appCorrelation: `klokd_kp_smoke_employer_${ts}`,
    consent: {
      dpa_consent: true,
      kyc_consent: true,
      marketing_consent: false,
      captured_at: new Date().toISOString(),
      captured_via: 'app_onboarding',
    },
  });
  console.log('   employer account_uuid:', employer.accountUuid);

  console.log('\n2. Create payee (worker) account in Identiti...');
  const worker = await identityRailClient.createCustomer({
    phone: `+25470${String(ts + 1).slice(-7)}`,
    nameFirst: 'KP',
    nameLast: 'Worker',
    appCorrelation: `klokd_kp_smoke_worker_${ts}`,
    consent: {
      dpa_consent: true,
      kyc_consent: true,
      marketing_consent: false,
      captured_at: new Date().toISOString(),
      captured_via: 'app_onboarding',
    },
  });
  console.log('   worker account_uuid:', worker.accountUuid);

  console.log('\n3. Create KP accounts (wallets) for both...');
  const employerWallet = await paymentRailClient.createAccount({ accountUuid: employer.accountUuid });
  console.log('   employer wallet:', employerWallet);
  const workerWallet = await paymentRailClient.createAccount({ accountUuid: worker.accountUuid });
  console.log('   worker wallet:', workerWallet);

  console.log('\n4. Read employer wallet balance...');
  const balance = await paymentRailClient.getWallet(employer.accountUuid);
  console.log('   balance:', balance);

  console.log('\n5. Create a hold (Klokd "escrow funding")...');
  const hold = await paymentRailClient.createHold({
    payerAccountUuid: employer.accountUuid,
    payeeAccountUuid: worker.accountUuid,
    amountKes: 2000,
    purpose: 'klokd_smoke_shift_001',
    idempotencyKey: crypto.randomUUID(),
  });
  console.log('   hold:', hold);

  console.log('\n6. Initiate payout (low-value, no step-up required)...');
  const payout = await paymentRailClient.initiatePayout({
    workerAccountUuid: worker.accountUuid,
    amountKes: 1850,
    holdId: hold.holdId,
    feeAmountKes: 150,
    idempotencyKey: crypto.randomUUID(),
  });
  console.log('   payout:', payout);

  console.log('\n7. Release the hold...');
  const release = await paymentRailClient.releaseHold({
    holdId: hold.holdId,
    idempotencyKey: crypto.randomUUID(),
  });
  console.log('   release:', release);

  console.log('\n✓ Full KP chain working end-to-end.');
}

main().catch(err => {
  console.error('\n✗ KP smoke failed:', err);
  process.exit(1);
});
