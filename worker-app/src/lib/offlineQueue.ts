/**
 * Offline check-in queue.
 *
 * "I've arrived" and "Clock out" are captured at the tap (see requestIds) and,
 * when there's no signal, kept on the phone and sent once there is. The server
 * applies each tap once (by clientEventId) and times it from the monotonic
 * readings, so a resend is always safe. The start PIN is never queued.
 *
 * Taps are sent in the order they were made and sending stops at the first one
 * that still can't get through, so a clock-out never lands before its arrival.
 * A tap the server refuses (e.g. the shift was cancelled) moves to `failed` so
 * the worker sees why; it is not retried.
 */
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { api, isRetryable } from '../services/api';

export type QueuedKind = 'arrive' | 'clock-out';

export interface QueuedTap {
  id: string; // the tap's clientEventId
  kind: QueuedKind;
  shiftId: string;
  label: string; // e.g. "Waiter at The Brew Bistro"
  body: Record<string, unknown>;
  queuedAt: string;
  error?: string; // set once the server refuses it
}

interface QueueState {
  pending: QueuedTap[];
  failed: QueuedTap[];
}

const FILE_NAME = 'klokd-checkin-queue.json';
const WEB_KEY = 'klokd_checkin_queue';

let state: QueueState = { pending: [], failed: [] };
let loaded: Promise<void> | null = null;
const listeners = new Set<(s: QueueState) => void>();

function file() {
  return new File(Paths.document, FILE_NAME);
}

async function read(): Promise<QueueState> {
  try {
    const raw =
      Platform.OS === 'web'
        ? typeof window !== 'undefined' ? window.localStorage.getItem(WEB_KEY) : null
        : file().exists ? await file().text() : null;
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.pending) && Array.isArray(parsed.failed)) return parsed;
  } catch {
    // A damaged file is treated as empty rather than blocking check-in.
  }
  return { pending: [], failed: [] };
}

function persist() {
  const raw = JSON.stringify(state);
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage.setItem(WEB_KEY, raw);
    } else {
      const f = file();
      if (!f.exists) f.create();
      f.write(raw);
    }
  } catch (e) {
    console.warn('[queue] could not save', e);
  }
}

function update(next: QueueState) {
  state = next;
  persist();
  listeners.forEach(l => l(state));
}

export function loadQueue(): Promise<void> {
  if (!loaded) {
    loaded = read().then(s => {
      state = s;
      listeners.forEach(l => l(state));
    });
  }
  return loaded;
}

export function getQueue(): QueueState {
  return state;
}

export function subscribeQueue(fn: (s: QueueState) => void): () => void {
  listeners.add(fn);
  void loadQueue().then(() => fn(state));
  return () => listeners.delete(fn);
}

export async function enqueueTap(tap: Omit<QueuedTap, 'queuedAt'>) {
  await loadQueue();
  if (state.pending.some(t => t.id === tap.id)) return;
  update({ ...state, pending: [...state.pending, { ...tap, queuedAt: new Date().toISOString() }] });
}

export function pendingFor(shiftId: string, kind?: QueuedKind): QueuedTap | undefined {
  return state.pending.find(t => t.shiftId === shiftId && (!kind || t.kind === kind));
}

export function dismissFailed(id: string) {
  update({ ...state, failed: state.failed.filter(t => t.id !== id) });
}

const PATHS: Record<QueuedKind, (shiftId: string) => string> = {
  arrive: id => `/attendance/shifts/${id}/arrive`,
  'clock-out': id => `/attendance/shifts/${id}/clock-out`,
};

let flushing: Promise<number> | null = null;

/** Send what's waiting, oldest first. Returns how many landed. */
export function flushQueue(getToken: () => Promise<string | null>): Promise<number> {
  if (!flushing) {
    flushing = (async () => {
      await loadQueue();
      let sent = 0;
      while (state.pending.length) {
        const tap = state.pending[0];
        const token = await getToken();
        if (!token) break;
        try {
          await api(PATHS[tap.kind](tap.shiftId), { method: 'POST', body: tap.body, token, timeoutMs: 20_000 });
          update({ ...state, pending: state.pending.slice(1) });
          sent++;
        } catch (e: any) {
          if (isRetryable(e)) break; // still no signal (or the server is down): try later, in order
          update({
            pending: state.pending.slice(1),
            failed: [...state.failed, { ...tap, error: e?.message ?? 'The server refused this check-in.' }],
          });
        }
      }
      return sent;
    })().finally(() => {
      flushing = null;
    });
  }
  return flushing;
}
