/**
 * Story — the launch intro and scroll-driven reveals used on Welcome.
 *
 *   <BrandIntro onDone />        ~1.5 s Klokd mark on every cold start
 *   useScrollStory()             scroll position + viewport height for a story
 *   <Reveal story>               fades/rises a section in as it scrolls into view
 *   story.progress(y, distance)  0→1 as the reader scrolls past a point
 *
 * Everything respects iOS Reduce Motion: no movement, content just shows.
 * Reveal must be a direct child of the story's scroll content so its
 * measured y is relative to the scroll content.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AccessibilityInfo, Easing, LayoutChangeEvent, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { LogoMark } from './Primitives';
import { colors } from '../theme';

const EASE = Easing.bezier(0.22, 1, 0.36, 1);

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => alive && setReduce(v)).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/** Full-screen launch intro. Calls onDone when finished (or straight away under Reduce Motion). */
export function BrandIntro({ onDone, tagline = 'Verified shifts. Clear pay.', accent = colors.electric }: { onDone: () => void; tagline?: string; accent?: string }) {
  const reduce = useReduceMotion();
  const mark = useRef(new Animated.Value(0)).current;
  const words = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const total = reduce ? 600 : 1500;
    const seq = Animated.sequence([
      Animated.parallel([
        Animated.timing(mark, { toValue: 1, duration: reduce ? 0 : 520, easing: EASE, useNativeDriver: true }),
        Animated.timing(bar, { toValue: 1, duration: total - 260, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
        Animated.sequence([
          Animated.delay(reduce ? 0 : 220),
          Animated.timing(words, { toValue: 1, duration: reduce ? 0 : 420, easing: EASE, useNativeDriver: true }),
        ]),
      ]),
      Animated.timing(out, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);
    seq.start(({ finished }) => finished && onDone());
    return () => seq.stop();
  }, [reduce, mark, words, bar, out, onDone]);

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.intro, { opacity: out }]} accessibilityLabel="Klokd">
      <Animated.View
        style={{
          opacity: mark,
          borderRadius: 29,
          transform: [{ scale: mark.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }],
          shadowColor: accent,
          shadowOpacity: 0.55,
          shadowRadius: 40,
          shadowOffset: { width: 0, height: 18 },
        }}
      >
        <LogoMark size={104} />
      </Animated.View>
      <Animated.View style={{ alignItems: 'center', opacity: words, transform: [{ translateY: words.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
        <Text style={styles.word}>klokd</Text>
        <Text style={styles.tag}>{tagline}</Text>
      </Animated.View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: accent, width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
      <Text style={styles.foot}>A Kirimon Market Ventures company</Text>
    </Animated.View>
  );
}

export interface Story {
  scrollY: Animated.Value;
  viewport: number;
  onScroll: (...args: any[]) => void;
  onViewport: (e: LayoutChangeEvent) => void;
  reduce: boolean;
  /** 0→1 as the reader scrolls from `y` entering the lower third to `distance` px further. */
  progress: (y: number, distance?: number) => Animated.AnimatedInterpolation<number>;
}

export function useScrollStory(): Story {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [viewport, setViewport] = useState(800);
  const reduce = useReduceMotion();
  const onScroll = useMemo(() => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false }), [scrollY]);
  return {
    scrollY,
    viewport,
    reduce,
    onScroll,
    onViewport: e => setViewport(e.nativeEvent.layout.height),
    progress: (y, distance = 220) => {
      if (reduce) return new Animated.Value(1).interpolate({ inputRange: [0, 1], outputRange: [1, 1] });
      const start = y - viewport * 0.72;
      return scrollY.interpolate({ inputRange: [start, start + distance], outputRange: [0, 1], extrapolate: 'clamp' });
    },
  };
}

/** A section that rises and fades in as it scrolls into view. `from` slides it in sideways instead. */
export function Reveal({ story, children, style, from = 'below', distance = 180 }: { story: Story; children: React.ReactNode; style?: StyleProp<ViewStyle>; from?: 'below' | 'left' | 'right'; distance?: number }) {
  const [y, setY] = useState<number | null>(null);
  if (story.reduce) return <View style={style}>{children}</View>;
  const p = y == null ? null : story.progress(y, distance);
  const offset = from === 'left' ? -40 : from === 'right' ? 40 : 28;
  const move = p ? p.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) : offset;
  return (
    <Animated.View
      onLayout={e => setY(e.nativeEvent.layout.y)}
      style={[
        style,
        {
          opacity: p ?? 0,
          transform: from === 'below' ? [{ translateY: move as any }] : [{ translateX: move as any }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Reports a child's y (relative to the scroll content) so it can drive its own progress. */
export function Measured({ onY, children, style }: { onY: (y: number) => void; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style} onLayout={e => onY(e.nativeEvent.layout.y)}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', gap: 20, zIndex: 100 },
  word: { color: colors.white, fontSize: 34, fontWeight: '900', letterSpacing: -1.2 },
  tag: { color: colors.white60, fontSize: 15, marginTop: 6 },
  track: { position: 'absolute', bottom: 92, width: 120, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  foot: { position: 'absolute', bottom: 54, color: colors.white35, fontSize: 12 },
});
