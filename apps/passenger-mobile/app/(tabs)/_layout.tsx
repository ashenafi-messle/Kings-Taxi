import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, useWindowDimensions } from 'react-native';
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
  const baseContentHeight = isSmallScreen ? 48 : 52;

  // Safe area bottom handling:
  // On iPhones with home indicator, insets.bottom is typically 34px.
  // On Android with gesture nav, insets.bottom is typically 16-24px.
  // On devices where insets.bottom is 0 (desktop/3-button Android), provide a 6-8px breathing margin.
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 8 : 6);
  const totalBarHeight = baseContentHeight + bottomInset;

  // Responsive icon size
  const iconSize = isSmallScreen ? 20 : 22;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primaryDark,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: StyleSheet.hairlineWidth * 1.5,
          height: totalBarHeight,
          paddingTop: 5,
          paddingBottom: bottomInset,
          paddingHorizontal: 0,
          width: '100%',
          ...theme.shadows.subtle,
        },
        tabBarItemStyle: {
          flex: 1,
          minWidth: 0, // Critical: prevents flexbox overflow on narrow 320px screens
          paddingVertical: 2,
          paddingHorizontal: 0,
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabBarLabelStyle: {
          fontSize: isSmallScreen ? 10 : 11,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 1,
          textAlign: 'center',
          letterSpacing: -0.2,
        },
        tabBarIconStyle: {
          marginTop: 1,
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
            <Home
              size={iconSize}
              color={color}
              strokeWidth={focused ? 2.4 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="hotels"
        options={{
          title: t('tabs.hotels'),
          tabBarAccessibilityLabel: t('tabs.hotelsA11y'),
          tabBarIcon: ({ color, focused }) => (
            <Hotel
              size={iconSize}
              color={color}
              strokeWidth={focused ? 2.4 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.explore'),
          tabBarAccessibilityLabel: t('tabs.exploreA11y'),
          tabBarIcon: ({ color, focused }) => (
            <Compass
              size={iconSize}
              color={color}
              strokeWidth={focused ? 2.4 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('tabs.bookings'),
          tabBarAccessibilityLabel: t('tabs.bookingsA11y'),
          tabBarIcon: ({ color, focused }) => (
            <CalendarDays
              size={iconSize}
              color={color}
              strokeWidth={focused ? 2.4 : 1.8}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarAccessibilityLabel: t('tabs.profileA11y'),
          tabBarIcon: ({ color, focused }) => (
            <User
              size={iconSize}
              color={color}
              strokeWidth={focused ? 2.4 : 1.8}
            />
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
  );
}
