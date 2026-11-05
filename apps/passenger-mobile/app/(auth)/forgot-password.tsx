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
import { useTranslation } from '../../src/i18n';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation(['auth', 'validation', 'common']);
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!phone || phone.length < 9) {
      setError(t('validation:phoneRequired'));
      return;
    }
    setError('');
    setSubmitted(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('forgotTitle')} showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{t('forgotTitle')}</Text>
          <Text style={styles.subtitle}>
            {t('forgotSubtitle')}
          </Text>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          {submitted ? (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>{t('resetSent')}</Text>
              <Text style={styles.successText}>
                {t('verifySubtitle', { phone })}
              </Text>
              <PrimaryButton
                title={t('backToLogin')}
                onPress={() => router.replace('/(auth)/login')}
                style={styles.returnBtn}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <FormInput
                label={t('phoneLabel')}
                placeholder={t('phonePlaceholder')}
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  setError('');
                }}
                keyboardType="phone-pad"
                leftIcon={<Phone size={20} color={theme.colors.textMuted} />}
              />

              <PrimaryButton
                title={t('sendResetLink')}
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
