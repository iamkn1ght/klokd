import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { VerifyIDScreen } from '../screens/onboarding/VerifyIDScreen';
import { SkillsScreen } from '../screens/onboarding/SkillsScreen';
import { ConsentScreen } from '../screens/onboarding/ConsentScreen';
import { MpesaSetupScreen } from '../screens/onboarding/MpesaSetupScreen';

export type OnboardingStackParamList = {
  Welcome: undefined;
  VerifyID: undefined;
  Skills: undefined;
  Consent: undefined;
  MpesaSetup: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#0A0A0F' },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="VerifyID" component={VerifyIDScreen} />
      <Stack.Screen name="Skills" component={SkillsScreen} />
      <Stack.Screen name="Consent" component={ConsentScreen} />
      <Stack.Screen name="MpesaSetup" component={MpesaSetupScreen} />
    </Stack.Navigator>
  );
}
