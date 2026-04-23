/**
 * Icon library — ported 1:1 from claude-design/lib/klokd-ui.jsx I.* icons.
 * All monoline SVGs using react-native-svg.
 */
import React from 'react';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';

interface IconProps {
  color?: string;
  size?: number;
}

export const Icons = {
  check: ({ color = '#0A0A0F', size = 16 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M3 8.5l3.5 3L13 5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  arrowRight: ({ color = '#0A0A0F', size = 16 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M3 8h10M9 4l4 4-4 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  back: ({ color = '#fff', size = 16 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M13 8H3m4-4L3 8l4 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  close: ({ color = '#fff', size = 16 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M4 4l8 8M12 4l-8 8" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  ),
  home: ({ color = '#fff', size = 20 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M3 9l7-5 7 5v7a1 1 0 0 1-1 1h-3v-5H7v5H4a1 1 0 0 1-1-1V9z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </Svg>
  ),
  calendar: ({ color = '#fff', size = 20 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect x="3" y="4.5" width="14" height="13" rx="2" stroke={color} strokeWidth="1.6" />
      <Path d="M3 8h14M7 3v3M13 3v3" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  ),
  wallet: ({ color = '#fff', size = 20 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect x="2.5" y="5.5" width="15" height="11" rx="2" stroke={color} strokeWidth="1.6" />
      <Path d="M2.5 9h15M14 13h1" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  ),
  user: ({ color = '#fff', size = 20 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx="10" cy="7" r="3.2" stroke={color} strokeWidth="1.6" />
      <Path d="M3.5 17c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  ),
  pin: ({ color = '#fff', size = 14 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Path d="M7 1.5c2.5 0 4.5 2 4.5 4.5 0 3.3-4.5 6.5-4.5 6.5S2.5 9.3 2.5 6 4.5 1.5 7 1.5z" stroke={color} strokeWidth="1.3" />
      <Circle cx="7" cy="6" r="1.5" stroke={color} strokeWidth="1.3" />
    </Svg>
  ),
  clock: ({ color = '#fff', size = 14 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.3" />
      <Path d="M7 4v3l2 1.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  ),
  shield: ({ color = '#00E5A0', size = 14 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Path d="M7 1l5 2v4c0 3-2.1 5.5-5 6.5C4.1 12.5 2 10 2 7V3l5-2z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
      <Path d="M4.5 7l2 2 3-3.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  star: ({ color = '#BCFF4E', size = 12, filled = true }: IconProps & { filled?: boolean }) => (
    <Svg width={size} height={size} viewBox="0 0 12 12">
      <Path d="M6 1l1.5 3.2L11 4.7 8.5 7.2l.7 3.5L6 9l-3.2 1.7.7-3.5L1 4.7l3.5-.5L6 1z" fill={filled ? color : 'none'} stroke={color} strokeWidth="1" />
    </Svg>
  ),
  mpesa: ({ color = '#00E5A0', size = 14 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke={color} strokeWidth="1.2" />
      <Path d="M4 7h6M4 5h4M4 9h3" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
    </Svg>
  ),
  bell: ({ color = '#fff', size = 16 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M4 12V7a4 4 0 1 1 8 0v5l1 1.5H3L4 12z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <Path d="M6.5 14.5a1.5 1.5 0 0 0 3 0" stroke={color} strokeWidth="1.5" />
    </Svg>
  ),
  chevron: ({ color = 'rgba(255,255,255,0.4)', size = 14, dir = 'right' }: IconProps & { dir?: 'right' | 'down' | 'left' }) => (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ transform: dir === 'down' ? [{ rotate: '90deg' }] : dir === 'left' ? [{ rotate: '180deg' }] : [] }}>
      <Path d="M5 3l4 4-4 4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  plus: ({ color = '#0A0A0F', size = 16 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M8 3v10M3 8h10" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  ),
  id: ({ color = '#fff', size = 20 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect x="2.5" y="4" width="15" height="12" rx="2" stroke={color} strokeWidth="1.4" />
      <Circle cx="7" cy="10" r="2" stroke={color} strokeWidth="1.4" />
      <Path d="M11 8.5h4M11 11.5h3" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  ),
  camera: ({ color = '#fff', size = 20 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M4 7V6a1 1 0 0 1 1-1h2l1-1.5h4L13 5h2a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7z" stroke={color} strokeWidth="1.4" />
      <Circle cx="10" cy="11" r="3" stroke={color} strokeWidth="1.4" />
    </Svg>
  ),
  upload: ({ color = '#fff', size = 18 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path d="M9 2v10M5 6l4-4 4 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 12v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  ),
  dispute: ({ color = '#FFB347', size = 14 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Path d="M7 1.5 L12.5 12 L1.5 12 Z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
      <Path d="M7 6v3" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <Circle cx="7" cy="10.5" r="0.6" fill={color} />
    </Svg>
  ),
  download: ({ color = '#fff', size = 14 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Path d="M7 2v7M4 6l3 3 3-3" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 11v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  ),
  lock: ({ color = 'rgba(255,255,255,0.4)', size = 12 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Rect x="2" y="5" width="8" height="6" rx="1" stroke={color} strokeWidth="1.2" />
      <Path d="M4 5V3.5a2 2 0 1 1 4 0V5" stroke={color} strokeWidth="1.2" />
    </Svg>
  ),
};
