import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDriverStore } from '../src/store/useDriverStore';
import { Colors } from '../src/theme/tokens';

export default function RootLayout() {
  const isAuthenticated = useDriverStore((s) => s.auth.isAuthenticated);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, router]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={Colors.screenBg} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.screenBg },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="ride/[id]"
          options={{
            headerShown: true,
            title: 'Ride Details',
            headerStyle: { backgroundColor: Colors.cardWhite },
            headerTintColor: Colors.primaryBlack,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="checkout/[id]"
          options={{
            headerShown: true,
            title: 'Trip Checkout',
            headerStyle: { backgroundColor: Colors.cardWhite },
            headerTintColor: Colors.primaryBlack,
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
