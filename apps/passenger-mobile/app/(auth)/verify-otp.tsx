import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '../../src/theme';
import { AppHeader, PrimaryButton } from '../../src/components';
import { useAuthStore } from '../../src/stores';
import { useTranslation } from '../../src/i18n';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { t } = useTranslation(['auth', 'validation', 'common']);
  const params = useLocalSearchParams();
  const phone = (params.phone as string) || '+251 91 123 4567';

  const { verifyOtp, isLoading } = useAuthStore();
  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(45);
  const [error, setError] = useState('');

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleVerify = async () => {
    if (code.length < 4) {
      setError(t('validation:otpIncomplete'));
      return;
    }

    setError('');
    const success = await verifyOtp(code);
    if (success) {
      router.replace('/(tabs)');
    } else {
      setError(t('invalidOtp'));
    }
  };

  const handleResend = () => {
    if (timer === 0) {
      setTimer(60);
      setError('');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('verifyTitle')} showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{t('verifyTitle')}</Text>
          <Text style={styles.subtitle}>
            {t('verifySubtitle', { phone })}
          </Text>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          {/* OTP Input Fields Representation */}
          <View style={styles.otpInputRow}>
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const char = code[index] || '';
              return (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    char ? styles.otpBoxFilled : null,
                    index === code.length ? styles.otpBoxActive : null,
                  ]}
                >
                  <Text style={styles.otpText}>{char}</Text>
                </View>
              );
            })}
          </View>

          {/* Hidden real input for keyboard support */}
          <TextInput
            value={code}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
              setCode(cleaned);
              setError('');
            }}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.hiddenInput}
            autoFocus
          />

          <View style={styles.resendRow}>
            {timer > 0 ? (
              <Text style={styles.timerText}>
                {t('resendIn', { seconds: timer })}
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendAction}>{t('resendCode')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <PrimaryButton
            title={t('verifyBtn')}
            onPress={handleVerify}
            loading={isLoading}
            disabled={code.length < 4}
            style={styles.verifyBtn}
          />
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
  phoneBold: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  errorBanner: {
    ...theme.typography.bodySmall,
    color: theme.colors.danger,
    backgroundColor: theme.colors.dangerLight,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
  },
  otpInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: theme.colors.primaryDark,
    backgroundColor: theme.colors.surface,
  },
  otpBoxFilled: {
    borderColor: theme.colors.primaryDark,
    backgroundColor: theme.colors.primaryLight,
  },
  otpText: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  resendRow: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  timerText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  timerBold: {
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
  resendAction: {
    ...theme.typography.bodyBold,
    color: theme.colors.primaryDark,
    textDecorationLine: 'underline',
  },
  verifyBtn: {
    marginTop: 'auto',
    marginBottom: theme.spacing.md,
  },
});
