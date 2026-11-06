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
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Mail,
  Send,
  Globe,
  AlertCircle,
  KeyRound,
  Check,
  Phone,
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
import { RecoveryMethod } from '../../src/services/passwordRecovery.service';

const COUNTRY_CODES = [
  { code: '+251', country: 'ET', name: 'Ethiopia' },
  { code: '+1', country: 'US', name: 'USA' },
  { code: '+44', country: 'UK', name: 'United Kingdom' },
  { code: '+254', country: 'KE', name: 'Kenya' },
  { code: '+971', country: 'AE', name: 'UAE' },
];

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation(['auth', 'validation', 'common']);
  const { initiatePasswordRecovery, isLoading } = useAuthStore();
  const { language } = useSettingsStore();

  const [method, setMethod] = useState<RecoveryMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+251');
  const [error, setError] = useState('');
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const currentLangLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeName || 'English';

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const handleInitiateRecovery = async () => {
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

    setError('');

    const res = await initiatePasswordRecovery(method, identifier);

    if (res.success && res.data) {
      const {
        sessionId,
        maskedIdentifier,
        fullName,
        devOtp,
        telegramBotUrl,
      } = res.data;

      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          flow: 'recovery',
          sessionId,
          method,
          identifier,
          fullName: fullName || '',
          maskedIdentifier,
          telegramBotUrl: telegramBotUrl || '',
          devOtp: devOtp || '',
        },
      });
    } else {
      setError(
        res.error ||
          (method === 'email'
            ? 'No registered passenger account found with this email.'
            : 'No registered passenger account found with this Telegram phone.')
      );
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
          {/* Header Branding */}
          <View style={styles.brandHero}>
            <KingsTaxiLogo variant="header" showTagline={false} showText={false} />
            <Text style={styles.screenTitle}>Reset Password</Text>
            <Text style={styles.screenSubtitle}>
              Recover your Kings Taxi account without knowing your old password.
            </Text>
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Step 2: Channel Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Select Recovery Method</Text>
            <View style={styles.methodsRow}>
              {/* Option A: Email Recovery */}
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
                    {method === 'email' && (
                      <Check size={11} color={colors.white} strokeWidth={3} />
                    )}
                  </View>
                </View>
                <Text
                  style={[
                    styles.methodTitle,
                    method === 'email' && styles.methodTitleActive,
                  ]}
                >
                  Email Address
                </Text>
                <Text style={styles.methodDesc}>Receive OTP via registered email</Text>
              </TouchableOpacity>

              {/* Option B: Telegram Recovery */}
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
                      method === 'telegram' && styles.radioCircleActiveTelegram,
                    ]}
                  >
                    {method === 'telegram' && (
                      <Check size={11} color={colors.white} strokeWidth={3} />
                    )}
                  </View>
                </View>
                <Text
                  style={[
                    styles.methodTitle,
                    method === 'telegram' && styles.methodTitleActiveTelegram,
                  ]}
                >
                  Telegram Phone
                </Text>
                <Text style={styles.methodDesc}>Receive OTP via @KingsTaxiAuthBot</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Step 3: Input Form */}
          <View style={styles.formCard}>
            {method === 'email' ? (
              <View>
                <FormInput
                  label="Registered Email Address"
                  placeholder="e.g. passenger@kingstaxi.et"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    setError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  leftIcon={<Mail size={18} color={colors.secondaryText} />}
                />
                <Text style={styles.helperNotice}>
                  A secure 6-digit one-time code will be dispatched to this email address.
                </Text>
              </View>
            ) : (
              <View>
                <Text style={styles.inputLabel}>Registered Telegram Phone</Text>
                <View style={styles.phoneInputRow}>
                  {/* Country Code Selector */}
                  <TouchableOpacity
                    style={styles.countryCodeBtn}
                    onPress={() => setShowCountryPicker(!showCountryPicker)}
                    accessibilityRole="button"
                    accessibilityLabel={`Country code ${countryCode}`}
                  >
                    <Text style={styles.countryCodeText}>{countryCode}</Text>
                  </TouchableOpacity>

                  {/* Phone Number Input */}
                  <View style={styles.phoneNumberWrapper}>
                    <TextInput
                      style={styles.phoneTextInput}
                      placeholder="91 123 4567"
                      placeholderTextColor={colors.textLight}
                      value={phone}
                      onChangeText={(val) => {
                        setPhone(val);
                        setError('');
                      }}
                      keyboardType="phone-pad"
                      maxLength={12}
                    />
                  </View>
                </View>

                {/* Country Code Picker Dropdown */}
                {showCountryPicker && (
                  <View style={styles.countryDropdown}>
                    {COUNTRY_CODES.map((item) => (
                      <TouchableOpacity
                        key={item.code}
                        style={[
                          styles.countryOption,
                          countryCode === item.code && styles.countryOptionActive,
                        ]}
                        onPress={() => {
                          setCountryCode(item.code);
                          setShowCountryPicker(false);
                        }}
                      >
                        <Text style={styles.countryOptionName}>{item.name}</Text>
                        <Text style={styles.countryOptionCode}>{item.code}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.helperNotice}>
                  Our official verified bot (@KingsTaxiAuthBot) will dispatch your recovery code.
                </Text>
              </View>
            )}

            {/* Submit Action */}
            <PrimaryButton
              title="Send Verification Code"
              onPress={handleInitiateRecovery}
              loading={isLoading}
              style={styles.submitBtn}
            />
          </View>

          {/* Footer Back to Login Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerPrompt}>Remembered your password?</Text>
            <TouchableOpacity
              onPress={() => router.replace('/(auth)/login')}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Back to sign in"
            >
              <Text style={styles.footerLink}>Sign In Here</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Language Selector Modal */}
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
  keyboardView: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.champagne,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.deepGold,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  brandHero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: -0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
    lineHeight: 18,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  methodsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  methodCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  methodCardActive: {
    borderColor: colors.primaryGold,
    backgroundColor: colors.lightGold,
  },
  methodCardActiveTelegram: {
    borderColor: colors.telegram,
    backgroundColor: '#F0F9FF',
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
    backgroundColor: colors.white,
  },
  iconCircleTelegram: {
    backgroundColor: colors.white,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    backgroundColor: colors.primaryGold,
    borderColor: colors.primaryGold,
  },
  radioCircleActiveTelegram: {
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
  methodTitleActiveTelegram: {
    color: colors.telegram,
  },
  methodDesc: {
    fontSize: 11,
    color: colors.secondaryText,
    lineHeight: 15,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primaryGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  countryCodeBtn: {
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.dark,
  },
  phoneNumberWrapper: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  phoneTextInput: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.dark,
  },
  countryDropdown: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 6,
    marginBottom: 10,
    overflow: 'hidden',
  },
  countryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  countryOptionActive: {
    backgroundColor: colors.lightGold,
  },
  countryOptionName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark,
  },
  countryOptionCode: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.deepGold,
  },
  helperNotice: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 17,
    marginTop: 8,
    marginBottom: 16,
  },
  submitBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  footerPrompt: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.deepGold,
  },
});
