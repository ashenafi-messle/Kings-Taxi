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
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Check,
  Circle,
  Globe,
  ShieldCheck,
  Lock,
} from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import {
  KingsTaxiLogo,
  PasswordInput,
  PrimaryButton,
  LanguageSelectorModal,
} from '../../src/components';
import { useAuthStore, useSettingsStore } from '../../src/stores';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../src/i18n';

export default function SetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation(['auth', 'validation', 'common']);
  const params = useLocalSearchParams();

  const sessionId = (params.sessionId as string) || '';
  const registrationToken = (params.registrationToken as string) || '';
  const method = (params.method as string) || 'email';
  const identifier = (params.identifier as string) || '';
  const fullName = (params.fullName as string) || '';

  const { completeRegistrationWithPassword, isLoading } = useAuthStore();
  const { language } = useSettingsStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);

  const currentLangLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeName || 'English';

  // Real-time Requirements Validation
  const hasMinChars = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid =
    hasMinChars &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecial &&
    passwordsMatch;

  const handleSavePassword = async () => {
    if (!hasMinChars || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      setError(t('validation:passwordTooShort'));
      return;
    }
    if (!passwordsMatch) {
      setError(t('validation:passwordsMustMatch'));
      return;
    }

    setError('');
    const response = await completeRegistrationWithPassword(
      sessionId,
      registrationToken,
      password
    );

    if (response.success && response.data) {
      setSuccessToast(true);
      // Brief celebration pause before navigating home
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 900);
    } else {
      setError(response.error || 'Failed to complete registration');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={colors.dark} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.langPill}
          onPress={() => setLangModalVisible(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Change language. Current: ${currentLangLabel}`}
        >
          <Globe size={14} color={colors.deepGold} />
          <Text style={styles.langPillText}>{currentLangLabel}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Representation */}
          <View style={styles.logoContainer}>
            <KingsTaxiLogo variant="full" showTagline={false} showText={true} />
          </View>

          {/* Form Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('setPasswordTitle')}</Text>
            <Text style={styles.subtitle}>{t('setPasswordSubtitle')}</Text>
          </View>

          {/* Success Banner */}
          {successToast ? (
            <View style={styles.successBanner}>
              <ShieldCheck size={20} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.successTitle}>{t('registrationSuccessTitle')}</Text>
                <Text style={styles.successDesc}>{t('registrationSuccessDesc')}</Text>
              </View>
            </View>
          ) : null}

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* Form Fields */}
          <View style={styles.form}>
            <PasswordInput
              label={t('newPasswordLabel')}
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError('');
              }}
              isNewPassword
              showStrengthMeter
            />

            <PasswordInput
              label={t('confirmPasswordLabel')}
              placeholder={t('confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setError('');
              }}
              isNewPassword
            />

            {/* Password Requirements Checklist */}
            <View style={styles.checklistCard}>
              <Text style={styles.checklistHeading}>PASSWORD REQUIREMENTS</Text>

              <View style={styles.checkItem}>
                {hasMinChars ? (
                  <View style={styles.checkIconFilled}>
                    <Check size={11} color={colors.white} strokeWidth={3} />
                  </View>
                ) : (
                  <Circle size={14} color={colors.textLight} />
                )}
                <Text style={[styles.checkText, hasMinChars && styles.checkTextActive]}>
                  {t('reqMinChars')}
                </Text>
              </View>

              <View style={styles.checkItem}>
                {hasUppercase ? (
                  <View style={styles.checkIconFilled}>
                    <Check size={11} color={colors.white} strokeWidth={3} />
                  </View>
                ) : (
                  <Circle size={14} color={colors.textLight} />
                )}
                <Text style={[styles.checkText, hasUppercase && styles.checkTextActive]}>
                  {t('reqUppercase')}
                </Text>
              </View>

              <View style={styles.checkItem}>
                {hasLowercase ? (
                  <View style={styles.checkIconFilled}>
                    <Check size={11} color={colors.white} strokeWidth={3} />
                  </View>
                ) : (
                  <Circle size={14} color={colors.textLight} />
                )}
                <Text style={[styles.checkText, hasLowercase && styles.checkTextActive]}>
                  {t('reqLowercase')}
                </Text>
              </View>

              <View style={styles.checkItem}>
                {hasNumber ? (
                  <View style={styles.checkIconFilled}>
                    <Check size={11} color={colors.white} strokeWidth={3} />
                  </View>
                ) : (
                  <Circle size={14} color={colors.textLight} />
                )}
                <Text style={[styles.checkText, hasNumber && styles.checkTextActive]}>
                  {t('reqNumber')}
                </Text>
              </View>

              <View style={styles.checkItem}>
                {hasSpecial ? (
                  <View style={styles.checkIconFilled}>
                    <Check size={11} color={colors.white} strokeWidth={3} />
                  </View>
                ) : (
                  <Circle size={14} color={colors.textLight} />
                )}
                <Text style={[styles.checkText, hasSpecial && styles.checkTextActive]}>
                  {t('reqSpecial')}
                </Text>
              </View>

              {confirmPassword.length > 0 && (
                <View style={styles.checkItem}>
                  {passwordsMatch ? (
                    <View style={styles.checkIconFilled}>
                      <Check size={11} color={colors.white} strokeWidth={3} />
                    </View>
                  ) : (
                    <Circle size={14} color={colors.error} />
                  )}
                  <Text
                    style={[
                      styles.checkText,
                      passwordsMatch ? styles.checkTextActive : { color: colors.error },
                    ]}
                  >
                    {passwordsMatch ? t('passwordsMatch') : t('validation:passwordsMustMatch')}
                  </Text>
                </View>
              )}
            </View>

            {/* Save Password CTA */}
            <PrimaryButton
              title={t('savePasswordBtn')}
              onPress={handleSavePassword}
              loading={isLoading}
              disabled={!isFormValid}
              style={styles.saveBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Language Modal */}
      <LanguageSelectorModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.lightGold,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.champagne,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.deepGold,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.dark,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 18,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  successDesc: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  errorBanner: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FEE2E2',
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 420,
  },
  checklistCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 24,
    gap: 8,
  },
  checklistHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.secondaryText,
    marginBottom: 4,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkIconFilled: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: 12.5,
    color: colors.secondaryText,
  },
  checkTextActive: {
    color: colors.dark,
    fontWeight: '600',
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
  },
});

