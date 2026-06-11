// End-to-end smoke for Helpan AI via Klokd's HelpanRailClient.
// Run once HELPAN_API_BASE + HELPAN_APP_SECRET land in Klokd's Railway env.
//
//   HELPAN_API_BASE=<live> \
//   HELPAN_APP_ID=klokd \
//   HELPAN_APP_SECRET=<hex-64> \
//   IDENTITI_API_BASE=https://identiti-production.up.railway.app \
//   IDENTITI_APP_ID=klokd_sandbox \
//   IDENTITI_APP_SECRET=<hex-64> \
//   npx tsx scripts/smoke-helpan.ts

import { identityRailClient } from '../src/modules/rails/identiti.client';
import { helpanRailClient, HELPAN_KLOKD_AGENT_ID } from '../src/modules/rails/helpan.client';
import { HELPAN_KLOKD_SCOPES } from '../src/modules/rails/helpan.dto';

async function main() {
  const ts = Date.now();
  const phone = `+25470${String(ts).slice(-7)}`;

  console.log('1. Create worker customer in Identiti...');
  const worker = await identityRailClient.createCustomer({
    phone,
    nameFirst: 'Helpan',
    nameLast: 'Smoke',
    appCorrelation: `klokd_helpan_smoke_${ts}`,
    consent: {
      dpa_consent: true,
      kyc_consent: true,
      marketing_consent: false,
      captured_at: new Date().toISOString(),
      captured_via: 'app_onboarding',
    },
  });
  console.log('   account_uuid:', worker.accountUuid);

  console.log('\n2. Issue delegated authority for klokd.write.shift_signup...');
  const authority = await helpanRailClient.issueAuthority({
    accountUuid: worker.accountUuid,
    agentId: HELPAN_KLOKD_AGENT_ID,
    scopes: [
      {
        scopeId: HELPAN_KLOKD_SCOPES.SHIFT_SIGNUP,
      },
    ],
    ttlSeconds: 3600,
  });
  console.log('   authority_id:', authority.id, '· token len:', authority.token.length);

  console.log('\n3. Validate the authority (Klokd-as-target-rail dry-run)...');
  const validation = await helpanRailClient.validateAuthority(authority.id, {
    token: authority.token,
    intendedOperation: HELPAN_KLOKD_SCOPES.SHIFT_SIGNUP,
  });
  console.log('   valid:', validation.valid, '· scope_covers:', validation.scopeCovers);

  console.log('\n4. Ingest a shift_offer event (should match standing briefings)...');
  const event = await helpanRailClient.ingestEvent({
    eventType: 'klokd.shift_offer',
    appId: 'klokd',
    accountUuid: null,
    payload: {
      shift_id: `shf_smoke_${ts}`,
      category: 'hospitality',
      pay_minor: 250000,
      location: { lat: -1.2921, lng: 36.8219 },
      start_time: new Date(Date.now() + 3600_000).toISOString(),
    },
    publishedAt: new Date().toISOString(),
  });
  console.log('   event_id:', event.eventId, '· matched_briefings:', event.matchedBriefings.length);

  console.log('\n5. Revoke the authority...');
  await helpanRailClient.revokeAuthority(authority.id, { reason: 'user_initiated' });
  console.log('   revoked ✓');
}

main().catch(err => {
  console.error('\n✗ Helpan smoke failed:', err);
  process.exit(1);
});
