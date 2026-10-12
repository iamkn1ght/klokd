import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { configurePushDisplay, registerForPush, onNotificationTap } from './src/lib/push';

const navigationRef = createNavigationContainerRef<any>();
configurePushDisplay();

// Registers this phone for alerts once the person is signed in, and opens
// the inbox when an alert is tapped (each notice there links to its shift).
function PushBridge() {
  const { isAuthenticated, accessToken } = useAuth();
  useEffect(() => {
    if (isAuthenticated && accessToken) void registerForPush(accessToken);
  }, [isAuthenticated, accessToken]);
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
  return (
    <AuthProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="light" />
        <RootNavigator />
        <PushBridge />
      </NavigationContainer>
    </AuthProvider>
  );
}
