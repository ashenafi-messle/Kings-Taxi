import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Phone } from 'lucide-react-native';
import { theme } from '../../src/theme';
import { AppHeader, FormInput, PrimaryButton } from '../../src/components';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!phone || phone.length < 9) {
      setError('Please enter your registered phone number');
      return;
    }
    setError('');
    setSubmitted(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Reset Password" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Password Recovery</Text>
          <Text style={styles.subtitle}>
            Enter your Ethiopian phone number to receive a secure recovery code via SMS.
          </Text>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          {submitted ? (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>Recovery SMS Dispatched</Text>
              <Text style={styles.successText}>
                We have sent an authentication link to {phone}. Please check your messages.
              </Text>
              <PrimaryButton
                title="Return to Sign In"
                onPress={() => router.replace('/(auth)/login')}
                style={styles.returnBtn}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <FormInput
                label="Registered Phone Number"
                placeholder="+251 9X XXX XXXX"
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  setError('');
                }}
                keyboardType="phone-pad"
                leftIcon={<Phone size={20} color={theme.colors.textMuted} />}
              />

              <PrimaryButton
                title="Send Recovery Code"
                onPress={handleSubmit}
                style={styles.submitBtn}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    flex: 1,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xl,
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
    marginTop: theme.spacing.md,
  },
  submitBtn: {
    marginTop: theme.spacing.md,
  },
  successBox: {
    backgroundColor: theme.colors.successLight,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  successTitle: {
    ...theme.typography.h3,
    color: theme.colors.success,
    marginBottom: theme.spacing.xs,
  },
  successText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  returnBtn: {
    width: '100%',
  },
});
