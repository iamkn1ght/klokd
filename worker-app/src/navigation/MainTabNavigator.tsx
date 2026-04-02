import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/main/HomeScreen';
import { ShiftsScreen } from '../screens/main/ShiftsScreen';
import { PayScreen } from '../screens/main/PayScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { colors, typography } from '../theme';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '⌂',
    Shifts: '☐',
    Pay: '○',
    Me: '●',
  };
  return (
    <View style={styles.tabIcon}>
      {focused && <View style={styles.activeIndicator} />}
      <Text style={[styles.iconText, focused && styles.iconActive]}>{icons[label] || '·'}</Text>
    </View>
  );
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.electric,
        tabBarInactiveTintColor: colors.white42,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Shifts" component={ShiftsScreen} />
      <Tab.Screen name="Pay" component={PayScreen} />
      <Tab.Screen name="Me" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.ink,
    borderTopWidth: 0.5,
    borderTopColor: colors.white10,
    paddingTop: 6,
    height: 56,
  },
  tabLabel: {
    fontSize: 8,
    fontWeight: '500',
  },
  tabIcon: {
    alignItems: 'center',
  },
  activeIndicator: {
    width: 18,
    height: 2,
    backgroundColor: colors.electric,
    borderRadius: 999,
    marginBottom: 3,
  },
  iconText: {
    fontSize: 14,
    color: colors.white42,
  },
  iconActive: {
    color: colors.electric,
  },
});
