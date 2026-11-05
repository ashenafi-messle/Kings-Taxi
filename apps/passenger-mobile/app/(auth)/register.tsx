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
import { useRouter } from 'expo-router';
import { User, Phone, Mail, ArrowLeft, Globe, Check } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import {
  KingsTaxiLogo,
  FormInput,
  PasswordInput,
  TelegramAuthButton,
  PrimaryButton,
  LanguageSelectorModal,
} from '../../src/components';
import { useAuthStore, useSettingsStore } from '../../src/stores';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../src/i18n';

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation(['auth', 'validation', 'common']);
  const { register, loginWithTelegram, isLoading } = useAuthStore();
  const { language } = useSettingsStore();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+251911234567');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState('');
  const [langModalVisible, setLangModalVisible] = useState(false);

  const currentLangLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeName || 'English';

  const validateEmail = (val: string) => {
    if (!val) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val.trim());
  };

  const handleRegister = async () => {
    if (!fullName.trim()) {
      setError(t('validation:nameRequired'));
      return;
    }
    if (!phone || phone.length < 9) {
      setError(t('validation:phoneInvalid'));
      return;
    }
    if (!email.trim()) {
      setError(t('validation:emailRequired'));
      return;
    }
    if (!validateEmail(email)) {
      setError(t('validation:emailInvalid'));
      return;
    }
    if (password.length < 6) {
      setError(t('validation:passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('validation:passwordsMustMatch'));
      return;
    }
    if (!agreeTerms) {
      setError(t('validation:mustAgreeTerms'));
      return;
    }

    setError('');
    const success = await register({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
    });

    if (success) {
      // Route to verify OTP for phone verification
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phone, fullName, email },
      });
    }
  };

  const handleTelegramRegister = async () => {
    setError('');
    const success = await loginWithTelegram();
    if (success) {
      router.replace('/(tabs)');
    } else {
      setError(t('auth:telegramNotice'));
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
          {/* Logo Presentation */}
          <View style={styles.logoContainer}>
            <KingsTaxiLogo variant="full" showTagline showText />
          </View>

          {/* Form Header */}
          <View style={styles.formHeader}>
            <Text style={styles.title}>{t('registerTitle')}</Text>
            <Text style={styles.subtitle}>{t('registerSubtitle')}</Text>
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* Registration Form */}
          <View style={styles.form}>
            <FormInput
              label={t('fullNameLabel')}
              placeholder={t('fullNamePlaceholder')}
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                setError('');
              }}
              autoComplete="name"
              textContentType="name"
              leftIcon={<User size={18} color={colors.secondaryText} />}
            />

            <FormInput
              label={t('phoneLabel')}
              placeholder={t('phonePlaceholder')}
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                setError('');
              }}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              leftIcon={<Phone size={18} color={colors.secondaryText} />}
            />

            <FormInput
              label={t('emailAddressLabel')}
              placeholder={t('emailAddressPlaceholder')}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              leftIcon={<Mail size={18} color={colors.secondaryText} />}
            />

            <PasswordInput
              label={t('passwordLabel')}
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

            {/* Terms and Conditions Checkbox */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAgreeTerms(!agreeTerms)}
              activeOpacity={0.8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreeTerms }}
            >
              <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                {agreeTerms && <Check size={13} color={colors.white} strokeWidth={3} />}
              </View>
              <Text style={styles.termsText}>{t('agreeToTerms')}</Text>
            </TouchableOpacity>

            {/* Create Account Primary CTA */}
            <PrimaryButton
              title={t('signUpBtn')}
              onPress={handleRegister}
              loading={isLoading}
              style={styles.signUpBtn}
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('orContinueWith')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Telegram Social Auth CTA */}
            <TelegramAuthButton
              onPress={handleTelegramRegister}
              isLoading={isLoading}
            />

            {/* Login Link */}
            <View style={styles.footerRow}>
              <Text style={styles.footerPrompt}>{t('alreadyAccount')}</Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/login')}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel={t('loginHere')}
              >
                <Text style={styles.footerLink}>{t('loginHere')}</Text>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoContainer: {
    marginVertical: 12,
    alignItems: 'center',
  },
  formHeader: {
    width: '100%',
    maxWidth: 420,
    marginBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 18,
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    marginTop: -4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primaryGold,
    borderColor: colors.primaryGold,
  },
  termsText: {
    fontSize: 12,
    color: colors.secondaryText,
    flex: 1,
    lineHeight: 16,
  },
  signUpBtn: {
    height: 52,
    borderRadius: 14,
    marginBottom: 18,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
  },
  footerPrompt: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryGold,
  },
});
