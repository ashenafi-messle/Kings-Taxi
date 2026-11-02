import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Phone, Lock, Smartphone } from 'lucide-react-native';
import { theme } from '../../src/theme';
import { AppHeader, FormInput, PrimaryButton, SecondaryButton } from '../../src/components';
import { useAuthStore } from '../../src/stores';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

  const [phone, setPhone] = useState('+251911234567');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!phone || phone.length < 9) {
      setError('Please enter a valid Ethiopian phone number (e.g., +251 91 123 4567)');
      return;
    }
    setError('');
    const success = await login(phone, password);
    if (success) {
      router.replace('/(tabs)');
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  const handleRequestOtp = () => {
    if (!phone || phone.length < 9) {
      setError('Please enter your phone number to receive OTP');
      return;
    }
    router.push({
      pathname: '/(auth)/verify-otp',
      params: { phone },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Sign In" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to manage your rides, hotels, and tour contracts.
            </Text>
          </View>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <View style={styles.form}>
            <FormInput
              label="Ethiopian Phone Number"
              placeholder="+251 9X XXX XXXX"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                setError('');
              }}
              keyboardType="phone-pad"
              leftIcon={<Phone size={20} color={theme.colors.textMuted} />}
            />

            <FormInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError('');
              }}
              isPassword
              leftIcon={<Lock size={20} color={theme.colors.textMuted} />}
            />

            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotBtn}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <PrimaryButton
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              style={styles.signInBtn}
            />

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.divider} />
            </View>

            <SecondaryButton
              title="Sign In with SMS / OTP"
              onPress={handleRequestOtp}
              icon={<Smartphone size={18} color={theme.colors.text} />}
              style={styles.otpBtn}
            />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.signUpLink}> Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  welcomeTitle: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  errorBanner: {
    ...theme.typography.bodySmall,
    color: theme.colors.danger,
    backgroundColor: theme.colors.dangerLight,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.md,
  },
  forgotText: {
    ...theme.typography.captionBold,
    color: theme.colors.primaryDark,
  },
  signInBtn: {
    marginBottom: theme.spacing.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  orText: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
    marginHorizontal: theme.spacing.md,
  },
  otpBtn: {
    marginBottom: theme.spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  footerText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  signUpLink: {
    ...theme.typography.bodyBold,
    color: theme.colors.primaryDark,
  },
});
