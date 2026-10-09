import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { ShiftDetailScreen } from '../screens/shift/ShiftDetailScreen';
import { ClockInScreen } from '../screens/shift/ClockInScreen';
import { ActiveShiftScreen } from '../screens/shift/ActiveShiftScreen';
import { ReportProblemScreen } from '../screens/shift/ReportProblemScreen';
import { NotificationsScreen } from '../screens/main/NotificationsScreen';
import { VerifyIDScreen } from '../screens/onboarding/VerifyIDScreen';
import { colors } from '../theme';

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  ShiftDetail: undefined;
  ClockIn: undefined;
  ActiveShift: undefined;
  ReportProblem: undefined;
  Notifications: undefined;
  VerifyIDMain: undefined;
};

const Stack = createNativeStackNavigator<any>();

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

  // State-driven auth routing (canonical react-navigation pattern):
  // when isAuthenticated / isNewUser change, the rendered screen set
  // changes and the navigator transitions automatically. No manual
  // resets from inside child stacks.
  return (
    <Stack.Navigator
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
          <Stack.Screen name="ReportProblem" component={ReportProblemScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="VerifyIDMain" component={VerifyIDScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
