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
import { useTranslation } from '../../src/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation(['auth', 'validation', 'common']);
  const { login, isLoading } = useAuthStore();

  const [phone, setPhone] = useState('+251911234567');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!phone || phone.length < 9) {
      setError(t('validation:phoneInvalid'));
      return;
    }
    setError('');
    const success = await login(phone, password);
    if (success) {
      router.replace('/(tabs)');
    } else {
      setError(t('validation:passwordRequired'));
    }
  };

  const handleRequestOtp = () => {
    if (!phone || phone.length < 9) {
      setError(t('validation:phoneRequired'));
      return;
    }
    router.push({
      pathname: '/(auth)/verify-otp',
      params: { phone },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('signInBtn')} showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.welcomeTitle}>{t('loginTitle')}</Text>
            <Text style={styles.subtitle}>
              {t('loginSubtitle')}
            </Text>
          </View>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

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

            <FormInput
              label={t('passwordLabel')}
              placeholder={t('passwordPlaceholder')}
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
              <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
            </TouchableOpacity>

            <PrimaryButton
              title={t('signInBtn')}
              onPress={handleLogin}
              loading={isLoading}
              style={styles.signInBtn}
            />

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.orText}>-</Text>
              <View style={styles.divider} />
            </View>

            <SecondaryButton
              title={t('verifyTitle')}
              onPress={handleRequestOtp}
              icon={<Smartphone size={18} color={theme.colors.text} />}
              style={styles.otpBtn}
            />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>{t('noAccount')}</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.signUpLink}> {t('registerHere')}</Text>
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
