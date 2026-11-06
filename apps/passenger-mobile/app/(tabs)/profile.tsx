import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Switch,
  Share,
  Linking,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Globe,
  Bell,
  Shield,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Star,
  Info,
  Share2,
  KeyRound,
  Calendar,
  CheckCircle2,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import { colors } from '../../src/theme/colors';
import { ConfirmationModal, PrimaryButton } from '../../src/components';
import { useAuthStore, useSettingsStore } from '../../src/stores';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../src/i18n';
import { APP_CONFIG, SHARE_APP_MESSAGE } from '../../src/config/appLinks';

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation(['profile', 'common']);
  const { user, logout } = useAuthStore();
  const {
    language,
    notificationsEnabled,
    biometricLoginEnabled,
    toggleNotifications,
    toggleBiometrics,
  } = useSettingsStore();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
    router.replace('/(auth)/welcome');
  };

  const getLanguageLabel = (lang: string) => {
    const found = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
    return found ? `${found.nativeName} (${found.name})` : 'English';
  };

  // Section 3: Share App Feature
  const handleShareApp = async () => {
    try {
      await Share.share({
        title: 'Kings Taxi Passengers App',
        message: SHARE_APP_MESSAGE,
        url: APP_CONFIG.downloadUrl,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  // Section 4: Rate App Feature
  const handleRateApp = async () => {
    if (APP_CONFIG.isStorePublished) {
      const storeUrl =
        Platform.OS === 'android'
          ? `market://details?id=${APP_CONFIG.playStoreId}`
          : `itms-apps://itunes.apple.com/app/id${APP_CONFIG.appStoreId}?action=write-review`;
      const fallbackUrl =
        Platform.OS === 'android' ? APP_CONFIG.playStoreUrl : APP_CONFIG.appStoreUrl;

      try {
        const canOpen = await Linking.canOpenURL(storeUrl);
        if (canOpen) {
          await Linking.openURL(storeUrl);
        } else {
          await Linking.openURL(fallbackUrl);
        }
      } catch {
        await Linking.openURL(fallbackUrl);
      }
    } else {
      setShowRateModal(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <User size={36} color={theme.colors.secondary} />
            )}
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.userName}>{user?.fullName || 'Passenger'}</Text>
            <Text style={styles.userPhone}>{user?.phone || '+251 9X XXX XXXX'}</Text>
            <View style={styles.statsRow}>
              <View style={styles.ratingBadge}>
                <Star size={12} color={theme.colors.primaryDark} fill={theme.colors.primary} />
                <Text style={styles.ratingText}>{user?.rating || 5.0} ★</Text>
              </View>
              <Text style={styles.tripsCount}>{t('verifiedPassenger')}</Text>
            </View>
          </View>
        </View>

        {/* 1. Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderTitle}>{t('sections.account')}</Text>

          {/* Personal Information */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setShowPersonalInfoModal(true)}
            accessibilityRole="button"
            accessibilityLabel={t('items.personalInfo')}
          >
            <View style={styles.menuIconCircle}>
              <User size={18} color={colors.primaryGold} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.personalInfo')}</Text>
              <Text style={styles.menuSubtitle}>{user?.email || 'View account credentials'}</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {/* My Bookings */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(tabs)/bookings')}
            accessibilityRole="button"
            accessibilityLabel={t('items.myBookings')}
          >
            <View style={styles.menuIconCircle}>
              <Calendar size={18} color="#2563EB" />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.myBookings')}</Text>
              <Text style={styles.menuSubtitle}>Rides, hotel stays & tours</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {/* Reset Password */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(auth)/forgot-password')}
            accessibilityRole="button"
            accessibilityLabel={t('items.resetPassword')}
          >
            <View style={styles.menuIconCircle}>
              <KeyRound size={18} color={colors.deepGold} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.resetPassword')}</Text>
              <Text style={styles.menuSubtitle}>Recover via email or Telegram</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {/* Payment Methods */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/payments/checkout')}
            accessibilityRole="button"
            accessibilityLabel={t('items.paymentMethods')}
          >
            <View style={styles.menuIconCircle}>
              <CreditCard size={18} color="#059669" />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.paymentMethods')}</Text>
              <Text style={styles.menuSubtitle}>Telebirr, CBE Birr, Chapa</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 2. Kings Taxi Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderTitle}>{t('sections.kingsTaxi')}</Text>

          {/* About Us */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/profile/about')}
            accessibilityRole="button"
            accessibilityLabel={t('items.aboutUs')}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: colors.lightGold }]}>
              <Info size={18} color={colors.primaryGold} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.aboutUs')}</Text>
              <Text style={styles.menuSubtitle}>Vision, Mission & Ardab Tech Credits</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {/* Share App */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleShareApp}
            accessibilityRole="button"
            accessibilityLabel={t('items.shareApp')}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#F0FDF4' }]}>
              <Share2 size={18} color="#16A34A" />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.shareApp')}</Text>
              <Text style={styles.menuSubtitle}>Telegram, WhatsApp, SMS & Email</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {/* Rate App */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleRateApp}
            accessibilityRole="button"
            accessibilityLabel={t('items.rateApp')}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Star size={18} color="#D97706" />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.rateApp')}</Text>
              <Text style={styles.menuSubtitle}>Google Play & App Store</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 3. Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderTitle}>{t('sections.preferences')}</Text>

          {/* Language Preferences */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/settings/language')}
            accessibilityRole="button"
            accessibilityLabel={t('items.language')}
          >
            <View style={styles.menuIconCircle}>
              <Globe size={18} color={theme.colors.hotelAccent} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.language')}</Text>
              <Text style={styles.menuSubtitle}>{getLanguageLabel(language)}</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {/* Notifications Toggle */}
          <View style={styles.menuRow}>
            <View style={styles.menuIconCircle}>
              <Bell size={18} color={theme.colors.heritageAccent} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.notifications')}</Text>
              <Text style={styles.menuSubtitle}>SMS & push alerts</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
            />
          </View>

          {/* Security & Biometrics Toggle */}
          <View style={styles.menuRow}>
            <View style={styles.menuIconCircle}>
              <Shield size={18} color="#059669" />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.security')}</Text>
              <Text style={styles.menuSubtitle}>PIN & Biometrics</Text>
            </View>
            <Switch
              value={biometricLoginEnabled}
              onValueChange={toggleBiometrics}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
            />
          </View>
        </View>

        {/* 4. Support & Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderTitle}>{t('sections.support')}</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/support/index')}
            accessibilityRole="button"
            accessibilityLabel={t('items.helpSupport')}
          >
            <View style={styles.menuIconCircle}>
              <HelpCircle size={18} color={theme.colors.secondary} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.helpSupport')}</Text>
              <Text style={styles.menuSubtitle}>24/7 Safety & Dispatch</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuRow}>
            <View style={styles.menuIconCircle}>
              <FileText size={18} color={theme.colors.textSecondary} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>
                {t('items.termsOfService')} & {t('items.privacyPolicy')}
              </Text>
              <Text style={styles.menuSubtitle}>Kings Mobility Ethiopia</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('items.logout')}
        >
          <LogOut size={18} color={theme.colors.danger} />
          <Text style={styles.logoutText}>{t('items.logout')}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>
          Kings Taxi Passenger Mobile v1.0.0 (Build 520) • Gondar City, Ethiopia
        </Text>
      </ScrollView>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showLogoutModal}
        title={t('logoutModal.title')}
        message={t('logoutModal.message')}
        confirmTitle={t('logoutModal.confirm')}
        cancelTitle={t('logoutModal.cancel')}
        isDestructive
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      {/* Rate App Info Modal (When store listing is in final review) */}
      <Modal
        visible={showRateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.infoModalCard}>
            <View style={styles.modalHeaderIcon}>
              <Sparkles size={28} color={colors.primaryGold} />
            </View>
            <Text style={styles.infoModalTitle}>Rate Kings Taxi</Text>
            <Text style={styles.infoModalBody}>
              The Kings Taxi official store listing on Google Play and Apple App Store
              is currently undergoing final review. Rating will become available as soon
              as the public store release is active.
            </Text>
            <Text style={[styles.infoModalBody, { marginTop: 8, fontWeight: '700' }]}>
              Thank you for supporting modern mobility in Gondar City!
            </Text>
            <PrimaryButton
              title="Close"
              onPress={() => setShowRateModal(false)}
              style={styles.modalCloseBtn}
            />
          </View>
        </View>
      </Modal>

      {/* Personal Info Modal */}
      <Modal
        visible={showPersonalInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPersonalInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.infoModalCard}>
            <View style={styles.modalTopRow}>
              <Text style={styles.infoModalTitle}>Personal Information</Text>
              <TouchableOpacity
                onPress={() => setShowPersonalInfoModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={colors.dark} />
              </TouchableOpacity>
            </View>

            <View style={styles.infoFieldsList}>
              <View style={styles.infoFieldRow}>
                <Text style={styles.infoFieldLabel}>Full Name</Text>
                <Text style={styles.infoFieldValue}>{user?.fullName || 'Valued Passenger'}</Text>
              </View>

              <View style={styles.infoFieldRow}>
                <Text style={styles.infoFieldLabel}>Phone Number</Text>
                <Text style={styles.infoFieldValue}>{user?.phone || '+251 91 123 4567'}</Text>
              </View>

              <View style={styles.infoFieldRow}>
                <Text style={styles.infoFieldLabel}>Email Address</Text>
                <Text style={styles.infoFieldValue}>{user?.email || 'passenger@kingstaxi.et'}</Text>
              </View>

              <View style={styles.infoFieldRow}>
                <Text style={styles.infoFieldLabel}>Service Region</Text>
                <Text style={styles.infoFieldValue}>Gondar City, Ethiopia</Text>
              </View>

              <View style={styles.infoFieldRow}>
                <Text style={styles.infoFieldLabel}>Account Status</Text>
                <View style={styles.verifiedRow}>
                  <CheckCircle2 size={16} color={colors.success} />
                  <Text style={[styles.infoFieldValue, { color: colors.success }]}>
                    Verified Passenger
                  </Text>
                </View>
              </View>
            </View>

            <PrimaryButton
              title="Done"
              onPress={() => setShowPersonalInfoModal(false)}
              style={styles.modalCloseBtn}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.layout.tabBarContentPadding,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: theme.spacing.md,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  profileDetails: {
    flex: 1,
  },
  userName: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  userPhone: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  ratingText: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  tripsCount: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionHeaderTitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
    fontWeight: '700',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xs,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
  menuSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.dangerLight,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  logoutText: {
    ...theme.typography.body,
    color: theme.colors.danger,
    fontWeight: '600',
  },
  versionText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  infoModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1.5,
    borderColor: colors.borderGold,
    shadowColor: colors.primaryGold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
    alignItems: 'center',
  },
  modalHeaderIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.lightGold,
    borderWidth: 1.5,
    borderColor: colors.champagne,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.dark,
    textAlign: 'center',
    marginBottom: 8,
  },
  infoModalBody: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 21,
  },
  modalCloseBtn: {
    width: '100%',
    height: 48,
    marginTop: 20,
    borderRadius: 14,
  },
  infoFieldsList: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  infoFieldRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoFieldValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.dark,
    marginTop: 2,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
});
