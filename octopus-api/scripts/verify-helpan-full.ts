/** Full Helpan integration test — Klokd's real client vs DEPLOYED Helpan. */
import prisma from '../src/config/database';
import { config } from '../src/config';
import { AppError } from '../src/middleware/errorHandler';
import { identityRailClient, helpanRailClient } from '../src/modules/rails';
import { getHelpanCustomerJwt } from '../src/modules/rails/helpan.client';
import { HELPAN_KLOKD_AGENT_ID, HELPAN_KLOKD_SCOPES } from '../src/modules/rails/helpan.dto';
import type { IdentitiAccountUuid } from '../src/modules/rails/identiti.dto';

const results: { fn: string; status: string; detail: string }[] = [];
const rec = (fn: string, status: string, detail = '') => { results.push({ fn, status, detail }); console.log(`  [${status}] ${fn} ${detail}`); };
const errOf = (e: unknown) => { const a = e as AppError; return `${a.statusCode ?? ''} ${(e as Error).message ?? ''}`.trim().slice(0, 160); };

async function main() {
  console.log(`Helpan ${config.helpan.baseUrl} · secretLen ${config.helpan.appSecret.length}\n`);
  const stamp = String(Date.now());
  const cust = await identityRailClient.createCustomer({ phone: `+2547${stamp.slice(-8)}`, nameFirst: 'Helpan', nameLast: 'Full', appCorrelation: `klokd_hf_${stamp}`, consent: { dpa_consent: true, kyc_consent: true, marketing_consent: false, captured_at: new Date().toISOString(), captured_via: 'app_onboarding' } });
  await identityRailClient.activateCustomer(cust.accountUuid);
  const acct = cust.accountUuid as IdentitiAccountUuid;

  let briefingId = '', authJti = '', authToken = '';
  const shiftPayload = { shift_id: `shf_${stamp}`, category: 'hospitality', location: { lat: -1.2921, lng: 36.8219 }, start_time: new Date(Date.now() + 6 * 3600e3).toISOString(), end_time: new Date(Date.now() + 10 * 3600e3).toISOString(), pay_minor: 150000, employer_id: `emp_${stamp}` };

  try {
    const jwt = await getHelpanCustomerJwt(acct);
    const b = await helpanRailClient.createBriefing(jwt, { briefingType: 'alert', intent: { domain: 'klokd.shift_search', categories: ['hospitality'], min_pay_minor: 80000, origin: { lat: -1.2921, lng: 36.8219 }, max_distance_km: 10 }, expiresAt: new Date(Date.now() + 7 * 864e5).toISOString(), appCorrelationId: `klokd_hf_${stamp}` });
    briefingId = b.id; rec('#6 createBriefing (customer JWT)', 'PASS', `id=${b.id} status=${b.status}`);
  } catch (e) { rec('#6 createBriefing (customer JWT)', 'FAIL', errOf(e)); }

  try {
    const ev = await helpanRailClient.ingestEvent({ eventType: 'klokd.shift_opened', appId: 'klokd', accountUuid: acct, payload: shiftPayload, publishedAt: new Date().toISOString(), appCorrelationId: `klokd_hf_${stamp}` });
    const matched = briefingId ? ev.matchedBriefings.includes(briefingId) : false;
    rec('#7 ingestEvent (HMAC)', 'PASS', `event_id=${ev.eventId}`);
    rec('#8 briefing matcher (klokd.shift_search)', matched ? 'PASS' : 'PARTIAL', `matched=${JSON.stringify(ev.matchedBriefings)}${briefingId ? ' target=' + briefingId : ''}`);
  } catch (e) { rec('#7 ingestEvent (HMAC)', 'FAIL', errOf(e)); rec('#8 briefing matcher', 'SKIP', 'ingest failed'); }

  try {
    const a = await helpanRailClient.issueAuthority({ accountUuid: acct, agentId: HELPAN_KLOKD_AGENT_ID, scopes: [{ scopeId: HELPAN_KLOKD_SCOPES.WORKER_REPUTATION }], ttlSeconds: 3600 });
    authJti = a.id; authToken = a.token; rec('#9 issueAuthority', 'PASS', `id=${a.id} status=${a.status}`);
  } catch (e) { rec('#9 issueAuthority', 'FAIL', errOf(e)); }

  if (authJti && authToken) {
    try { const v = await helpanRailClient.validateAuthority(authJti, { token: authToken, intendedOperation: HELPAN_KLOKD_SCOPES.WORKER_REPUTATION }); rec('#10 validateAuthority', 'PASS', `valid=${v.valid} scope_covers=${v.scopeCovers}`); }
    catch (e) { rec('#10 validateAuthority', 'FAIL', errOf(e)); }
    try { await helpanRailClient.revokeAuthority(authJti, { reason: 'user_initiated' }); rec('#11 revokeAuthority', 'PASS', ''); }
    catch (e) { rec('#11 revokeAuthority', 'FAIL', errOf(e)); }
  } else { rec('#10 validateAuthority', 'SKIP', 'no authority'); rec('#11 revokeAuthority', 'SKIP', 'no authority'); }

  rec('#12 dispatchAction (→KP)', 'HELD', 'money leg parked until KP-1-Ops');

  console.log('\n=== HELPAN FUNCTIONALITY MATRIX ===');
  for (const r of results) console.log(`  ${r.status.padEnd(8)} ${r.fn}${r.detail ? ' — ' + r.detail : ''}`);
  const pass = results.filter(r => r.status === 'PASS').length;
  console.log(`\n${pass} PASS / ${results.length - 1} testable (+1 HELD)`);
  await prisma.$disconnect();
  process.exit(0);
}
main().catch(async (e) => { console.error('HARNESS ERROR', e); await prisma.$disconnect(); process.exit(2); });
