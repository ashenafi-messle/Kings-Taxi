import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Mail, Send, Globe, RefreshCw, ExternalLink } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import {
  KingsTaxiLogo,
  PrimaryButton,
  LanguageSelectorModal,
} from '../../src/components';
import { useAuthStore, useSettingsStore } from '../../src/stores';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../src/i18n';
import { RegistrationMethod } from '../../src/services/registrationAuth.service';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { t } = useTranslation(['auth', 'validation', 'common']);
  const params = useLocalSearchParams();

  const sessionId = (params.sessionId as string) || '';
  const method = (params.method as RegistrationMethod) || 'email';
  const identifier = (params.identifier as string) || '';
  const fullName = (params.fullName as string) || '';
  const maskedIdentifier = (params.maskedIdentifier as string) || identifier;
  const initialDevOtp = (params.devOtp as string) || '';

  const { verifyRegistrationOtp, resendRegistrationOtp, isLoading } = useAuthStore();
  const { language } = useSettingsStore();

  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState(initialDevOtp);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const currentLangLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeName || 'English';

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleVerify = async () => {
    if (code.length < 6) {
      setError(t('validation:otpIncomplete'));
      return;
    }

    setError('');
    const response = await verifyRegistrationOtp(sessionId, code);

    if (response.success && response.data) {
      const { registrationToken } = response.data;
      // Navigate to Step 5: Set Password
      router.push({
        pathname: '/(auth)/set-password',
        params: {
          sessionId,
          registrationToken,
          method,
          identifier,
          fullName,
        },
      });
    } else {
      setError(response.error || t('invalidOtp'));
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setError('');
    const res = await resendRegistrationOtp(sessionId);
    if (res.success && res.data) {
      setTimer(res.data.resendCooldownSeconds || 60);
      if (res.data.devOtp) {
        setDevOtp(res.data.devOtp);
      }
    } else {
      setError(res.error || 'Failed to resend code');
    }
  };

  const handleOpenTelegram = async () => {
    const tgUrl = 'https://t.me/KingsTaxiAuthBot';
    try {
      await Linking.openURL(tgUrl);
    } catch {
      // fallback
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Top Bar */}
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
            <KingsTaxiLogo variant="full" showTagline={false} showText={true} />
          </View>

          {/* Verification Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('verifyTitle')}</Text>

            {/* Delivery Channel Badge */}
            <View
              style={[
                styles.channelBadge,
                method === 'telegram'
                  ? styles.channelBadgeTelegram
                  : styles.channelBadgeEmail,
              ]}
            >
              {method === 'telegram' ? (
                <Send size={15} color={colors.telegram} style={{ transform: [{ rotate: '-15deg' }] }} />
              ) : (
                <Mail size={15} color={colors.deepGold} />
              )}
              <Text
                style={[
                  styles.channelBadgeText,
                  { color: method === 'telegram' ? colors.telegram : colors.deepGold },
                ]}
              >
                {method === 'telegram'
                  ? t('deliveryChannelTelegram')
                  : t('deliveryChannelEmail')}
              </Text>
            </View>

            <Text style={styles.subtitle}>
              {t('verifySubtitle', { phone: maskedIdentifier })}
            </Text>

            {/* Telegram App Open Shortcut */}
            {method === 'telegram' && (
              <TouchableOpacity
                style={styles.telegramActionBtn}
                onPress={handleOpenTelegram}
                activeOpacity={0.8}
              >
                <Send size={14} color={colors.white} style={{ transform: [{ rotate: '-15deg' }] }} />
                <Text style={styles.telegramActionText}>{t('openTelegramBot')}</Text>
                <ExternalLink size={13} color={colors.white} />
              </TouchableOpacity>
            )}
          </View>

          {/* Dev Hint Box (Assists Testing & Verification) */}
          {devOtp ? (
            <View style={styles.devHintBox}>
              <Text style={styles.devHintLabel}>TESTING VERIFICATION CODE:</Text>
              <Text style={styles.devHintCode}>{devOtp}</Text>
            </View>
          ) : null}

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* 6-Digit OTP Box Grid */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
            style={styles.otpGrid}
          >
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const char = code[index] || '';
              const isCurrent = index === code.length;
              return (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    char ? styles.otpBoxFilled : null,
                    isCurrent ? styles.otpBoxActive : null,
                  ]}
                >
                  <Text style={styles.otpText}>{char}</Text>
                </View>
              );
            })}
          </TouchableOpacity>

          {/* Hidden Real Input for Keyboard */}
          <TextInput
            ref={inputRef}
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

          {/* Resend OTP Row */}
          <View style={styles.resendRow}>
            {timer > 0 ? (
              <Text style={styles.timerText}>
                {t('resendIn', { seconds: timer })}
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                style={styles.resendButton}
                activeOpacity={0.8}
              >
                <RefreshCw size={14} color={colors.primaryGold} />
                <Text style={styles.resendAction}>{t('resendCode')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Verify & Continue Primary Button */}
          <PrimaryButton
            title={t('verifyBtn')}
            onPress={handleVerify}
            loading={isLoading}
            disabled={code.length < 6}
            style={styles.verifyBtn}
          />
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
    marginBottom: 8,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
  },
  channelBadgeEmail: {
    backgroundColor: colors.lightGold,
    borderColor: colors.champagne,
  },
  channelBadgeTelegram: {
    backgroundColor: '#E8F5FD',
    borderColor: '#BAE6FD',
  },
  channelBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
  },
  telegramActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.telegram,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  telegramActionText: {
    color: colors.white,
    fontSize: 12.5,
    fontWeight: '700',
  },
  devHintBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 14,
    padding: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  devHintLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 1,
    marginBottom: 2,
  },
  devHintCode: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4,
    color: '#78350F',
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
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 400,
    marginBottom: 24,
  },
  otpBox: {
    flex: 1,
    maxWidth: 52,
    height: 60,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  otpBoxActive: {
    borderColor: colors.primaryGold,
    backgroundColor: '#FFFEFA',
  },
  otpBoxFilled: {
    borderColor: colors.primaryGold,
    backgroundColor: colors.lightGold,
  },
  otpText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.dark,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  resendRow: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerText: {
    fontSize: 13,
    color: colors.secondaryText,
    fontWeight: '600',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resendAction: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.primaryGold,
  },
  verifyBtn: {
    width: '100%',
    maxWidth: 420,
    height: 52,
    borderRadius: 14,
  },
});
