import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../screens/main/DashboardScreen';
import { ShiftsScreen } from '../screens/main/ShiftsScreen';
import { PayScreen } from '../screens/main/PayScreen';
import { TeamScreen } from '../screens/main/TeamScreen';
import { Icons } from '../components/Icons';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const color = focused ? colors.electric : colors.white40;
  switch (name) {
    case 'Home': return <Icons.home color={color} size={20} />;
    case 'Shifts': return <Icons.calendar color={color} size={20} />;
    case 'Pay': return <Icons.wallet color={color} size={20} />;
    case 'Team': return <Icons.user color={color} size={20} />;
    default: return null;
  }
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.electric,
        tabBarInactiveTintColor: colors.white40,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="Shifts" component={ShiftsScreen} />
      <Tab.Screen name="Pay" component={PayScreen} />
      <Tab.Screen name="Team" component={TeamScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(10,10,15,0.95)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.white06,
    height: 64,
    paddingTop: 6,
  },
  tabLabel: { fontSize: 10, fontWeight: '500', letterSpacing: 0.2 },
});
