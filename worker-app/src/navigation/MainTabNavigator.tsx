import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/main/HomeScreen';
import { ShiftsScreen } from '../screens/main/ShiftsScreen';
import { PayScreen } from '../screens/main/PayScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { Icons } from '../components/Icons';
import { KlokdTabBar } from '../components/KlokdTabBar';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

function renderIcon(name: string, focused: boolean) {
  const color = focused ? colors.electric : colors.white45;
  switch (name) {
    case 'Home': return <Icons.home color={color} size={22} />;
    case 'Shifts': return <Icons.calendar color={color} size={22} />;
    case 'Pay': return <Icons.wallet color={color} size={22} />;
    case 'Me': return <Icons.user color={color} size={22} />;
    default: return null;
  }
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={props => <KlokdTabBar {...props} renderIcon={renderIcon} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Shifts" component={ShiftsScreen} />
      <Tab.Screen name="Pay" component={PayScreen} />
      <Tab.Screen name="Me" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
