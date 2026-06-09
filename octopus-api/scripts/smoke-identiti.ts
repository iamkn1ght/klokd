// End-to-end smoke test through Klokd's IdentityRailClient.
// Verifies the production-shaped client (not raw HTTP) works against the live sandbox.

import { identityRailClient } from '../src/modules/rails/identiti.client';

async function main() {
  const ts = Date.now();
  const phone = `+25470${String(ts).slice(-7)}`;
  console.log(`Creating customer for ${phone}...`);

  const customer = await identityRailClient.createCustomer({
    phone,
    nameFirst: 'KlokdSmoke',
    nameLast: 'Test',
    appCorrelation: `klokd_smoke_${ts}`,
    consent: {
      dpa_consent: true,
      kyc_consent: true,
      marketing_consent: false,
      captured_at: new Date().toISOString(),
      captured_via: 'app_onboarding',
    },
  });
  console.log('✓ createCustomer ->', customer);

  const tier = await identityRailClient.getTier(customer.accountUuid);
  console.log('✓ getTier ->', tier);

  const phoneToken = await identityRailClient.issuePhoneToken({
    accountUuid: customer.accountUuid,
    audience: 'todoku',
  });
  console.log('✓ issuePhoneToken ->', {
    jti: phoneToken.jti,
    audience: phoneToken.audience,
    expiresAt: phoneToken.expiresAt,
    tokenLength: phoneToken.phoneToken.length,
  });

  // Step-up will fail (klokd.login not in operation_kind enum) — surface that.
  try {
    const challenge = await identityRailClient.createStepUpChallenge({
      accountUuid: customer.accountUuid,
      operationAudience: 'https://api.klokd.co.ke',
      operationKind: 'klokd.login',
      operationRiskTier: 'low',
      factor: 'phone_otp',
    });
    console.log('✓ createStepUpChallenge ->', challenge);
  } catch (err) {
    const e = err as Error;
    console.log('✗ createStepUpChallenge (expected — Silvia must register klokd.* operation_kind):');
    console.log('  ', e.message);
  }
}

main().catch(err => {
  console.error('Smoke failed:', err);
  process.exit(1);
});
