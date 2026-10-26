/**
 * Public marketing and guide pages (SEO). Rendered to static HTML at build by
 * scripts/prerender.mjs — no app bundle, so they load instantly and crawl
 * cleanly. Plain data only (Node reads it with type stripping): no imports,
 * no enums. Claims must stay true to the product (D-53); law is described
 * generally and linked to the source, never quoted from memory.
 */

export interface Section {
  h: string;
  p?: string[];
  list?: string[];
  steps?: { t: string; d: string }[];
  table?: { head: string[]; rows: string[][] };
}

export interface Page {
  path: string;
  kind: 'service' | 'guide' | 'index';
  nav?: string;
  title: string; // <title>
  description: string; // meta description (≤ 160 chars)
  eyebrow: string;
  h1: string;
  lead: string;
  sections: Section[];
  faq?: { q: string; a: string }[];
  sources?: { label: string; url: string }[];
  cta: { text: string; href: string; note?: string };
  reviewed?: string; // guides: last reviewed, YYYY-MM-DD
}

const EMPLOYMENT_ACT = { label: 'Employment Act, 2007 (Kenya Law)', url: 'https://new.kenyalaw.org/akn/ke/act/2007/11' };
const WIBA = { label: 'Work Injury Benefits Act, 2007 (Kenya Law)', url: 'https://new.kenyalaw.org/akn/ke/act/2007/13' };
const KRA = { label: 'Kenya Revenue Authority (PAYE)', url: 'https://www.kra.go.ke' };
const NSSF = { label: 'National Social Security Fund', url: 'https://www.nssf.or.ke' };
const SHA = { label: 'Social Health Authority (SHIF)', url: 'https://sha.go.ke' };

export const PAGES: Page[] = [
  {
    path: '/workers',
    kind: 'service',
    nav: 'For workers',
    title: 'Shift Work in Nairobi for Waiters, Baristas & Chefs | Klokd',
    description: 'Find hospitality shift work in Nairobi. Verify your ID once, pick shifts near you with the pay shown up front, and see every deduction on your payslip.',
    eyebrow: 'For workers',
    h1: 'Find hospitality shift work in Nairobi',
    lead: 'Klokd lists shifts from verified venues near you, with the pay shown before you apply. Verify your ID once and any venue on Klokd can book you.',
    sections: [
      {
        h: 'How it works',
        steps: [
          { t: 'Verify once', d: 'Your National ID is checked once with the government register. Every venue on Klokd then sees you as verified.' },
          { t: 'Pick a shift', d: 'See nearby shifts with the role, time, area and pay. Read the contract, then accept.' },
          { t: 'Check in and work', d: 'Tap “I’ve arrived” at the venue, enter the manager’s start PIN, and your shift starts.' },
          { t: 'Get paid', d: 'Clock out and see your pay with every statutory deduction. The venue has 4 hours to check the hours; after that it is approved automatically.' },
        ],
      },
      {
        h: 'What you get on every shift',
        list: [
          'The pay for the shift, shown before you apply',
          'A written contract for the shift, which you accept before it starts',
          'A payslip showing PAYE, NSSF, SHIF and any other deduction',
          'Work-injury (WIBA) cover: venues must show it before they can post',
          'A way to report a problem with a shift, reviewed by Klokd staff',
        ],
      },
      {
        h: 'Roles and areas',
        p: [
          'Waiters, baristas, bartenders, chefs, cashiers, cleaners, security and receptionists.',
          'Venues are joining in Westlands, the CBD and Kilimani first.',
        ],
      },
      {
        h: 'Payouts',
        p: ['M-Pesa payouts switch on with Klokd payments. Until then your pay is worked out and tracked in the app, and settled directly with the venue as our Terms explain.'],
      },
    ],
    faq: [
      { q: 'Is Klokd free for workers?', a: 'Yes. Klokd charges the venue a fee on top of the shift pay. Nothing is taken from your pay for Klokd; only the statutory deductions the law requires.' },
      { q: 'What do I need to sign up?', a: 'You need to be 18 or older, a Kenyan mobile number and your National ID for the one-time check.' },
      { q: 'Does Klokd track my location?', a: 'Only at two moments: when you tap “I’ve arrived” and when you clock out. Klokd keeps an approximate area, not your exact position, and never tracks you in between.' },
      { q: 'What if I have no signal at the venue?', a: 'Your check-in is saved on your phone with the time you tapped and sent when you are back online. The start PIN needs signal, or the manager can start the shift from their app.' },
    ],
    cta: { text: 'Join as a worker', href: '/#/signin?persona=worker', note: 'We’re onboarding in small groups. Join the list and we’ll reach you when your area opens.' },
  },
  {
    path: '/businesses',
    kind: 'service',
    nav: 'For businesses',
    title: 'Hire Verified Shift Staff in Nairobi | Klokd for Restaurants & Hotels',
    description: 'Hire ID-verified waiters, baristas and kitchen staff for single shifts in Nairobi. Post in minutes, start each shift with a PIN, and approve the hours in one place.',
    eyebrow: 'For businesses',
    h1: 'Hire verified shift staff in Nairobi',
    lead: 'Post a shift, pick from ID-verified workers nearby, start the shift with a PIN when they arrive, and approve the hours. Contracts and statutory deductions are handled for every shift.',
    sections: [
      {
        h: 'How it works',
        steps: [
          { t: 'Verify your business', d: 'Add your KRA PIN and your work-injury (WIBA) cover once. Then you can post.' },
          { t: 'Post a shift', d: 'Role, time, area and pay in a couple of minutes. A rate guide shows what other venues on Klokd pay for the role.' },
          { t: 'Pick a worker', d: 'Choose from verified applicants and see their show-up rate and ratings. Or book someone who has worked for you before.' },
          { t: 'Start, then approve', d: 'Give the worker your start PIN on arrival. After clock-out, check the hours and approve the pay, or report a problem within 4 hours.' },
        ],
      },
      {
        h: 'What Klokd handles',
        list: [
          'ID verification against the government register, before a worker’s first shift',
          'A written contract for every shift (Employment Act, s.9 particulars)',
          'Statutory deductions worked out on every payslip: PAYE, NSSF and SHIF',
          'Section 37 alerts when the same worker nears a month of continuous work with you',
          'An attendance record for every shift: arrival, start, clock-out, and any manual start you made',
          'Minimum-wage check on every shift you post',
        ],
      },
      {
        h: 'Pricing',
        p: ['Klokd charges 4% on top of the shift pay. No subscription and no posting fee. See the pricing page for an example.'],
      },
    ],
    faq: [
      { q: 'Who employs the worker?', a: 'The worker is engaged by your business for the shift; Klokd is the marketplace and keeps the record. Our Terms explain this in full.' },
      { q: 'What do I need before I can post?', a: 'Your KRA PIN and current work-injury (WIBA) cover. Klokd checks both before your first shift goes live.' },
      { q: 'What if the worker doesn’t show up?', a: 'Klokd warns you 10 minutes after the start and flags a no-show at 20 minutes. You can wait, find a replacement from the earlier applicants, or cancel.' },
      { q: 'Can I book the same worker again?', a: 'Yes. From your team list you can offer a new shift directly to someone who has worked for you before.' },
    ],
    cta: { text: 'Join as a business', href: '/#/signin?persona=employer', note: 'We’re onboarding venues in Westlands, the CBD and Kilimani first.' },
  },
  {
    path: '/pricing',
    kind: 'service',
    nav: 'Pricing',
    title: 'Pricing: Free for Workers, 4% for Businesses | Klokd',
    description: 'Klokd is free for workers. Businesses pay the shift pay plus a 4% Klokd fee. No subscription, no posting fee.',
    eyebrow: 'Pricing',
    h1: 'Free for workers. 4% for businesses.',
    lead: 'Businesses pay the shift pay plus a 4% fee. There is no subscription and no charge to post a shift. Workers never pay Klokd.',
    sections: [
      {
        h: 'What a shift costs',
        table: {
          head: ['', 'Worker', 'Business'],
          rows: [
            ['Klokd fee', 'None', '4% of the shift pay'],
            ['Example: a KES 1,800 shift', 'Pay of KES 1,800 before statutory deductions', 'KES 1,872 (KES 1,800 + KES 72)'],
            ['Subscription or posting fee', 'None', 'None'],
          ],
        },
      },
      {
        h: 'Deductions',
        p: ['Statutory deductions (PAYE, NSSF, SHIF) come out of the worker’s pay as the law requires and are shown on every payslip. They are not Klokd fees.'],
      },
      {
        h: 'Paying and getting paid',
        p: ['Funding shifts and paying out through M-Pesa switch on with Klokd payments. Until then, pay is settled directly between the business and the worker, as our Terms explain, and Klokd keeps the record.'],
      },
    ],
    cta: { text: 'Get early access', href: '/#/signin' },
  },
  {
    path: '/guides',
    kind: 'index',
    nav: 'Guides',
    title: 'Guides to Casual and Shift Work in Kenya | Klokd',
    description: 'Plain guides for Kenyan venues and shift workers: hiring casual staff, casual workers’ rights, and Section 37 of the Employment Act.',
    eyebrow: 'Guides',
    h1: 'Guides to shift work in Kenya',
    lead: 'Plain explanations for venues and shift workers. General information, not legal advice.',
    sections: [],
    cta: { text: 'Get early access', href: '/#/signin' },
  },
  {
    path: '/guides/hiring-casual-staff-kenya',
    kind: 'guide',
    title: 'Hiring Casual Staff in Kenya: A Checklist for Restaurants and Hotels | Klokd',
    description: 'What a Kenyan venue needs before hiring casual or shift staff: KRA PIN, WIBA cover, minimum wage, written terms, statutory deductions and Section 37.',
    eyebrow: 'Guide for businesses',
    h1: 'Hiring casual staff in Kenya: a checklist',
    lead: 'Before you bring in casual or shift staff, have these in place. Each item says what the law asks of you in general terms and how Klokd handles it.',
    sections: [
      { h: '1. A KRA PIN for the business', p: ['You need it to deduct and remit PAYE for the people you pay. Klokd asks for it before your first shift.'] },
      { h: '2. Work-injury cover (WIBA)', p: ['The Work Injury Benefits Act requires employers to insure their employees against injury at work. Casual staff are employees for this purpose. Klokd asks you to declare your policy and its expiry, and stops new shifts when it lapses.'] },
      { h: '3. At least the minimum wage', p: ['Minimum wages are set by government order for different jobs and areas, and change over time. Klokd checks every shift you post against the current rate for the role.'] },
      { h: '4. Written terms', p: ['The Employment Act requires a written contract for engagements that add up to three months or more. Writing terms down for every shift avoids disputes later; Klokd generates one each time and the worker accepts it before the shift.'] },
      { h: '5. Statutory deductions', p: ['PAYE, NSSF and SHIF apply to wages, and rates change. Check the current rates with KRA, NSSF and the Social Health Authority. Klokd works out the deductions on every payslip from the current rates.'] },
      { h: '6. Watch the one-month line (Section 37)', p: ['A casual worker who works for you continuously for about a month may have to be treated as a monthly-paid employee. See our Section 37 guide. Klokd alerts you at 20 and 25 days and stops booking at 30.'] },
      { h: '7. Keep records', p: ['Keep a record of who worked, when they arrived and left, and what you paid. Klokd records each shift’s arrival, start, clock-out and approval for you.'] },
    ],
    sources: [EMPLOYMENT_ACT, WIBA, KRA, NSSF, SHA],
    cta: { text: 'Hire through Klokd', href: '/businesses' },
    reviewed: '2026-10-26',
  },
  {
    path: '/guides/casual-worker-rights-kenya',
    kind: 'guide',
    title: 'Casual Workers’ Rights in Kenya: What Shift Workers Should Know | Klokd',
    description: 'A plain guide to casual workers’ rights in Kenya: written terms, minimum wage, payslips and deductions, work-injury cover, and when casual work becomes a monthly contract.',
    eyebrow: 'Guide for workers',
    h1: 'Casual workers’ rights in Kenya',
    lead: 'If you work shifts in Kenya, these are the basics to know. This is general information, not legal advice; if something is wrong, ask a lawyer or the labour office.',
    sections: [
      { h: 'You are an employee for each shift', p: ['The Employment Act defines a casual employee as someone paid at the end of each day and engaged for no more than 24 hours at a time. Casual employees still have rights under the Act.'] },
      { h: 'Pay at least the minimum wage', p: ['Government orders set minimum wages by job and area. On Klokd every shift is checked against the minimum before it is posted.'] },
      { h: 'Know your deductions', p: ['PAYE, NSSF and SHIF may be deducted from your pay as the law requires. You should be able to see each one. On Klokd, every shift has a payslip that lists them.'] },
      { h: 'Injury at work', p: ['Employers must insure employees against work injury under the Work Injury Benefits Act. On Klokd, a venue cannot post shifts without declaring current cover.'] },
      { h: 'When casual work becomes monthly', p: ['If you work for the same employer continuously for about a month, Section 37 of the Employment Act may mean you should be treated as a monthly-paid employee, with notice before termination. Our Section 37 guide explains how the days are counted.'] },
      { h: 'If something goes wrong', p: ['Keep your own record of the days you worked and what you were paid. On Klokd you can report a problem with any shift, and Klokd staff review it against the shift record.'] },
    ],
    sources: [EMPLOYMENT_ACT, WIBA],
    cta: { text: 'Find shifts on Klokd', href: '/workers' },
    reviewed: '2026-10-26',
  },
  {
    path: '/guides/section-37-employment-act',
    kind: 'guide',
    title: 'Section 37 of Kenya’s Employment Act: When Casual Work Becomes a Contract | Klokd',
    description: 'How Section 37 of Kenya’s Employment Act converts casual employment to a monthly-paid term contract, how the days are counted, and what venues should do.',
    eyebrow: 'Guide',
    h1: 'Section 37: when casual work becomes a term contract',
    lead: 'Section 37 of the Employment Act stops employers keeping someone “casual” indefinitely. Here is what it covers in general terms. Courts have read it in different ways, so take advice on a specific case.',
    sections: [
      { h: 'Who is a casual employee', p: ['Under the Act, a casual employee is paid at the end of each day and is not engaged for longer than 24 hours at a time.'] },
      {
        h: 'When the section applies',
        list: [
          'A casual employee works for a period, or a number of continuous working days, that add up to at least one month; or',
          'The work they do cannot reasonably be expected to be finished within three months.',
        ],
      },
      { h: 'How days are counted', p: ['Rest days and public holidays that fall within the period count as continuous working days.'] },
      { h: 'What changes', p: ['The contract is treated as one where wages are paid monthly, and the notice rules for monthly contracts apply to ending it. Whether conversion is automatic has been argued in the courts, so check current case law or take advice.'] },
      { h: 'How Klokd helps venues stay on the right side', p: ['Klokd counts the days each worker has worked for your venue. It alerts you at 20 days, asks you to acknowledge at 25, and stops new bookings of that worker at 30, so you can decide in time whether to offer a term contract.'] },
    ],
    sources: [EMPLOYMENT_ACT],
    cta: { text: 'Hire through Klokd', href: '/businesses' },
    reviewed: '2026-10-26',
  },
];
