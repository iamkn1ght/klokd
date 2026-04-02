/**
 * Klokd Design Tokens — Employer App (Light Shell)
 * Source: klokd_brand_guide.tsx (LOCKED)
 *
 * Employer App = always light mist shell
 * Dark text on light backgrounds
 * Gradient CTAs same as Worker App
 */

export const colors = {
  electric: '#00E5A0',
  volt: '#BCFF4E',
  ink: '#0A0A0F',
  slate: '#1A1A2E',
  mist: '#F4F6F3',     // Employer shell background
  mid: '#6B7280',
  soft: '#E8EDE8',     // Borders, dividers

  success: '#00E5A0',
  warning: '#FFB347',
  error: '#FF6B6B',
  info: '#60A5FA',

  // Light shell alphas
  inkAlpha: {
    '10': 'rgba(10,10,15,0.10)',
    '16': 'rgba(10,10,15,0.16)',
    '22': 'rgba(10,10,15,0.22)',
    '28': 'rgba(10,10,15,0.28)',
    '32': 'rgba(10,10,15,0.32)',
    '50': 'rgba(10,10,15,0.50)',
    '80': 'rgba(10,10,15,0.80)',
  },

  electricAlpha: {
    '08': 'rgba(0,229,160,0.08)',
    '10': 'rgba(0,229,160,0.10)',
    '13': 'rgba(0,229,160,0.13)',
    '15': 'rgba(0,229,160,0.15)',
    '18': 'rgba(0,229,160,0.18)',
    '22': 'rgba(0,229,160,0.22)',
    '28': 'rgba(0,229,160,0.28)',
    '50': 'rgba(0,229,160,0.50)',
  },

  white: '#FFFFFF',
} as const;

export const gradients = {
  cta: ['#00E5A0', '#BCFF4E'] as const,
  logo: ['#00E5A0', '#BCFF4E'] as const,
} as const;

export const typography = {
  size: {
    display: 24,
    h1: 22,
    h2: 18,
    h3: 16,
    h4: 14,
    body: 13,
    caption: 11.5,
    label: 10.5,
    micro: 9.5,
    nano: 9,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
  },
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 28,
} as const;

export const radius = {
  sm: 8, md: 12, lg: 14, xl: 16, full: 999,
} as const;
