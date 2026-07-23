// Klokd v3 — Hakken DTOs
// Aligned to docs/HAKKEN_INTEGRATION_REFERENCE.md (Chamia, 22 Jun) — canonical
// wire contract for the Hakken pilot.
//
// Klokd-side scope = Phase 1 only (per advisory §2.4 + delta S5-NEW-01):
//   - Entity registration: employer + worker
//   - Broadcast publishing: shift_open + revoke on filled/expired
// Phase 3 (ranking query swap) is Sprint 8+ and OUT of scope.
//
// Hard constraints encoded in this file:
// - §10.7 banned keys (BANNED_KEYS regex) — pay_rate_kes integer minor units only
// - §5 PII wall — no MSISDN/email/name fields in any payload
// - No raw GPS strategy hooks (caller still passes lat/lng numerically; H3 cell
//   centroid is a Klokd-side privacy decision)

export type HakkenEntityType =
  | 'kitchen'
  | 'venue'
  | 'employer'
  | 'worker'
  | 'cooperative'
  | 'fulfilment_provider';

export type HakkenRoleFlag = 'publisher' | 'consumer' | 'employer' | 'worker' | 'both';

export type HakkenEntityStatus = 'active' | 'suspended' | 'retired';

export type HakkenConsentScope = 'single_app' | 'cross_app_optional' | 'cross_app_required';

export type HakkenKlokdBroadcastType = 'shift_open' | 'shift_filled' | 'availability';

export interface HakkenGeo {
  lat: number;
  lng: number;
}

// ─── Entity surfaces ──────────────────────────────────────

/** Klokd employer-side metadata for Hakken entity. NO PII, NO banned keys. */
export interface KlokdEmployerEntityMetadata {
  sector: 'hospitality' | 'health';
  shift_types?: ('lunch' | 'dinner' | 'breakfast' | 'overnight')[];
}

/** Klokd worker-side metadata. NO PII, NO banned keys. */
export interface KlokdWorkerEntityMetadata {
  sector: 'hospitality' | 'health';
  certifications?: string[];
  kyc_tier: 0 | 1 | 2 | 3;
}

export interface HakkenCreateEntityRequest<M = Record<string, unknown>> {
  entityType: HakkenEntityType;
  /** Opaque label — Klokd uses employer business name + venue (NOT worker names). */
  displayName: string;
  roleFlags: HakkenRoleFlag[];
  geo: HakkenGeo;
  geoLabel?: string;
  metadata: M;
  /** Deterministic per business op; enables 409 dedup. */
  externalRef: string;
}

export interface HakkenEntity<M = Record<string, unknown>> {
  entityId: string;
  appSlug: string;
  vertical: string;
  entityType: HakkenEntityType;
  displayName: string;
  roleFlags: HakkenRoleFlag[];
  geo: HakkenGeo;
  geoLabel?: string;
  status: HakkenEntityStatus;
  verification?: 'unverified' | 'verified' | 'enhanced';
  metadata: M;
  externalRef: string;
  createdAt: string;
  updatedAt: string;
}

export interface HakkenPatchEntityRequest {
  displayName?: string;
  geo?: HakkenGeo;
  geoLabel?: string;
  roleFlags?: HakkenRoleFlag[];
  metadata?: Record<string, unknown>;
  status?: HakkenEntityStatus;
}

// ─── Broadcast surfaces ───────────────────────────────────

/** Klokd shift_open payload. pay_rate_kes is integer minor units. */
export interface KlokdShiftOpenPayload {
  shift_id: string;
  role: string;
  shift_start_at: string;
  shift_end_at: string;
  pay_rate_kes: number;
  certifications_required?: string[];
  sector: 'hospitality' | 'health';
  headcount: number;
}

export interface HakkenCreateBroadcastRequest<P = Record<string, unknown>> {
  publisherId: string;
  broadcastType: HakkenKlokdBroadcastType;
  payload: P;
  geo: HakkenGeo;
  geoLabel?: string;
  consentScope: HakkenConsentScope;
  /** ISO-8601 within +7 days. */
  ttlAt: string;
}

export interface HakkenBroadcast<P = Record<string, unknown>> {
  broadcastId: string;
  publisherId: string;
  broadcastType: string;
  payload: P;
  geo: HakkenGeo;
  geoLabel?: string;
  consentScope: HakkenConsentScope;
  ttlAt: string;
  indexedAt: string | null;
  status: 'active' | 'revoked' | 'expired';
  createdAt: string;
}

// ─── §10.7 banned-key wall + §5 PII wall (client-side guards) ─
// The Hakken rail enforces both at the wire layer; these guards catch
// dev mistakes before the round-trip + are exercised by smoke tests.

// Per HAKKEN_INTEGRATION_REFERENCE.md §4: `source_payment` is carved out
// at the rail layer for /v1/entities/ and /v1/tiers only — we keep it banned
// client-side everywhere (conservative; future broadcast-payload callers won't
// accidentally smuggle it through).
export const BANNED_KEY_REGEX =
  /\b(amount|currency|funds|credit|yield|float|transfer|disburse|debit|refund|withdraw|deposit|money|balance|settlement|commission|ledger|kes_amount|usd_amount|monetary_value|source_payment)\b/i;

const PII_PATTERNS: { name: string; test: (s: string) => boolean }[] = [
  { name: 'msisdn', test: s => /(^|\D)(?:\+?254|0)(?:7|1)\d{8}(\D|$)/.test(s) },
  { name: 'email', test: s => /\S+@\S+\.\S+/.test(s) },
  // §5 four PII categories — third one (two-word capitalised) was missing.
  // Catches "James Waweru", "Sarova Stanley", etc. Rail will 400 PII_DETECTED.
  { name: 'capitalised_name', test: s => /^[A-Z][a-z]+ [A-Z][a-z]+(?:\s|$)/.test(s.trim()) },
];

const PII_FIELD_NAMES = new Set(['name', 'full_name', 'first_name', 'last_name']);

function inspectForViolations(value: unknown, path: string[] = []): string[] {
  const out: string[] = [];
  if (value === null || value === undefined) return out;

  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (BANNED_KEY_REGEX.test(k)) {
        out.push(`banned key "${k}" at ${[...path, k].join('.')} (Hakken §10.7)`);
      }
      if (PII_FIELD_NAMES.has(k.toLowerCase()) && typeof v === 'string' && v.length > 0) {
        out.push(`PII field name "${k}" with non-empty value at ${[...path, k].join('.')} (Hakken §5)`);
      }
      out.push(...inspectForViolations(v, [...path, k]));
    }
  } else if (typeof value === 'string') {
    // A business `display_name` legitimately looks like a two-word capitalised
    // name ("Java House Ltd", "Sarova Stanley") — the Hakken rail accepts these
    // (verified 23 Jul: 201, not PII_DETECTED), and Klokd's worker display_names
    // are opaque by construction, so the `capitalised_name` heuristic only ever
    // false-positives on this field and was blocking employer registration
    // entirely. Skip it for display_name; a phone/email there is still a real
    // leak, so keep msisdn/email — and every check still applies to metadata.
    const isDisplayName = path[path.length - 1] === 'displayName';
    for (const { name, test } of PII_PATTERNS) {
      if (isDisplayName && name === 'capitalised_name') continue;
      if (test(value)) {
        out.push(`PII pattern "${name}" detected in ${path.join('.') || '<root>'} (Hakken §5)`);
      }
    }
  }
  return out;
}

/** Throws with consolidated violation list if any §10.7 or §5 issue found. */
export function assertNoBannedKeysOrPii(payload: unknown, context: string): void {
  const violations = inspectForViolations(payload);
  if (violations.length > 0) {
    throw new Error(
      `Hakken payload guard failed for ${context}:\n  - ${violations.join('\n  - ')}`
    );
  }
}
