import React, { useState, useEffect } from 'react';
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
  Alert,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, ArrowLeft, Globe } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import {
  KingsTaxiLogo,
  FormInput,
  PasswordInput,
  RememberEmailCheckbox,
  TelegramAuthButton,
  PrimaryButton,
  LanguageSelectorModal,
} from '../../src/components';
import { useAuthStore, useSettingsStore } from '../../src/stores';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../src/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation(['auth', 'validation', 'common']);
  const {
    loginWithEmail,
    loginWithTelegram,
    isLoading,
    rememberedEmail,
    isEmailRemembered,
    loadInitialAuth,
  } = useAuthStore();
  const { language } = useSettingsStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [rememberEmail, setRememberEmail] = useState(false);
  const [error, setError] = useState('');
  const [langModalVisible, setLangModalVisible] = useState(false);

  // Initialize and pre-fill remembered email
  useEffect(() => {
    loadInitialAuth();
  }, []);

  useEffect(() => {
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberEmail(true);
    } else {
      // Default demo email for fast evaluation
      setEmail('passenger@kingstaxi.et');
    }
  }, [rememberedEmail, isEmailRemembered]);

  // Android BackHandler
  useEffect(() => {
    const onBackPress = () => {
      if (langModalVisible) {
        setLangModalVisible(false);
        return true;
      }
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(auth)/welcome');
      }
      return true;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, [langModalVisible, router]);

  const currentLangLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeName || 'English';

  const validateEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val.trim());
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      setError(t('validation:emailRequired'));
      return;
    }
    if (!validateEmail(email)) {
      setError(t('validation:emailInvalid'));
      return;
    }
    if (!password || password.length < 6) {
      setError(t('validation:passwordTooShort'));
      return;
    }

    setError('');
    const success = await loginWithEmail(email.trim(), password, rememberEmail);
    if (success) {
      router.replace('/(tabs)');
    } else {
      setError(t('validation:passwordRequired'));
    }
  };

  const handleTelegramLogin = async () => {
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

      {/* Header Bar */}
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
          {/* Official Logo Presentation */}
          <View style={styles.logoContainer}>
            <KingsTaxiLogo variant="full" showTagline showText />
          </View>

          {/* Form Header */}
          <View style={styles.formHeader}>
            <Text style={styles.title}>{t('loginTitle')}</Text>
            <Text style={styles.subtitle}>{t('loginSubtitle')}</Text>
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* Form Inputs */}
          <View style={styles.form}>
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
            />

            {/* Remember Email & Forgot Password Row */}
            <View style={styles.optionsRow}>
              <RememberEmailCheckbox
                checked={rememberEmail}
                onToggle={(checked) => setRememberEmail(checked)}
              />

              <TouchableOpacity
                onPress={() => router.push('/(auth)/forgot-password')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.forgotBtn}
                accessibilityRole="button"
                accessibilityLabel={t('forgotPassword')}
              >
                <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Primary CTA */}
            <PrimaryButton
              title={t('signInBtn')}
              onPress={handleLogin}
              loading={isLoading}
              style={styles.signInBtn}
            />

            {/* Or Continue With Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('orContinueWith')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Telegram Social Auth CTA */}
            <TelegramAuthButton
              onPress={handleTelegramLogin}
              isLoading={isLoading}
            />

            {/* Register Footer Link */}
            <View style={styles.footerRow}>
              <Text style={styles.footerPrompt}>{t('noAccount')}</Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/register')}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel={t('registerHere')}
              >
                <Text style={styles.footerLink}>{t('registerHere')}</Text>
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotBtn: {
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 13,
    color: colors.deepGold,
    fontWeight: '700',
  },
  signInBtn: {
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
