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
import { useSettingsStore } from '../../src/stores';

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation(['auth', 'common']);
  const { language } = useSettingsStore();
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

        {/* 5-Slide Advertising Hero Carousel */}
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
});
