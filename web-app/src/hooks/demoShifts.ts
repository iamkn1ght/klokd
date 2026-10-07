/** Shared demo feed — used by demo sessions and as the outage fallback. */
export interface Shift {
  id: string;
  role: string;
  venue: string;
  area: string;
  date: string;
  time: string;
  pay: number;
  dist: string;
  rating: number | null;
  shifts: number;
  highlighted?: boolean;
}

export const DEMO_SHIFTS: Shift[] = [
  { id: 's1', role: 'Waiter', venue: 'The Brew Bistro', area: 'Westlands', date: 'Tonight', time: '5:00 – 10:00 PM', pay: 1800, dist: '0.8 km', rating: 4.8, shifts: 23, highlighted: true },
  { id: 's2', role: 'Barista', venue: 'Java House · Sarit', area: 'Sarit Centre', date: 'Tomorrow', time: '7:00 AM – 2:00 PM', pay: 2100, dist: '1.6 km', rating: 4.6, shifts: 41 },
  { id: 's3', role: 'Bartender', venue: 'Brew Bistro · Kilimani', area: 'Kilimani', date: 'Fri', time: '6:00 – 11:00 PM', pay: 2200, dist: '3.1 km', rating: 4.7, shifts: 12 },
  { id: 's4', role: 'Cashier', venue: 'Artcaffe · Westgate', area: 'Westlands', date: 'Sat', time: '9:00 AM – 5:00 PM', pay: 1600, dist: '1.2 km', rating: 4.5, shifts: 67 },
];
