// End-to-end smoke for Todoku through Klokd's CommsRailClient.
// Requires Identiti creds (for phone_token) and Todoku creds (for send).

import { identityRailClient } from '../src/modules/rails/identiti.client';
import { commsRailClient } from '../src/modules/rails/todoku.client';
import { TODOKU_TEMPLATES } from '../src/modules/rails/templates';

async function main() {
  const ts = Date.now();
  const phone = `+25470${String(ts).slice(-7)}`;

  console.log('1. Creating customer in Identiti...');
  const customer = await identityRailClient.createCustomer({
    phone,
    nameFirst: 'TodokuSmoke',
    nameLast: 'Test',
    appCorrelation: `klokd_todoku_smoke_${ts}`,
    consent: {
      dpa_consent: true,
      kyc_consent: true,
      marketing_consent: false,
      captured_at: new Date().toISOString(),
      captured_via: 'app_onboarding',
    },
  });
  console.log('   account_uuid:', customer.accountUuid);

  console.log('\n2. Sending OTP via Todoku...');
  const otp = await commsRailClient.sendOtp(customer.accountUuid, '123456', 5);
  console.log('   ✓ OTP send response:', otp);

  console.log('\n3. Sending shift-confirmed WhatsApp message...');
  const wa = await commsRailClient.sendNotification(
    customer.accountUuid,
    TODOKU_TEMPLATES.SHIFT_CONFIRMED_WA,
    'whatsapp',
    {
      worker_name: 'TodokuSmoke',
      role: 'Waiter',
      venue: 'Sandbox Cafe',
      date: '2026-06-15',
      time: '18:00',
      amount_kes: '2000',
    }
  );
  console.log('   ✓ WA send response:', wa);
}

main().catch(err => {
  console.error('\n✗ Smoke failed:', err);
  process.exit(1);
});
