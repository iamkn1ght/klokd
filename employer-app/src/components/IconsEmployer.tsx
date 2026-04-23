/**
 * Employer-specific icons — ported from claude-design/lib/klokd-employer.jsx IE.*
 */
import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

interface IconProps { color?: string; size?: number }

export const IE = {
  chef: ({ color = '#fff', size = 14 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Path d="M3 6a2.5 2.5 0 1 1 1.8-4.2A2.5 2.5 0 0 1 9.2 1.8 2.5 2.5 0 1 1 11 6v2H3V6z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
      <Path d="M4 8h6v3H4z" stroke={color} strokeWidth="1.3" />
    </Svg>
  ),
  trend: ({ color = '#00E5A0', size = 12 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path d="M1.5 8.5L4 6l2 2 4.5-4.5M7 3.5h3.5V7" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  calendar2: ({ color = '#fff', size = 14 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Rect x="2" y="3" width="10" height="9.5" rx="1.5" stroke={color} strokeWidth="1.3" />
      <Path d="M2 6h10M5 2v2M9 2v2" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  ),
  plus: ({ color = '#0A0A0F', size = 14 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Path d="M7 2v10M2 7h10" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  ),
  users: ({ color = '#fff', size = 14 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Circle cx="5.5" cy="5" r="2" stroke={color} strokeWidth="1.2" />
      <Circle cx="10.5" cy="5.5" r="1.5" stroke={color} strokeWidth="1.2" />
      <Path d="M2 12c0-1.9 1.6-3 3.5-3s3.5 1.1 3.5 3M9.5 9c1.7 0 2.5 1 2.5 2.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
  ),
  flash: ({ color = '#BCFF4E', size = 12 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path d="M6.5 1L2 7h3l-.5 4L9 5H6L6.5 1z" fill={color} />
    </Svg>
  ),
  search: ({ color = 'rgba(255,255,255,0.5)', size = 14 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Circle cx="6" cy="6" r="4" stroke={color} strokeWidth="1.3" />
      <Path d="M9 9l3 3" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  ),
  office: ({ color = '#fff', size = 18 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path d="M3 15V5l6-2 6 2v10" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
      <Path d="M3 15h12M6 8h2M10 8h2M6 11h2M10 11h2" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  ),
  receipt: ({ color = '#fff', size = 14 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Path d="M3 1v12l1.5-1 1.5 1 1.5-1 1.5 1 1.5-1 1.5 1V1l-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1L3 1z" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
      <Path d="M5.5 5.5h3M5.5 8h3" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
  ),
};
