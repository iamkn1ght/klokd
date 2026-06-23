// End-to-end smoke for Hakken via Klokd's HakkenRailClient.
//
// Activates when:
//   HAKKEN_API_BASE=https://hakken-production.up.railway.app
//   HAKKEN_APP_KEY=klokd
//   HAKKEN_APP_SECRET=<from Silvia>
//   HAKKEN_IDENTITY_JWT_STUB=<RS256 JWT, aud=hakken — minted out-of-band until
//     Identiti customer-JWT issuance endpoint lands>
//
// Mirrors C:\Projects\hakken\scripts\pilotSmoke.ts assertions.

import { hakkenRailClient } from '../src/modules/rails/hakken.client';
import type { KlokdEmployerEntityMetadata, KlokdShiftOpenPayload } from '../src/modules/rails/hakken.dto';

async function main() {
  const jwt = process.env.HAKKEN_IDENTITY_JWT_STUB;
  if (!jwt) {
    console.error('HAKKEN_IDENTITY_JWT_STUB required (RS256 JWT, aud=hakken) until Identiti customer-JWT endpoint lands.');
    process.exit(1);
  }

  const ts = Date.now();
  const externalEmp = `klokd:emp:smoke-${ts}`;

  console.log('1. Register employer entity...');
  const employer = await hakkenRailClient.createEntity<KlokdEmployerEntityMetadata>(jwt, {
    entityType: 'employer',
    displayName: `Sarova Stanley FOH (smoke ${ts})`,
    roleFlags: ['publisher', 'employer'],
    geo: { lat: -1.2841, lng: 36.8225 },
    geoLabel: 'CBD',
    metadata: { sector: 'hospitality', shift_types: ['lunch', 'dinner'] },
    externalRef: externalEmp,
  });
  console.log('   entity_id:', employer.entityId, '· status:', employer.status);

  console.log('\n2. Publish shift_open broadcast...');
  const startAt = new Date(Date.now() + 2 * 3600_000);
  const endAt = new Date(Date.now() + 8 * 3600_000);
  const payload: KlokdShiftOpenPayload = {
    shift_id: `klokd:shift:smoke-${ts}`,
    role: 'server',
    shift_start_at: startAt.toISOString(),
    shift_end_at: endAt.toISOString(),
    pay_rate_kes: 800,
    certifications_required: ['food_handling'],
    sector: 'hospitality',
    headcount: 3,
  };
  const broadcast = await hakkenRailClient.publishBroadcast<KlokdShiftOpenPayload>(jwt, {
    publisherId: employer.entityId,
    broadcastType: 'shift_open',
    payload,
    geo: { lat: -1.2841, lng: 36.8225 },
    geoLabel: 'CBD',
    consentScope: 'cross_app_optional',
    ttlAt: startAt.toISOString(),
  }, { idempotencyKey: `klokd:shift:smoke-${ts}:publish` });
  console.log('   broadcast_id:', broadcast.broadcastId, '· indexed_at:', broadcast.indexedAt);

  console.log('\n3. Revoke broadcast (shift filled)...');
  await hakkenRailClient.revokeBroadcast(jwt, broadcast.broadcastId);
  console.log('   revoked ✓');

  console.log('\n4. Retire employer entity...');
  await hakkenRailClient.patchEntity(jwt, employer.entityId, { status: 'retired' });
  console.log('   retired ✓');

  console.log('\n✓ Klokd → Hakken Phase 1 chain working.');
}

main().catch(err => {
  console.error('\n✗ Hakken smoke failed:', err);
  process.exit(1);
});
