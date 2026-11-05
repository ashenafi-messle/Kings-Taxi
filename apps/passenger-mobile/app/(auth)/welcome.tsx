import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Crown, Car, Hotel, Compass, ShieldCheck, Globe } from 'lucide-react-native';
import { theme } from '../../src/theme';
import { PrimaryButton, SecondaryButton } from '../../src/components';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../src/i18n';
import { useSettingsStore } from '../../src/stores';

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation(['auth', 'home', 'payments', 'common']);
  const { language } = useSettingsStore();

  const currentLangLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeName || 'English';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Language Selection Header Pill */}
        <View style={styles.langPillRow}>
          <TouchableOpacity
            style={styles.langPill}
            onPress={() => router.push('/settings/language')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Change language"
          >
            <Globe size={16} color={theme.colors.primaryDark} />
            <Text style={styles.langPillText}>{currentLangLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* Crown & Brand Identity Header */}
        <View style={styles.brandHeader}>
          <View style={styles.crownCircle}>
            <Crown size={38} color={theme.colors.primary} />
          </View>
          <Text style={styles.appName}>KINGS TAXI</Text>
          <Text style={styles.appTagline}>{t('tagline')}</Text>
        </View>

        {/* Feature Value Cards */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#FFF9E6' }]}>
              <Car size={22} color={theme.colors.primaryDark} />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>{t('home:services.rideTitle')}</Text>
              <Text style={styles.featureDesc}>
                {t('home:services.rideSubtitle')}
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Hotel size={22} color={theme.colors.hotelAccent} />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>{t('home:services.hotelsTitle')}</Text>
              <Text style={styles.featureDesc}>
                {t('home:services.hotelsSubtitle')}
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#F3E8FF' }]}>
              <Compass size={22} color={theme.colors.heritageAccent} />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>{t('home:services.heritageTitle')}</Text>
              <Text style={styles.featureDesc}>
                {t('home:services.heritageSubtitle')}
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#ECFDF5' }]}>
              <ShieldCheck size={22} color="#059669" />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>{t('payments:title')}</Text>
              <Text style={styles.featureDesc}>
                {t('payments:subtitle')}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <PrimaryButton
            title={t('signInBtn')}
            onPress={() => router.push('/(auth)/login')}
            style={styles.signInBtn}
          />
          <SecondaryButton
            title={t('signUpBtn')}
            onPress={() => router.push('/(auth)/register')}
            style={styles.registerBtn}
          />
        </View>

        <Text style={styles.termsNotice}>
          {t('termsNotice')}{' '}
          <Text style={styles.termsLink}>{t('termsOfService')}</Text> {t('and')}{' '}
          <Text style={styles.termsLink}>{t('privacyPolicy')}</Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  langPillRow: {
    alignItems: 'flex-end',
    marginBottom: theme.spacing.sm,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
  },
  langPillText: {
    ...theme.typography.captionBold,
    color: theme.colors.primaryDark,
  },
  brandHeader: {
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  crownCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.card,
  },
  appName: {
    ...theme.typography.h1,
    color: theme.colors.text,
    letterSpacing: 2,
  },
  appTagline: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  featuresContainer: {
    gap: theme.spacing.md,
    marginVertical: theme.spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  featureTextBox: {
    flex: 1,
  },
  featureTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  featureDesc: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  buttonContainer: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  signInBtn: {
    width: '100%',
  },
  registerBtn: {
    width: '100%',
  },
  termsNotice: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  termsLink: {
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
});
