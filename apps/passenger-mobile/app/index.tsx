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
  const { loadInitialAuth } = useAuthStore();

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        // Securely restore passenger session tokens from SecureStore
        await loadInitialAuth();
      } catch (err) {
        console.warn('Startup session initialization warning:', err);
      }

      if (isMounted) {
        // Always present official landing page on startup & restart
        router.replace('/(auth)/welcome');
      }
    };

    const timeout = setTimeout(initializeApp, 150);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [loadInitialAuth, router]);

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
