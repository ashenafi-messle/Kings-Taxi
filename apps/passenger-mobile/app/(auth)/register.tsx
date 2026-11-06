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
import {
  User,
  Phone,
  Mail,
  ArrowLeft,
  Globe,
  Check,
  Send,
  ArrowRight,
  Info,
} from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import {
  KingsTaxiLogo,
  FormInput,
  PrimaryButton,
  LanguageSelectorModal,
} from '../../src/components';
import { useAuthStore, useSettingsStore } from '../../src/stores';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../src/i18n';
import { RegistrationMethod } from '../../src/services/registrationAuth.service';

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation(['auth', 'validation', 'common']);
  const { initiateRegistration, isLoading } = useAuthStore();
  const { language } = useSettingsStore();

  const [method, setMethod] = useState<RegistrationMethod>('email');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('0911234567');
  const [countryCode, setCountryCode] = useState('+251');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState('');
  const [langModalVisible, setLangModalVisible] = useState(false);

  const currentLangLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeName || 'English';

  const validateEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val.trim());
  };

  const handleContinue = async () => {
    if (!fullName.trim()) {
      setError(t('validation:nameRequired'));
      return;
    }

    let identifier = '';
    if (method === 'email') {
      if (!email.trim()) {
        setError(t('validation:emailRequired'));
        return;
      }
      if (!validateEmail(email)) {
        setError(t('validation:emailInvalid'));
        return;
      }
      identifier = email.trim().toLowerCase();
    } else {
      const cleanPhone = phone.trim().replace(/^0/, '');
      if (!cleanPhone || cleanPhone.length < 8) {
        setError(t('validation:phoneInvalid'));
        return;
      }
      identifier = `${countryCode}${cleanPhone}`;
    }

    if (!agreeTerms) {
      setError(t('validation:mustAgreeTerms'));
      return;
    }

    setError('');

    // Initiate registration and generate channel-specific OTP
    const response = await initiateRegistration(method, identifier, fullName.trim());

    if (response.success && response.data) {
      const { sessionId, maskedIdentifier, devOtp } = response.data;
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          sessionId,
          method,
          identifier,
          fullName: fullName.trim(),
          maskedIdentifier,
          devOtp: devOtp || '',
        },
      });
    } else {
      setError(response.error || 'Failed to initiate registration. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(auth)/welcome');
            }
          }}
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

          {/* Step 1: Registration Method Selection Cards */}
          <View style={styles.methodSelectionSection}>
            <Text style={styles.sectionHeading}>{t('chooseMethod')}</Text>

            <View style={styles.cardsRow}>
              {/* Option A: Email */}
              <TouchableOpacity
                style={[
                  styles.methodCard,
                  method === 'email' && styles.methodCardActive,
                ]}
                onPress={() => {
                  setMethod('email');
                  setError('');
                }}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ selected: method === 'email' }}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.iconCircle,
                      method === 'email' ? styles.iconCircleActive : null,
                    ]}
                  >
                    <Mail
                      size={20}
                      color={method === 'email' ? colors.primaryGold : colors.secondaryText}
                    />
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      method === 'email' && styles.radioCircleActive,
                    ]}
                  >
                    {method === 'email' && <Check size={11} color={colors.white} strokeWidth={3} />}
                  </View>
                </View>
                <Text
                  style={[
                    styles.methodTitle,
                    method === 'email' && styles.methodTitleActive,
                  ]}
                >
                  {t('emailMethodTitle')}
                </Text>
                <Text style={styles.methodDesc}>{t('emailMethodDesc')}</Text>
              </TouchableOpacity>

              {/* Option B: Telegram */}
              <TouchableOpacity
                style={[
                  styles.methodCard,
                  method === 'telegram' && styles.methodCardActiveTelegram,
                ]}
                onPress={() => {
                  setMethod('telegram');
                  setError('');
                }}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ selected: method === 'telegram' }}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.iconCircle,
                      method === 'telegram' ? styles.iconCircleTelegram : null,
                    ]}
                  >
                    <Send
                      size={18}
                      color={method === 'telegram' ? colors.telegram : colors.secondaryText}
                      style={{ transform: [{ rotate: '-15deg' }] }}
                    />
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      method === 'telegram' && styles.radioCircleTelegramActive,
                    ]}
                  >
                    {method === 'telegram' && <Check size={11} color={colors.white} strokeWidth={3} />}
                  </View>
                </View>
                <Text
                  style={[
                    styles.methodTitle,
                    method === 'telegram' && styles.methodTitleTelegramActive,
                  ]}
                >
                  {t('telegramMethodTitle')}
                </Text>
                <Text style={styles.methodDesc}>{t('telegramMethodDesc')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* Step 2: Information Input Form */}
          <View style={styles.form}>
            {/* Full Name */}
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

            {/* Option A: Email Input */}
            {method === 'email' ? (
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
            ) : (
              /* Option B: Telegram Phone Input */
              <View style={styles.phoneSection}>
                <Text style={styles.inputLabel}>{t('phoneLabel')}</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryCodeBadge}>
                    <Text style={styles.flagEmoji}>🇪🇹</Text>
                    <Text style={styles.countryCodeText}>{countryCode}</Text>
                  </View>
                  <View style={styles.phoneFieldContainer}>
                    <FormInput
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
                      style={{ marginBottom: 0 }}
                    />
                  </View>
                </View>

                {/* Telegram Explanatory Banner */}
                <View style={styles.telegramNoticeBox}>
                  <Info size={16} color={colors.telegram} style={{ marginTop: 2 }} />
                  <Text style={styles.telegramNoticeText}>
                    {t('telegramNoticePrompt')}
                  </Text>
                </View>
              </View>
            )}

            {/* Terms and Privacy Agreement */}
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

            {/* Continue Primary CTA Button */}
            <PrimaryButton
              title={t('continueBtn')}
              onPress={handleContinue}
              loading={isLoading}
              icon={<ArrowRight size={18} color={colors.white} />}
              style={styles.continueBtn}
            />

            {/* Footer Login Link */}
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
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  formHeader: {
    width: '100%',
    maxWidth: 440,
    marginBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
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
  methodSelectionSection: {
    width: '100%',
    maxWidth: 440,
    marginBottom: 18,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  methodCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.8,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  methodCardActive: {
    borderColor: colors.primaryGold,
    backgroundColor: '#FFFEFA',
    shadowColor: colors.primaryGold,
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  methodCardActiveTelegram: {
    borderColor: colors.telegram,
    backgroundColor: '#F8FCFF',
    shadowColor: colors.telegram,
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    backgroundColor: colors.lightGold,
  },
  iconCircleTelegram: {
    backgroundColor: '#E8F5FD',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    backgroundColor: colors.primaryGold,
    borderColor: colors.primaryGold,
  },
  radioCircleTelegramActive: {
    backgroundColor: colors.telegram,
    borderColor: colors.telegram,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.dark,
    marginBottom: 4,
  },
  methodTitleActive: {
    color: colors.deepGold,
  },
  methodTitleTelegramActive: {
    color: colors.telegram,
  },
  methodDesc: {
    fontSize: 11,
    color: colors.secondaryText,
    lineHeight: 15,
  },
  errorBanner: {
    width: '100%',
    maxWidth: 440,
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
    maxWidth: 440,
  },
  phoneSection: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: 6,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 52,
  },
  flagEmoji: {
    fontSize: 16,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dark,
  },
  phoneFieldContainer: {
    flex: 1,
  },
  telegramNoticeBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  telegramNoticeText: {
    fontSize: 11.5,
    color: '#0369A1',
    lineHeight: 16,
    flex: 1,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    marginTop: 4,
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
  continueBtn: {
    height: 52,
    borderRadius: 14,
    marginBottom: 18,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
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
