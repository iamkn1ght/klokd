import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../screens/main/DashboardScreen';
import { ShiftsScreen } from '../screens/main/ShiftsScreen';
import { PayScreen } from '../screens/main/PayScreen';
import { TeamScreen } from '../screens/main/TeamScreen';
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
    case 'Team': return <Icons.user color={color} size={22} />;
    default: return null;
  }
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={props => <KlokdTabBar {...props} renderIcon={renderIcon} />}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="Shifts" component={ShiftsScreen} />
      <Tab.Screen name="Pay" component={PayScreen} />
      <Tab.Screen name="Team" component={TeamScreen} />
    </Tab.Navigator>
  );
}
