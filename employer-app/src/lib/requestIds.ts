/**
 * Request identity for writes and check-in evidence.
 *
 * Idempotency-Key: every write carries a fresh key so the API can recognise a
 * retried request instead of creating a duplicate (server support lands with
 * the Marketplace API v1; sending it now means store builds already do).
 *
 * Check-in capture: arrive and clock-out carry when the action happened on the
 * device. `capturedElapsedMs`/`sentElapsedMs` come from a monotonic clock that
 * the phone's wall clock can't move; `bootId` identifies this run of the app, so
 * the server only trusts the difference when both readings share it. Device
 * wall time is sent for the record and never trusted. The start PIN is never
 * captured or queued: only the server can check it, so it needs a connection.
 */

function randomHex(bytes: number): string {
  const out = new Uint8Array(bytes);
  const c: any = (globalThis as any).crypto;
  if (c?.getRandomValues) c.getRandomValues(out);
  else for (let i = 0; i < bytes; i++) out[i] = Math.floor(Math.random() * 256);
  return Array.from(out, b => b.toString(16).padStart(2, '0')).join('');
}

/** RFC 4122 v4-shaped id. */
export function newId(): string {
  const h = randomHex(16).split('');
  h[12] = '4';
  h[16] = '89ab'[parseInt(h[16], 16) & 3];
  const s = h.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/** One id per app process: monotonic readings are comparable only within it. */
export const CLOCK_SESSION_ID = newId();

function elapsedMs(): number {
  const p: any = (globalThis as any).performance;
  return Math.round(p?.now ? p.now() : Date.now());
}

export interface CheckinCapture {
  clientEventId: string;
  capture: { capturedElapsedMs: number; sentElapsedMs?: number; bootId: string; deviceWallTime: string };
}

/** Call at the moment of the action (e.g. right after the location fix). */
export function captureCheckin(): CheckinCapture {
  return {
    clientEventId: newId(),
    capture: { capturedElapsedMs: elapsedMs(), bootId: CLOCK_SESSION_ID, deviceWallTime: new Date().toISOString() },
  };
}

/** Stamp the send time onto a body carrying a capture, just before it goes out. */
export function stampSend<T>(body: T): T {
  const b: any = body;
  if (b && typeof b === 'object' && b.capture && typeof b.capture === 'object') {
    return { ...b, capture: { ...b.capture, sentElapsedMs: elapsedMs() } };
  }
  return body;
}
