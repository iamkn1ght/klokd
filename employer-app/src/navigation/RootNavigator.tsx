import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { PostShiftScreen } from '../screens/shift/PostShiftScreen';
import { SelectWorkerScreen } from '../screens/shift/SelectWorkerScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { isLoading, isAuthenticated, isNewUser } = useAuth();

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.electric} />
    </View>;
  }

  const showOnboarding = !isAuthenticated || isNewUser;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.mist } }}>
      {showOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="PostShift" component={PostShiftScreen} />
          <Stack.Screen name="SelectWorker" component={SelectWorkerScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
