import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, TextInput, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { LogoMark } from '../../components/LogoMark';
import { GradientButton } from '../../components/GradientButton';
import { colors, typography, spacing } from '../../theme';

const SLIDES = [
  { headline: 'Verified once.\nWork everywhere.', sub: 'One ID check. Every employer on Klokd already trusts you.', icon: '✦' },
  { headline: 'Shifts near you.\nApply in seconds.', sub: "See what's open today. One tap to accept. Show up and work.", icon: '⏱' },
  { headline: 'Clock out.\nM-Pesa pays you.', sub: 'KES in your M-Pesa within 30 minutes of clocking out. Every shift.', icon: '💸' },
];

type Props = { navigation: NativeStackNavigationProp<any> };

export function WelcomeScreen({ navigation }: Props) {
  const { requestOtp, verifyOtp } = useAuth();
  const [activeSlide, setActiveSlide] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (showLogin) return;
    const timer = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setActiveSlide(prev => (prev + 1) % 3);
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    }, 3400);
    return () => clearInterval(timer);
  }, [showLogin]);

  const handleRequestOtp = async () => {
    if (phone.length < 10) { Alert.alert('Invalid', 'Enter a valid Kenyan phone number'); return; }
    setLoading(true);
    try {
      await requestOtp(phone);
      setOtpSent(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { Alert.alert('Invalid', 'Enter the 6-digit code'); return; }
    setLoading(true);
    try {
      const result = await verifyOtp(phone, otp);
      if (result.isNewUser) {
        navigation.navigate('VerifyID');
      }
      // If existing user, RootNavigator auto-redirects to Main via auth state
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // Login form
  if (showLogin) {
    return (
      <View style={styles.screen}>
        <LogoMark size={30} />
        <View style={styles.loginArea}>
          <Text style={styles.headline}>Sign in</Text>
          <Text style={styles.sub}>Enter your M-Pesa phone number</Text>

          <TextInput
            style={styles.input}
            placeholder="0722 400 500"
            placeholderTextColor={colors.white25}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={13}
            editable={!otpSent}
          />

          {otpSent && (
            <>
              <Text style={[styles.sub, { marginTop: 16 }]}>Enter the 6-digit code sent to {phone}</Text>
              <TextInput
                style={styles.input}
                placeholder="000000"
                placeholderTextColor={colors.white25}
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
                maxLength={6}
                autoFocus
              />
            </>
          )}

          <View style={{ marginTop: 20 }}>
            <GradientButton
              title={loading ? 'Please wait...' : otpSent ? 'Verify OTP' : 'Send OTP'}
              onPress={otpSent ? handleVerifyOtp : handleRequestOtp}
              disabled={loading}
            />
          </View>

          <TouchableOpacity style={styles.signInRow} onPress={() => { setShowLogin(false); setOtpSent(false); setOtp(''); }}>
            <Text style={styles.signInText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Carousel
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
            style={[styles.dot, {
              width: i === activeSlide ? 22 : 6,
              backgroundColor: i === activeSlide ? colors.electric : colors.white16,
            }]}
          />
        ))}
      </View>

      <GradientButton title="Get started" onPress={() => navigation.navigate('VerifyID')} />

      <TouchableOpacity style={styles.signInRow} onPress={() => setShowLogin(true)}>
        <Text style={styles.signInText}>
          Already verified? <Text style={styles.signInLink}>Sign in</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink, padding: spacing.xl, paddingTop: 18 },
  slideArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  loginArea: { flex: 1, justifyContent: 'center' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.electricAlpha['10'], alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  iconText: { fontSize: 32 },
  headline: { fontSize: typography.size.h1, fontWeight: '800', color: '#fff', textAlign: 'center', letterSpacing: -0.03, lineHeight: 27, marginBottom: 10 },
  sub: { fontSize: typography.size.caption, color: colors.white42, textAlign: 'center', lineHeight: 19, maxWidth: 215 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 22 },
  dot: { height: 6, borderRadius: 999 },
  signInRow: { alignItems: 'center', marginTop: spacing.md },
  signInText: { fontSize: typography.size.caption, color: colors.white25 },
  signInLink: { color: colors.electric, fontWeight: '600' },
  input: {
    backgroundColor: colors.white08, borderWidth: 1, borderColor: colors.white10,
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14,
    fontSize: 18, fontWeight: '600', color: '#fff', letterSpacing: 1, marginTop: 12,
  },
});
