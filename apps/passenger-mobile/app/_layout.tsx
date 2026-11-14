import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '../src/theme';
import { useSettingsStore } from '../src/stores';
import '../src/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function RootLayout() {
  const initSettings = useSettingsStore((state) => state.initSettings);

  useEffect(() => {
    initSettings().catch((err) => {
      console.warn('Failed to restore language settings:', err);
    });
  }, [initSettings]);

  // Web accessibility focus guard: prevents "Blocked aria-hidden on an element because its descendant retained focus"
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      const handleBlurHidden = () => {
        if (document.activeElement && document.activeElement instanceof HTMLElement) {
          if (document.activeElement.closest('[aria-hidden="true"]')) {
            document.activeElement.blur();
          }
        }
      };

      window.addEventListener('popstate', handleBlurHidden);
      window.addEventListener('hashchange', handleBlurHidden);

      let observer: MutationObserver | null = null;
      try {
        observer = new MutationObserver(() => {
          handleBlurHidden();
        });
        observer.observe(document.body, {
          attributes: true,
          subtree: true,
          attributeFilter: ['aria-hidden'],
        });
      } catch {}

      return () => {
        window.removeEventListener('popstate', handleBlurHidden);
        window.removeEventListener('hashchange', handleBlurHidden);
        if (observer) observer.disconnect();
      };
    }
  }, []);
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
            name="payments/checkout"
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="payments/callback"
            options={{ presentation: 'modal', animation: 'fade' }}
          />
          <Stack.Screen
            name="support/index"
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="support/create"
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="support/[id]"
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="legal/terms"
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="legal/privacy"
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="settings/language"
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="profile/about"
            options={{ presentation: 'card', animation: 'slide_from_right' }}
          />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
