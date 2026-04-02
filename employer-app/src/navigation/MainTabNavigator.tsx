import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../screens/main/DashboardScreen';
import { ShiftsScreen } from '../screens/main/ShiftsScreen';
import { PayScreen } from '../screens/main/PayScreen';
import { TeamScreen } from '../screens/main/TeamScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={styles.tabIcon}>
      {focused && <View style={styles.activeIndicator} />}
    </View>
  );
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.mid,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Shifts" component={ShiftsScreen} />
      <Tab.Screen name="Pay" component={PayScreen} />
      <Tab.Screen name="Team" component={TeamScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.mist,
    borderTopWidth: 0.5,
    borderTopColor: colors.soft,
    paddingTop: 6,
    height: 56,
  },
  tabLabel: { fontSize: 8, fontWeight: '500' },
  tabIcon: { alignItems: 'center' },
  activeIndicator: { width: 18, height: 2, backgroundColor: colors.ink, borderRadius: 999, marginBottom: 3 },
});
