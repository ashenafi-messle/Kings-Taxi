import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Car, Home, ListChecks, User, Wallet } from 'lucide-react-native';
import { Colors } from '../../src/theme/tokens';
import { useDriverStore } from '../../src/store/useDriverStore';

export default function TabsLayout() {
  const activeTrip = useDriverStore((s) => s.activeTrip);
  const insets = useSafeAreaInsets();

  // Respect Android gesture / 3-button navigation bar & iOS home indicator
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 10 : 8);
  const tabBarHeight = 56 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primaryBlack,
        tabBarInactiveTintColor: Colors.secondaryText,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: Colors.cardWhite,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: bottomInset,
          paddingTop: 6,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={Math.min(size, 22)} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          title: 'Rides',
          tabBarIcon: ({ color, size }) => <ListChecks size={Math.min(size, 22)} color={color} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarBadge: activeTrip ? 'LIVE' : undefined,
          tabBarBadgeStyle: {
            backgroundColor: Colors.primaryBlack,
            color: Colors.cardWhite,
            fontSize: 9,
            fontWeight: '800',
          },
          tabBarIcon: ({ color, size }) => <Car size={Math.min(size, 22)} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color, size }) => <Wallet size={Math.min(size, 22)} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={Math.min(size, 22)} color={color} />,
        }}
      />
    </Tabs>
  );
}
