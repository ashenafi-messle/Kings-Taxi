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
import { User, Phone, Mail, Lock } from 'lucide-react-native';
import { theme } from '../../src/theme';
import { AppHeader, FormInput, PrimaryButton } from '../../src/components';
import { useAuthStore } from '../../src/stores';

export default function RegisterScreen() {
  const router = useRouter();
  const { isLoading } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!phone || phone.length < 9) {
      setError('Please enter a valid Ethiopian phone number (+251)');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    // Route to OTP verification with registration payload
    router.push({
      pathname: '/(auth)/verify-otp',
      params: { phone, fullName, email },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Create Account" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Join Kings Taxi</Text>
            <Text style={styles.subtitle}>
              Experience seamless urban rides, hotels, and Ethiopian heritage tours.
            </Text>
          </View>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <View style={styles.form}>
            <FormInput
              label="Full Name"
              placeholder="e.g. Almaz Bekele"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                setError('');
              }}
              leftIcon={<User size={20} color={theme.colors.textMuted} />}
            />

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
              label="Email Address (Optional)"
              placeholder="almaz@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={20} color={theme.colors.textMuted} />}
            />

            <FormInput
              label="Create Password"
              placeholder="Minimum 6 characters"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError('');
              }}
              isPassword
              leftIcon={<Lock size={20} color={theme.colors.textMuted} />}
            />

            <Text style={styles.termsText}>
              By registering, you agree to Kings Taxi’s{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>

            <PrimaryButton
              title="Continue to Verification"
              onPress={handleRegister}
              loading={isLoading}
              style={styles.continueBtn}
            />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already registered?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.signInLink}> Sign In</Text>
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
  title: {
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
  termsText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginVertical: theme.spacing.md,
    lineHeight: 18,
  },
  termsLink: {
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
  continueBtn: {
    marginTop: theme.spacing.sm,
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
  signInLink: {
    ...theme.typography.bodyBold,
    color: theme.colors.primaryDark,
  },
});
