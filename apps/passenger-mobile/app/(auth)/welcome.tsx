import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Globe, ArrowRight, ShieldCheck, Star } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import {
  KingsTaxiLogo,
  LandingHeroCarousel,
  LanguageSelectorModal,
  PrimaryButton,
  SecondaryButton,
} from '../../src/components';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../src/i18n';
import { useSettingsStore, useAuthStore } from '../../src/stores';

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation(['auth', 'common']);
  const { language } = useSettingsStore();
  const { isAuthenticated, user } = useAuthStore();
  const [langModalVisible, setLangModalVisible] = useState(false);

  const currentLangLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeName || 'English';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.langPill}
          onPress={() => setLangModalVisible(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Change language. Current: ${currentLangLabel}`}
        >
          <Globe size={15} color={colors.deepGold} />
          <Text style={styles.langPillText}>{currentLangLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signInShortcut}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('signInBtn')}
        >
          <Text style={styles.signInShortcutText}>{t('signInBtn')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Official Brand Hero Presentation */}
        <View style={styles.brandHeroSection}>
          <KingsTaxiLogo variant="hero" showTagline showText />
        </View>

        {/* 4-Slide Image Advertising Hero Carousel */}
        <LandingHeroCarousel />

        {/* Trust Badges */}
        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <ShieldCheck size={16} color={colors.primaryGold} />
            <Text style={styles.trustText}>Screened Drivers</Text>
          </View>
          <View style={styles.trustDot} />
          <View style={styles.trustItem}>
            <Star size={16} color={colors.primaryGold} fill={colors.primaryGold} />
            <Text style={styles.trustText}>5-Star Fleet</Text>
          </View>
          <View style={styles.trustDot} />
          <View style={styles.trustItem}>
            <Globe size={16} color={colors.primaryGold} />
            <Text style={styles.trustText}>3 Languages</Text>
          </View>
        </View>

        {/* Main Action CTAs */}
        {isAuthenticated && user ? (
          <View style={styles.actionsSection}>
            {/* Authenticated Active Passenger Card */}
            <View style={styles.authSessionCard}>
              <View style={styles.authSessionHeader}>
                <View style={styles.authAvatarCircle}>
                  <Text style={styles.authAvatarText}>
                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'K'}
                  </Text>
                </View>
                <View style={styles.authSessionDetails}>
                  <Text style={styles.authWelcomeSub}>Active Passenger Session</Text>
                  <Text style={styles.authWelcomeName} numberOfLines={1}>
                    {user.fullName || 'Valued Passenger'}
                  </Text>
                </View>
              </View>

              <PrimaryButton
                title="Continue to App"
                onPress={() => router.replace('/(tabs)')}
                icon={<ArrowRight size={18} color={colors.white} />}
                style={styles.continueBtn}
              />

              <View style={styles.authSessionActionsRow}>
                <TouchableOpacity
                  style={styles.authSwitchBtn}
                  onPress={() => router.push('/(auth)/login')}
                  accessibilityRole="button"
                  accessibilityLabel="Switch account or log in"
                >
                  <Text style={styles.authSwitchText}>Switch Account</Text>
                </TouchableOpacity>
                <Text style={styles.authDividerDot}>•</Text>
                <TouchableOpacity
                  style={styles.authSwitchBtn}
                  onPress={() => router.push('/(auth)/register')}
                  accessibilityRole="button"
                  accessibilityLabel="Create another account"
                >
                  <Text style={styles.authSwitchText}>Create Account</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.guestLink}
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('exploreAsGuest')}
            >
              <Text style={styles.guestLinkText}>{t('exploreAsGuest')}</Text>
            </TouchableOpacity>

            <Text style={styles.termsNotice}>
              {t('termsNotice')}{' '}
              <Text style={styles.termsLink}>{t('termsOfService')}</Text> {t('and')}{' '}
              <Text style={styles.termsLink}>{t('privacyPolicy')}</Text>.
            </Text>
          </View>
        ) : (
          <View style={styles.actionsSection}>
            <PrimaryButton
              title={t('getStarted')}
              onPress={() => router.push('/(auth)/register')}
              icon={<ArrowRight size={18} color={colors.white} />}
              style={styles.getStartedBtn}
            />

            <SecondaryButton
              title={t('signInBtn')}
              onPress={() => router.push('/(auth)/login')}
              style={styles.secondaryBtn}
            />

            <TouchableOpacity
              style={styles.guestLink}
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('exploreAsGuest')}
            >
              <Text style={styles.guestLinkText}>{t('exploreAsGuest')}</Text>
            </TouchableOpacity>

            <Text style={styles.termsNotice}>
              {t('termsNotice')}{' '}
              <Text style={styles.termsLink}>{t('termsOfService')}</Text> {t('and')}{' '}
              <Text style={styles.termsLink}>{t('privacyPolicy')}</Text>.
            </Text>
          </View>
        )}
      </ScrollView>

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
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.lightGold,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.champagne,
  },
  langPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.deepGold,
  },
  signInShortcut: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  signInShortcutText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryGold,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  brandHeroSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 14,
    backgroundColor: colors.white,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  trustDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderGold,
  },
  actionsSection: {
    width: '100%',
    maxWidth: 420,
    marginTop: 10,
    gap: 12,
    alignItems: 'center',
  },
  getStartedBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
  },
  secondaryBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    borderColor: colors.borderGold,
  },
  guestLink: {
    paddingVertical: 8,
    marginTop: 2,
  },
  guestLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.deepGold,
    letterSpacing: 0.2,
  },
  termsNotice: {
    fontSize: 11,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 6,
    paddingHorizontal: 10,
  },
  termsLink: {
    color: colors.deepGold,
    fontWeight: '600',
  },
  authSessionCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: colors.borderGold,
    shadowColor: colors.primaryGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
    gap: 14,
  },
  authSessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.lightGold,
    borderWidth: 1.5,
    borderColor: colors.primaryGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.deepGold,
  },
  authSessionDetails: {
    flex: 1,
  },
  authWelcomeSub: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryGold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  authWelcomeName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.dark,
    marginTop: 2,
  },
  continueBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
  },
  authSessionActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 4,
  },
  authSwitchBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  authSwitchText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.deepGold,
  },
  authDividerDot: {
    fontSize: 14,
    color: colors.borderGold,
  },
});
