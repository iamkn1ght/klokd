/** Shared display formatting — Nairobi time, KES, durations. */

const TZ = 'Africa/Nairobi';

export const kes = (n: number | null | undefined) => (n == null ? '—' : `KES ${Math.round(n).toLocaleString('en-KE')}`);

export const time = (iso: string | Date) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });

export const day = (iso: string | Date) =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ });

export const longDay = (iso: string | Date) =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });

export function relativeDay(iso: string | Date): string {
  const d = new Date(iso);
  const key = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: TZ });
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86_400_000);
  if (key(d) === key(today)) return 'Today';
  if (key(d) === key(tomorrow)) return 'Tomorrow';
  return day(d);
}

export const when = (start: string, end: string) => `${relativeDay(start)} · ${time(start)}–${time(end)}`;

export const hours = (start: string, end: string) => {
  const h = (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
  return `${+h.toFixed(1)} h`;
};

export const hm = (mins: number) => `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;

export const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

export const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return day(iso);
};

/** Browser download of text content (CSV / JSON exports). */
export function downloadText(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
