import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { BusinessVerifyScreen } from '../screens/onboarding/BusinessVerifyScreen';
import { WibaScreen } from '../screens/onboarding/WibaScreen';
import { MpesaSetupScreen } from '../screens/onboarding/MpesaSetupScreen';

const Stack = createNativeStackNavigator();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#F4F6F3' } }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="BusinessVerify" component={BusinessVerifyScreen} />
      <Stack.Screen name="WibaDeclaration" component={WibaScreen} />
      <Stack.Screen name="MpesaSetup" component={MpesaSetupScreen} />
    </Stack.Navigator>
  );
}
