import React from 'react';
import { Tabs } from 'expo-router';
import { Car, Home, ListChecks, User, Wallet } from 'lucide-react-native';
import { Colors } from '../../src/theme/tokens';
import { useDriverStore } from '../../src/store/useDriverStore';

export default function TabsLayout() {
  const activeTrip = useDriverStore((s) => s.activeTrip);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primaryBlack,
        tabBarInactiveTintColor: Colors.secondaryText,
        tabBarStyle: {
          backgroundColor: Colors.cardWhite,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
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
          tabBarIcon: ({ color, size }) => <Home size={size - 1} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          title: 'Rides',
          tabBarIcon: ({ color, size }) => <ListChecks size={size - 1} color={color} />,
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
          tabBarIcon: ({ color, size }) => <Car size={size - 1} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color, size }) => <Wallet size={size - 1} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size - 1} color={color} />,
        }}
      />
    </Tabs>
  );
}
