import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, Lock, ShieldCheck, User } from 'lucide-react-native';
import { BRAND_LOGO_URL, CardShadow, Colors, Radius, Spacing } from '../../src/theme/tokens';
import { mockAuthenticateDriver } from '../../src/services/mockDriverService';
import { useDriverStore } from '../../src/store/useDriverStore';

export default function DriverLoginScreen() {
  const loginSuccess = useDriverStore((s) => s.loginSuccess);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (isLoading) return;
    setError('');

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      setError('Enter your registered email address or phone number.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await mockAuthenticateDriver(trimmedId, password);
      if (!result.success || !result.profile) {
        setError(result.error || 'Authentication failed.');
        return;
      }
      loginSuccess(result.profile, trimmedId);
    } catch {
      setError('Unable to sign in right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setIdentifier('abebe.kebede@kingstaxi.et');
    setPassword('Driver@2026');
    setError('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandSection}>
            <View style={styles.logoFrame}>
              <Image source={{ uri: BRAND_LOGO_URL }} style={styles.logoImage} resizeMode="cover" />
            </View>
            <Text style={styles.brandTitle}>KINGS TAXI</Text>
            <Text style={styles.brandSubtitle}>DRIVER PARTNER PORTAL</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Driver Sign In</Text>
            <Text style={styles.cardSubtitle}>
              Sign in with the email or phone number provisioned by Kings Taxi administration.
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email or Phone Number</Text>
              <View style={styles.inputWrap}>
                <User size={18} color={Colors.secondaryText} />
                <TextInput
                  style={styles.input}
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="driver@kingstaxi.et or +251 9..."
                  placeholderTextColor={Colors.metallicMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <Link href="/(auth)/forgot-password" asChild>
                  <Pressable hitSlop={8}>
                    <Text style={styles.forgotLink}>Forgot Password?</Text>
                  </Pressable>
                </Link>
              </View>
              <View style={styles.inputWrap}>
                <Lock size={18} color={Colors.secondaryText} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.metallicMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={10}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={Colors.secondaryText} />
                  ) : (
                    <Eye size={18} color={Colors.secondaryText} />
                  )}
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.loginBtn,
                isLoading && styles.loginBtnDisabled,
                pressed && !isLoading && styles.loginBtnPressed,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.cardWhite} size="small" />
              ) : (
                <Text style={styles.loginBtnText}>Sign In to Driver Dashboard</Text>
              )}
            </Pressable>

            <View style={styles.demoNotice}>
              <View style={styles.demoHeader}>
                <ShieldCheck size={15} color={Colors.primaryBlack} />
                <Text style={styles.demoTitle}>Phase 1 Mock Sign-In</Text>
              </View>
              <Text style={styles.demoBody}>
                Accounts are provisioned by Super Admin. Tap below to prefill the Phase 1 demo driver.
              </Text>
              <Pressable onPress={fillDemoCredentials} style={styles.demoFillBtn}>
                <Text style={styles.demoFillText}>Use Demo Driver (Abebe Kebede)</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.footerNote}>
            Kings Taxi Driver App • Phase 1 UI Preview
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.screenBg },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoFrame: {
    width: 78,
    height: 78,
    borderRadius: 20,
    backgroundColor: Colors.cardWhite,
    borderWidth: 2,
    borderColor: Colors.primarySilver,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...CardShadow,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
    color: Colors.primaryBlack,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: Colors.secondaryText,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    ...CardShadow,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primaryBlack,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.secondaryText,
    marginTop: 4,
    marginBottom: Spacing.xl,
  },
  errorBox: {
    backgroundColor: Colors.errorBg,
    borderWidth: 1,
    borderColor: '#F5C2C2',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryBlack,
    marginBottom: 6,
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondaryText,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.screenBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.primaryBlack,
    fontWeight: '500',
  },
  loginBtn: {
    backgroundColor: Colors.primaryBlack,
    borderRadius: Radius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnPressed: {
    opacity: 0.9,
  },
  loginBtnText: {
    color: Colors.cardWhite,
    fontSize: 15,
    fontWeight: '700',
  },
  demoNotice: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.screenBg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryBlack,
  },
  demoBody: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.secondaryText,
    marginBottom: Spacing.sm,
  },
  demoFillBtn: {
    backgroundColor: Colors.lightSilver,
    borderRadius: Radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  demoFillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryBlack,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: Spacing.xl,
  },
});
