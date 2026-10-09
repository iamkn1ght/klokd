import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { PostShiftScreen } from '../screens/shift/PostShiftScreen';
import { ShiftDetailScreen } from '../screens/shift/ShiftDetailScreen';
import { VerifyScreen } from '../screens/main/VerifyScreen';
import { NotificationsScreen } from '../screens/main/NotificationsScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

/** Auth state decides the screen set; the navigator transitions on change. */
export function RootNavigator() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.volt} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.ink } }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="PostShift" component={PostShiftScreen} />
          <Stack.Screen name="ShiftDetail" component={ShiftDetailScreen} />
          <Stack.Screen name="Verify" component={VerifyScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
