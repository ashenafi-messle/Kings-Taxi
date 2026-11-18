import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  Hotel,
  Compass,
  CalendarDays,
  User,
  Bell,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import { useTranslation } from '../../src/i18n';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useTranslation(['navigation']);

  // Responsive device width breakpoint (small screens e.g., 320-359px)
  const isSmallScreen = width < 360;

  // Base inner height accommodating icon (20-22px) + label (12px) + vertical gaps (12-14px)
  const baseContentHeight = isSmallScreen ? 50 : 54;

  // Safe area bottom handling
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 8 : 6);
  const totalBarHeight = baseContentHeight + bottomInset;

  // Responsive icon size
  const iconSize = isSmallScreen ? 19 : 21;

  return (
    <View style={styles.tabLayoutWrapper}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { flex: 1, backgroundColor: theme.colors.background },
          tabBarActiveTintColor: theme.colors.antiqueGold,
          tabBarInactiveTintColor: theme.colors.deepChocolate,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            backgroundColor: '#FFFDF7',
            borderTopColor: '#D4A63C',
            borderTopWidth: 1.5,
            height: totalBarHeight,
            paddingTop: 4,
            paddingBottom: bottomInset,
            paddingHorizontal: 0,
            width: '100%',
            ...theme.shadows.cardGold,
          },
        tabBarItemStyle: {
          flex: 1,
          minWidth: 0,
          paddingVertical: 2,
          paddingHorizontal: 0,
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabBarLabelStyle: {
          fontSize: isSmallScreen ? 10 : 11,
          fontWeight: '700',
          marginTop: 1,
          marginBottom: 1,
          textAlign: 'center',
          letterSpacing: -0.1,
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarAccessibilityLabel: t('tabs.homeA11y'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconPill : styles.inactiveIconPill}>
              <Home
                size={iconSize}
                color={focused ? theme.colors.antiqueGold : theme.colors.deepChocolate}
                strokeWidth={focused ? 2.4 : 1.8}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="hotels"
        options={{
          title: t('tabs.hotels'),
          tabBarAccessibilityLabel: t('tabs.hotelsA11y'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconPill : styles.inactiveIconPill}>
              <Hotel
                size={iconSize}
                color={focused ? theme.colors.antiqueGold : theme.colors.deepChocolate}
                strokeWidth={focused ? 2.4 : 1.8}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.explore'),
          tabBarAccessibilityLabel: t('tabs.exploreA11y'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconPill : styles.inactiveIconPill}>
              <Compass
                size={iconSize}
                color={focused ? theme.colors.antiqueGold : theme.colors.deepChocolate}
                strokeWidth={focused ? 2.4 : 1.8}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('tabs.bookings'),
          tabBarAccessibilityLabel: t('tabs.bookingsA11y'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconPill : styles.inactiveIconPill}>
              <CalendarDays
                size={iconSize}
                color={focused ? theme.colors.antiqueGold : theme.colors.deepChocolate}
                strokeWidth={focused ? 2.4 : 1.8}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarAccessibilityLabel: t('tabs.profileA11y'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconPill : styles.inactiveIconPill}>
              <User
                size={iconSize}
                color={focused ? theme.colors.antiqueGold : theme.colors.deepChocolate}
                strokeWidth={focused ? 2.4 : 1.8}
              />
            </View>
          ),
        }}
      />
      {/* Hidden route: keeps notifications accessible without adding a 6th icon to the bottom bar */}
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          title: 'Alerts',
        }}
      />
    </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  tabLayoutWrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  activeIconPill: {
    backgroundColor: '#FAF2D3',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDD987',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveIconPill: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
