/**
 * Landing-page copy. Shared by the LandingScreen and by scripts/prerender.mjs,
 * which writes the same words into the static HTML crawlers and slow phones
 * see before the app loads — so the two can't drift. Plain data only (the
 * prerender runs it in Node with type stripping): no imports, no enums.
 */

export const HERO = {
  h1Lead: 'The shift you',
  h1Accent: 'can trust.',
  sub:
    'Klokd is a verified hospitality shift marketplace for Nairobi. Workers verify once and check in with their phone. ' +
    'Businesses pick a verified worker, give them a start PIN on arrival and approve the hours, with the paperwork handled.',
};

export const AREAS = ['Westlands', 'CBD', 'Kilimani'];

export const PROOF = [
  { icon: 'shield', title: 'Verified workers', body: 'National ID checked once with the government register, before the first shift.' },
  { icon: 'mpesa', title: 'Clear pay', body: 'Every shift shows pay and statutory deductions. M-Pesa payouts switch on with Klokd payments.' },
  { icon: 'doc', title: 'Compliant contracts', body: 'Employment Act s.9 contract for every shift.' },
] as const;

export const HOW = {
  h2Lead: 'Built for',
  h2Accent: 'both sides',
  h2Tail: 'of the shift.',
  sub: 'Three steps for workers, three for employers. Klokd handles the contract, the deductions and the payout in between.',
};

export const WORKER_FLOW = { title: 'Find a shift.\nGet paid after clock-out.' };
export const EMPLOYER_FLOW = { title: 'Hire the shift.\nNot the headache.' };

export const WORKER_STEPS = [
  { t: 'Verify once', d: 'Your National ID, checked once with the government register. Every employer on Klokd sees you as verified.' },
  { t: 'Pick a shift', d: 'Nearby shifts with the pay shown up front. Review the contract, then accept.' },
  { t: 'Get paid', d: 'Clock out and see your pay with every deduction. It goes to your M-Pesa once Klokd payments are live.' },
];

export const EMPLOYER_STEPS = [
  { t: 'Verify your business', d: 'KRA PIN and WIBA cover, once. Then you can post.' },
  { t: 'Post a shift', d: 'Role, time, area and pay in a couple of minutes. Verified workers nearby can apply straight away.' },
  { t: 'Pick and approve', d: 'Choose from verified applicants, give the start PIN on arrival, then check the hours and approve the pay.' },
];

export const BUILT_IN = [
  { k: 'Contract', l: 'Generated for every shift, accepted before it starts' },
  { k: 'PAYE · NSSF · SHIF', l: 'Calculated on every payslip' },
  { k: 'Check-in', l: 'Location at arrival plus your start PIN, never tracked in between' },
  { k: 'Data', l: 'Built to Kenya’s Data Protection Act 2019' },
];

export const CLOSING = {
  h: 'Be first in when Klokd opens in your area.',
  p: 'We’re onboarding workers and venues in small groups. Tell us who you are and we’ll reach you when your spot opens.',
};
