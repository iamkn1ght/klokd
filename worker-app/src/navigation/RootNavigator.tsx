import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { ShiftDetailScreen } from '../screens/shift/ShiftDetailScreen';
import { ClockInScreen } from '../screens/shift/ClockInScreen';
import { ActiveShiftScreen } from '../screens/shift/ActiveShiftScreen';
import { PaymentConfirmedScreen } from '../screens/shift/PaymentConfirmedScreen';
import { colors } from '../theme';

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
  const { isLoading, isAuthenticated, isNewUser } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.electric} />
      </View>
    );
  }

  const showOnboarding = !isAuthenticated || isNewUser;

  return (
    <Stack.Navigator
      initialRouteName={showOnboarding ? 'Onboarding' : 'Main'}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.ink },
      }}
    >
      {showOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="ShiftDetail" component={ShiftDetailScreen} />
          <Stack.Screen name="ClockIn" component={ClockInScreen} />
          <Stack.Screen name="ActiveShift" component={ActiveShiftScreen} />
          <Stack.Screen name="PaymentConfirmed" component={PaymentConfirmedScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
