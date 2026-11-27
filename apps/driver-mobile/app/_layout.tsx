import React, { useEffect } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDriverStore } from '../src/store/useDriverStore';
import { Colors } from '../src/theme/tokens';

export default function RootLayout() {
  const isAuthenticated = useDriverStore((s) => s.auth.isAuthenticated);
  const isRestoringSession = useDriverStore((s) => s.isRestoringSession);
  const restoreSession = useDriverStore((s) => s.restoreSession);
  const connectRealtime = useDriverStore((s) => s.connectRealtime);
  const disconnectRealtime = useDriverStore((s) => s.disconnectRealtime);
  const syncDriverState = useDriverStore((s) => s.syncDriverState);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectRealtime();
      return;
    }

    void syncDriverState();
    void connectRealtime();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void syncDriverState();
      }
    });

    return () => {
      sub.remove();
    };
  }, [isAuthenticated, connectRealtime, disconnectRealtime, syncDriverState]);

  useEffect(() => {
    if (isRestoringSession) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isRestoringSession, segments, router]);

  if (isRestoringSession) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={Colors.screenBg} />
        <View style={styles.splash}>
          <ActivityIndicator size="large" color={Colors.primaryBlack} />
          <Text style={styles.splashText}>Verifying Driver Session...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

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

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  splashText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondaryText,
  },
});
