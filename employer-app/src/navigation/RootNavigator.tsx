import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { PostShiftScreen } from '../screens/shift/PostShiftScreen';
import { SelectWorkerScreen } from '../screens/shift/SelectWorkerScreen';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const isAuthenticated = false;

  return (
    <Stack.Navigator
      initialRouteName={isAuthenticated ? 'Main' : 'Onboarding'}
      screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#F4F6F3' } }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen name="PostShift" component={PostShiftScreen} />
      <Stack.Screen name="SelectWorker" component={SelectWorkerScreen} />
    </Stack.Navigator>
  );
}
