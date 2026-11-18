import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AlertTriangle, Home, RefreshCw, LogIn } from 'lucide-react-native';
import { theme } from '../../theme';
import { KingsTaxiLogo } from '../branding/KingsTaxiLogo';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[KingsTaxiErrorBoundary] Uncaught React Error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      try {
        router.replace('/(tabs)');
      } catch {
        // Fallback
      }
    }
  };

  public handleSignIn = () => {
    this.setState({ hasError: false, error: null });
    try {
      router.replace('/(auth)/welcome');
    } catch {
      // Fallback
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFDF7" />
          <View style={styles.content}>
            {/* Brand Logo Header */}
            <View style={styles.logoWrap}>
              <KingsTaxiLogo variant="full" showTagline={true} showText={true} scale={0.85} />
            </View>

            {/* Error Card */}
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <AlertTriangle size={32} color={theme.colors.antiqueGold} />
              </View>

              <Text style={styles.title}>Display Recovery</Text>
              <Text style={styles.subtitle}>
                Kings Taxi encountered an unexpected display issue. Your account and trip data
                remain completely secure.
              </Text>

              {__DEV__ && this.state.error?.message && (
                <View style={styles.devErrorBox}>
                  <Text style={styles.devErrorText} numberOfLines={3}>
                    {this.state.error.message}
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={this.handleReset}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Return to main screen"
                >
                  <RefreshCw size={18} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Reload Home</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={this.handleSignIn}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Go to Welcome screen"
                >
                  <LogIn size={18} color={theme.colors.deepChocolate} />
                  <Text style={styles.secondaryBtnText}>Welcome Screen</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF5EE',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoWrap: {
    marginBottom: 24,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFDF7',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#D4A63C',
    alignItems: 'center',
    shadowColor: '#502D0A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FAF2D3',
    borderWidth: 1.5,
    borderColor: '#EDD987',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.deepChocolate,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    color: theme.colors.deepChocolateLight,
    textAlign: 'center',
    marginBottom: 20,
  },
  devErrorBox: {
    width: '100%',
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  devErrorText: {
    fontSize: 11,
    color: '#991B1B',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.antiqueGold,
    borderRadius: 14,
    height: 48,
    width: '100%',
    borderWidth: 1,
    borderColor: '#D4A63C',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FAF2D3',
    borderRadius: 14,
    height: 46,
    width: '100%',
    borderWidth: 1,
    borderColor: '#EDD987',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.deepChocolate,
  },
});
