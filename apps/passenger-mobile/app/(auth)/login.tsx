import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Mail, ArrowLeft, Globe } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import {
  KingsTaxiLogo,
  FormInput,
  PasswordInput,
  RememberEmailCheckbox,
  PrimaryButton,
  LanguageSelectorModal,
} from '../../src/components';
import { useAuthStore, useSettingsStore } from '../../src/stores';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../src/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['auth', 'validation', 'common']);
  const {
    loginWithEmail,
    isLoading,
    rememberedEmail,
    isEmailRemembered,
    loadInitialAuth,
  } = useAuthStore();
  const { language } = useSettingsStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberAccount, setRememberAccount] = useState(false);
  const [error, setError] = useState('');
  const [langModalVisible, setLangModalVisible] = useState(false);
  const passwordInputRef = useRef<TextInput>(null);

  // Initialize and pre-fill remembered email or phone
  useEffect(() => {
    loadInitialAuth();
  }, [loadInitialAuth]);

  useEffect(() => {
    if (rememberedEmail) {
      setIdentifier(rememberedEmail);
      setRememberAccount(true);
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

  const validateIdentifier = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return false;
    if (trimmed.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(trimmed);
    }
    const digits = trimmed.replace(/[^0-9]/g, '');
    return digits.length >= 8;
  };

  const handleLogin = async () => {
    if (isLoading) return;

    if (!identifier.trim()) {
      setError(t('auth:emailOrPhoneLabel', 'Email address or phone number') + ' is required');
      return;
    }
    if (!validateIdentifier(identifier)) {
      setError(t('validation:invalidIdentifier', 'Please enter a valid email address or phone number'));
      return;
    }
    if (!password || password.length < 6) {
      setError(t('validation:passwordTooShort'));
      return;
    }

    setError('');
    const result = await loginWithEmail(identifier.trim(), password, rememberAccount);
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setError(result.error || t('validation:passwordRequired'));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 24 },
          ]}
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
              label={t('emailOrPhoneLabel', 'Email address or phone number')}
              placeholder={t('emailOrPhonePlaceholder', 'abebe@example.com or 0911 234 567')}
              value={identifier}
              onChangeText={(text) => {
                setIdentifier(text);
                setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              blurOnSubmit={false}
              leftIcon={<Mail size={18} color={colors.secondaryText} />}
            />

            <PasswordInput
              ref={passwordInputRef}
              label={t('passwordLabel')}
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError('');
              }}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            {/* Remember Account & Forgot Password Row */}
            <View style={styles.optionsRow}>
              <RememberEmailCheckbox
                checked={rememberAccount}
                onToggle={(checked) => setRememberAccount(checked)}
                label={t('rememberAccount', 'Remember my account')}
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
    backgroundColor: '#FAF2D3',
    borderWidth: 1.5,
    borderColor: colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.paleGold,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.brightGold,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.deepChocolate,
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
    color: colors.deepChocolate,
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
    color: colors.primaryGold,
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
    backgroundColor: colors.borderGold,
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
