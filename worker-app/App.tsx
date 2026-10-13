import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { BrandIntro } from './src/components/Story';
import { configurePushDisplay, registerForPush, onNotificationTap } from './src/lib/push';

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
      </NavigationContainer>
      {intro && <BrandIntro onDone={endIntro} tagline="Verified shifts. Clear pay." />}
    </AuthProvider>
  );
}
