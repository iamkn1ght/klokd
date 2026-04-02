import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LogoMark } from '../../components/LogoMark';
import { GradientButton } from '../../components/GradientButton';
import { colors, typography, spacing } from '../../theme';

const SLIDES = [
  {
    headline: 'Verified once.\nWork everywhere.',
    sub: 'One ID check. Every employer on Klokd already trusts you.',
    icon: '✦',
  },
  {
    headline: 'Shifts near you.\nApply in seconds.',
    sub: "See what's open today. One tap to accept. Show up and work.",
    icon: '⏱',
  },
  {
    headline: 'Clock out.\nM-Pesa pays you.',
    sub: 'KES in your M-Pesa within 30 minutes of clocking out. Every shift.',
    icon: '💸',
  },
];

const INTERVAL = 3400;

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export function WelcomeScreen({ navigation }: Props) {
  const [activeSlide, setActiveSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setActiveSlide(prev => (prev + 1) % 3);
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    }, INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[activeSlide];

  return (
    <View style={styles.screen}>
      <LogoMark size={30} />

      <Animated.View style={[styles.slideArea, { opacity: fadeAnim }]}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>{slide.icon}</Text>
        </View>
        <Text style={styles.headline}>{slide.headline}</Text>
        <Text style={styles.sub}>{slide.sub}</Text>
      </Animated.View>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => setActiveSlide(i)}
            style={[
              styles.dot,
              {
                width: i === activeSlide ? 22 : 6,
                backgroundColor: i === activeSlide ? colors.electric : colors.white16,
              },
            ]}
          />
        ))}
      </View>

      <GradientButton title="Get started" onPress={() => navigation.navigate('VerifyID')} />

      <TouchableOpacity style={styles.signInRow} onPress={() => {}}>
        <Text style={styles.signInText}>
          Already verified?{' '}
          <Text style={styles.signInLink}>Sign in</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ink,
    padding: spacing.xl,
    paddingTop: 18,
  },
  slideArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.electricAlpha['10'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  iconText: {
    fontSize: 32,
  },
  headline: {
    fontSize: typography.size.h1,
    fontWeight: typography.weight.extrabold,
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.03,
    lineHeight: 27,
    marginBottom: 10,
  },
  sub: {
    fontSize: typography.size.caption,
    color: colors.white42,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 215,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 22,
  },
  dot: {
    height: 6,
    borderRadius: 999,
  },
  signInRow: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  signInText: {
    fontSize: typography.size.caption,
    color: colors.white25,
  },
  signInLink: {
    color: colors.electric,
    fontWeight: typography.weight.semibold,
  },
});
