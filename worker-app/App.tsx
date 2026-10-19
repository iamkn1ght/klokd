import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { BrandIntro } from './src/components/Story';
import { AppState } from 'react-native';
import { configurePushDisplay, registerForPush, onNotificationTap } from './src/lib/push';
import { flushQueue, getQueue, loadQueue } from './src/lib/offlineQueue';

const navigationRef = createNavigationContainerRef<any>();
configurePushDisplay();

// Registers this phone for alerts once the person is signed in and past onboarding, and opens
// the inbox when an alert is tapped (each notice there links to its shift).
function PushBridge() {
  const { isAuthenticated, isNewUser, accessToken } = useAuth();
  useEffect(() => {
    if (isAuthenticated && !isNewUser && accessToken) void registerForPush(accessToken);
  }, [isAuthenticated, isNewUser, accessToken]);
  useEffect(
    () =>
      onNotificationTap(() => {
        if (navigationRef.isReady()) navigationRef.navigate('Notifications');
      }),
    []
  );
  return null;
}

// Sends check-ins saved without signal: on sign-in, whenever the app comes back
// to the front, and every 30 s while something is waiting.
function CheckinQueueBridge() {
  const { isAuthenticated, getToken } = useAuth();
  useEffect(() => {
    if (!isAuthenticated) return;
    const flush = () => {
      if (getQueue().pending.length) void flushQueue(getToken);
    };
    void loadQueue().then(flush);
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') flush();
    });
    const t = setInterval(flush, 30_000);
    return () => {
      sub.remove();
      clearInterval(t);
    };
  }, [isAuthenticated, getToken]);
  return null;
}

export default function App() {
  // Branded intro on every launch; the app (and the stored session) loads underneath.
  const [intro, setIntro] = useState(true);
  const endIntro = useCallback(() => setIntro(false), []);
  return (
    <AuthProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="light" />
        <RootNavigator />
        <PushBridge />
        <CheckinQueueBridge />
      </NavigationContainer>
      {intro && <BrandIntro onDone={endIntro} tagline="Verified shifts. Clear pay." />}
    </AuthProvider>
  );
}
