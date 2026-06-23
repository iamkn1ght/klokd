/**
 * Klokd Design Tokens — Worker App (Dark Shell)
 * Ported 1:1 from claude-design/lib/klokd-tokens.js
 */

export const colors = {
  // Primary
  electric: '#00E5A0',
  volt: '#BCFF4E',
  ink: '#0A0A0F',
  slate: '#1A1A2E',
  // Neutral
  mist: '#F4F6F3',
  soft: '#E8EDE8',
  mid: '#6B7280',
  warm: '#F9F7F4',
  // Semantic
  success: '#00E5A0',
  warning: '#FFB347',
  error: '#FF6B6B',
  info: '#60A5FA',

  // Alpha helpers (matched to Claude Design rgba values)
  white: '#FFFFFF',
  white02: 'rgba(255,255,255,0.02)',
  white03: 'rgba(255,255,255,0.03)',
  white04: 'rgba(255,255,255,0.04)',
  white05: 'rgba(255,255,255,0.05)',
  white06: 'rgba(255,255,255,0.06)',
  white08: 'rgba(255,255,255,0.08)',
  white10: 'rgba(255,255,255,0.10)',
  white12: 'rgba(255,255,255,0.12)',
  white15: 'rgba(255,255,255,0.15)',
  white16: 'rgba(255,255,255,0.16)',
  white25: 'rgba(255,255,255,0.25)',
  white30: 'rgba(255,255,255,0.30)',
  white35: 'rgba(255,255,255,0.35)',
  white38: 'rgba(255,255,255,0.38)',
  white40: 'rgba(255,255,255,0.40)',
  white42: 'rgba(255,255,255,0.42)',
  white45: 'rgba(255,255,255,0.45)',
  white50: 'rgba(255,255,255,0.50)',
  white55: 'rgba(255,255,255,0.55)',
  white60: 'rgba(255,255,255,0.60)',
  white65: 'rgba(255,255,255,0.65)',
  white70: 'rgba(255,255,255,0.70)',
  white75: 'rgba(255,255,255,0.75)',
  white85: 'rgba(255,255,255,0.85)',

  electricAlpha: {
    '04': 'rgba(0,229,160,0.04)',
    '06': 'rgba(0,229,160,0.06)',
    '07': 'rgba(0,229,160,0.07)',
    '08': 'rgba(0,229,160,0.08)',
    '10': 'rgba(0,229,160,0.10)',
    '12': 'rgba(0,229,160,0.12)',
    '13': 'rgba(0,229,160,0.13)',
    '15': 'rgba(0,229,160,0.15)',
    '18': 'rgba(0,229,160,0.18)',
    '20': 'rgba(0,229,160,0.20)',
    '22': 'rgba(0,229,160,0.22)',
    '25': 'rgba(0,229,160,0.25)',
    '28': 'rgba(0,229,160,0.28)',
    '30': 'rgba(0,229,160,0.30)',
    '33': 'rgba(0,229,160,0.20)', // 0x33/0xff ≈ 0.20
    '35': 'rgba(0,229,160,0.35)',
    '40': 'rgba(0,229,160,0.40)',
    '50': 'rgba(0,229,160,0.50)',
  },

  voltAlpha: {
    '08': 'rgba(188,255,78,0.08)',
    '10': 'rgba(188,255,78,0.10)',
    '12': 'rgba(188,255,78,0.12)',
    '14': 'rgba(188,255,78,0.14)',
    '15': 'rgba(188,255,78,0.15)',
    '18': 'rgba(188,255,78,0.18)',
  },

  warnAlpha: {
    '12': 'rgba(255,179,71,0.12)',
    '14': 'rgba(255,179,71,0.14)',
    '25': 'rgba(255,179,71,0.25)',
  },

  errAlpha: {
    '06': 'rgba(255,107,107,0.06)',
    '14': 'rgba(255,107,107,0.14)',
    '20': 'rgba(255,107,107,0.20)',
  },

  infoAlpha: {
    '14': 'rgba(96,165,250,0.14)',
  },
} as const;

export const gradients = {
  cta: ['#00E5A0', '#BCFF4E'] as const,
  logo: ['#00E5A0', '#BCFF4E'] as const,
  dark: ['#0A0A0F', '#1A1A2E'] as const,
  badge: ['rgba(0,229,160,0.15)', 'rgba(188,255,78,0.1)'] as const,
} as const;

export const typography = {
  size: {
    hero: 38,
    display: 34,
    h0: 30,
    h1: 26,
    h2: 22,
    h3: 18,
    h4: 16,
    body: 14,
    bodySm: 13,
    caption: 12,
    label: 11,
    small: 10.5,
    tiny: 10,
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
  mono: 'monospace',
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
  xxl: 18,
  xxxl: 20,
  huge: 28,
  full: 999,
} as const;
