import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { ShiftDetailScreen } from '../screens/shift/ShiftDetailScreen';
import { ClockInScreen } from '../screens/shift/ClockInScreen';
import { ActiveShiftScreen } from '../screens/shift/ActiveShiftScreen';
import { PaymentConfirmedScreen } from '../screens/shift/PaymentConfirmedScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  ShiftDetail: { shiftId: string };
  ClockIn: { shiftId: string };
  ActiveShift: { shiftId: string };
  PaymentConfirmed: { shiftId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  // In production: check auth state to decide initial route
  const isAuthenticated = false;

  return (
    <Stack.Navigator
      initialRouteName={isAuthenticated ? 'Main' : 'Onboarding'}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#0A0A0F' },
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen name="ShiftDetail" component={ShiftDetailScreen} />
      <Stack.Screen name="ClockIn" component={ClockInScreen} />
      <Stack.Screen name="ActiveShift" component={ActiveShiftScreen} />
      <Stack.Screen name="PaymentConfirmed" component={PaymentConfirmedScreen} />
    </Stack.Navigator>
  );
}
