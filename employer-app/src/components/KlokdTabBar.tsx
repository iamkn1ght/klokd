/**
 * KlokdTabBar — custom bottom tab bar shared by worker + employer apps.
 *
 * Design intent: the bar should have presence (not a hairline default),
 * the active tab should be unmistakable (electric icon + label + dot),
 * and every tap should physically respond (scale 0.9 on press-in).
 * Safe-area aware — sits above the home indicator, never under it.
 */
import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { EASE } from './KlokdLayout';
import { colors } from '../theme';

function TabItem({
  label,
  focused,
  icon,
  onPress,
}: {
  label: string;
  focused: boolean;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const dot = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(dot, { toValue: focused ? 1 : 0, duration: 220, easing: EASE, useNativeDriver: true }).start();
  }, [focused, dot]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.timing(scale, { toValue: 0.9, duration: 100, easing: EASE, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, stiffness: 340, damping: 20, mass: 0.6, useNativeDriver: true }).start()}
      style={styles.item}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.itemInner, { transform: [{ scale }] }]}>
        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>{icon}</View>
        <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
        <Animated.View
          style={[
            styles.dot,
            {
              opacity: dot,
              transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

export function KlokdTabBar({
  state,
  descriptors,
  navigation,
  renderIcon,
}: BottomTabBarProps & {
  renderIcon: (routeName: string, focused: boolean) => React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = (options.tabBarLabel as string) ?? options.title ?? route.name;
        const focused = state.index === index;
        return (
          <TabItem
            key={route.key}
            label={label}
            focused={focused}
            icon={renderIcon(route.name, focused)}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(13,13,20,0.98)',
    borderTopWidth: 1,
    borderTopColor: colors.white08,
    paddingTop: 10,
    paddingHorizontal: 8,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(20px)' } as any) : {}),
  },
  item: { flex: 1, alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  itemInner: { alignItems: 'center', gap: 3 },
  iconWrap: {
    width: 40,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: 'rgba(0,229,160,0.12)' },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.1, color: colors.white45 },
  labelActive: { color: colors.electric, fontWeight: '800' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.electric, marginTop: 1 },
});
