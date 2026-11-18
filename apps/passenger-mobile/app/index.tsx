import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/stores';
import { colors } from '../src/theme/colors';

/**
 * Root Application Entrypoint
 *
 * Enforces startup requirement: On fresh launch or restart, the app
 * always initializes sessions and presents the official Kings Taxi
 * landing / welcome page. Existing authentication sessions remain
 * securely preserved in SecureStore without auto-bypassing the landing screen.
 */
export default function IndexScreen() {
  const router = useRouter();
  const { loadInitialAuth, isSessionReady, isAuthenticated, token, user } = useAuthStore();

  useEffect(() => {
    loadInitialAuth();
  }, [loadInitialAuth]);

  useEffect(() => {
    if (isSessionReady) {
      if (isAuthenticated && token && user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/welcome');
      }
    }
  }, [isSessionReady, isAuthenticated, token, user, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primaryGold} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
