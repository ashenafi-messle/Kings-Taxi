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
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import { ConfirmationModal } from '../../src/components';
import { useAuthStore, useSettingsStore } from '../../src/stores';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../src/i18n';

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

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
    router.replace('/(auth)/welcome');
  };

  const getLanguageLabel = (lang: string) => {
    const found = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
    return found ? `${found.nativeName} (${found.name})` : 'English';
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
                <Text style={styles.ratingText}>{user?.rating || 4.9} ★</Text>
              </View>
              <Text style={styles.tripsCount}>
                {t('verifiedPassenger')}
              </Text>
            </View>
          </View>
        </View>

        {/* Section: Account & Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderTitle}>{t('sections.account')}</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/payments/checkout')}
          >
            <View style={styles.menuIconCircle}>
              <CreditCard size={18} color={theme.colors.primaryDark} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.paymentMethods')}</Text>
              <Text style={styles.menuSubtitle}>Telebirr, CBE Birr, Chapa</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/settings/language')}
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

        {/* Section: Support & Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderTitle}>{t('sections.support')}</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/support/index')}
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
              <Text style={styles.menuTitle}>{t('items.termsOfService')} & {t('items.privacyPolicy')}</Text>
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
        >
          <LogOut size={18} color={theme.colors.danger} />
          <Text style={styles.logoutText}>{t('items.logout')}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Kings Taxi Passenger Mobile v1.0.0 (Build 520)</Text>
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
    marginTop: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    ...theme.typography.captionBold,
    color: theme.colors.primaryDark,
    fontSize: 11,
  },
  tripsCount: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  sectionHeaderTitle: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginVertical: theme.spacing.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  menuSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.dangerLight,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  logoutText: {
    ...theme.typography.bodyBold,
    color: theme.colors.danger,
  },
  versionText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
});
