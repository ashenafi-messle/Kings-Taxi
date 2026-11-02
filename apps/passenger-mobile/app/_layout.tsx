import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '../src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" backgroundColor={theme.colors.surface} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="rides/book"
            options={{ presentation: 'card', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="rides/active"
            options={{ presentation: 'card', animation: 'fade' }}
          />
          <Stack.Screen
            name="rides/receipt"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="hotels/[id]"
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="hotels/reserve"
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="heritage/[id]"
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="tours/contract-builder"
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="payments/checkout"
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="support/index"
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="settings/language"
            options={{ presentation: 'card' }}
          />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
