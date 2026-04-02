/**
 * Klokd Design Tokens — Worker App (Dark Shell)
 * Source: klokd_brand_guide.tsx (LOCKED)
 *
 * Worker App = always dark ink shell
 * NEVER white text on Electric Mint
 * Gradient CTAs: Electric Mint → Volt Lime (135deg)
 */

export const colors = {
  // Brand palette
  electric: '#00E5A0',   // Primary CTA, earnings, success
  volt: '#BCFF4E',       // Gradient pair, secondary accents
  ink: '#0A0A0F',        // Worker App shell background
  slate: '#1A1A2E',      // Cards on dark shell
  mist: '#F4F6F3',       // Employer App shell (not used in worker)
  mid: '#6B7280',        // Secondary text, captions
  soft: '#E8EDE8',       // Borders, dividers on light shell

  // Functional
  success: '#00E5A0',
  warning: '#FFB347',
  error: '#FF6B6B',
  info: '#60A5FA',

  // Alpha variants (from mockups)
  white05: 'rgba(255,255,255,0.05)',
  white08: 'rgba(255,255,255,0.08)',
  white10: 'rgba(255,255,255,0.10)',
  white12: 'rgba(255,255,255,0.12)',
  white16: 'rgba(255,255,255,0.16)',
  white25: 'rgba(255,255,255,0.25)',
  white30: 'rgba(255,255,255,0.30)',
  white38: 'rgba(255,255,255,0.38)',
  white42: 'rgba(255,255,255,0.42)',
  white50: 'rgba(255,255,255,0.50)',
  white60: 'rgba(255,255,255,0.60)',

  electricAlpha: {
    '06': 'rgba(0,229,160,0.06)',
    '08': 'rgba(0,229,160,0.08)',
    '10': 'rgba(0,229,160,0.10)',
    '12': 'rgba(0,229,160,0.12)',
    '13': 'rgba(0,229,160,0.13)',
    '15': 'rgba(0,229,160,0.15)',
    '22': 'rgba(0,229,160,0.22)',
    '28': 'rgba(0,229,160,0.28)',
    '40': 'rgba(0,229,160,0.40)',
  },
} as const;

export const gradients = {
  cta: ['#00E5A0', '#BCFF4E'] as const,     // Primary CTA gradient
  logo: ['#00E5A0', '#BCFF4E'] as const,     // Logo background
} as const;

export const typography = {
  family: {
    base: 'Inter',
    mono: 'JetBrainsMono',
  },
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
  tracking: {
    tight: -0.03,
    tighter: -0.04,
    normal: 0,
    wide: 0.05,
    wider: 0.1,
    widest: 0.16,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  full: 999,
} as const;
