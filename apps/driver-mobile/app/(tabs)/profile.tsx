import React, { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Car,
  ChevronRight,
  FileBadge,
  Globe,
  HelpCircle,
  Info,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
} from 'lucide-react-native';
import { CardShadow, Colors, Radius, Spacing } from '../../src/theme/tokens';
import { useDriverStore } from '../../src/store/useDriverStore';
import { DriverLanguage } from '../../src/types/driver.types';
import { StatusPill } from '../../src/components/StatusPill';
import { ConfirmModal } from '../../src/components/ConfirmModal';

const LANGUAGES: Array<{ code: DriverLanguage; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'am', label: 'አማርኛ (Amharic)' },
  { code: 'om', label: 'Afaan Oromoo' },
  { code: 'ti', label: 'ትግርኛ (Tigrigna)' },
];

export default function DriverProfileScreen() {
  const profile = useDriverStore((s) => s.profile);
  const language = useDriverStore((s) => s.language);
  const setLanguage = useDriverStore((s) => s.setLanguage);
  const pushAlertsEnabled = useDriverStore((s) => s.pushAlertsEnabled);
  const togglePushAlerts = useDriverStore((s) => s.togglePushAlerts);
  const soundAlertsEnabled = useDriverStore((s) => s.soundAlertsEnabled);
  const toggleSoundAlerts = useDriverStore((s) => s.toggleSoundAlerts);
  const logout = useDriverStore((s) => s.logout);

  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<'SUPPORT' | 'ABOUT' | null>(null);

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Driver Header Card */}
        <View style={styles.profileCard}>
          <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          <Text style={styles.name}>{profile.fullName}</Text>
          <Text style={styles.code}>
            {profile.driverCode} • {profile.city}, Ethiopia
          </Text>
          <View style={{ marginTop: 8 }}>
            <StatusPill status={profile.verificationStatus} />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.totalTrips}</Text>
              <Text style={styles.statLabel}>Trips</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.rating.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.acceptanceRate}%</Text>
              <Text style={styles.statLabel}>Acceptance</Text>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Contact Information</Text>
          <View style={styles.infoRow}>
            <Phone size={16} color={Colors.secondaryText} />
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{profile.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Mail size={16} color={Colors.secondaryText} />
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {profile.email}
            </Text>
          </View>
        </View>

        {/* Vehicle & License Information */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Vehicle &amp; Commercial License</Text>
          <View style={styles.infoRow}>
            <Car size={16} color={Colors.secondaryText} />
            <Text style={styles.infoLabel}>Vehicle</Text>
            <Text style={styles.infoValue}>
              {profile.vehicle.year} {profile.vehicle.make} {profile.vehicle.model}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <ShieldCheck size={16} color={Colors.secondaryText} />
            <Text style={styles.infoLabel}>Plate</Text>
            <Text style={styles.infoValue}>{profile.vehicle.plateNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <FileBadge size={16} color={Colors.secondaryText} />
            <Text style={styles.infoLabel}>License</Text>
            <Text style={styles.infoValue}>
              {profile.license.licenseNumber} (Exp {profile.license.expiryDate})
            </Text>
          </View>
        </View>

        {/* Settings & Language */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Preferences &amp; Settings</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Dispatch Push Alerts (UI)</Text>
            <Switch
              value={pushAlertsEnabled}
              onValueChange={togglePushAlerts}
              trackColor={{ false: Colors.primarySilver, true: Colors.primaryBlack }}
              thumbColor={Colors.cardWhite}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Trip Sound Cues (UI)</Text>
            <Switch
              value={soundAlertsEnabled}
              onValueChange={toggleSoundAlerts}
              trackColor={{ false: Colors.primarySilver, true: Colors.primaryBlack }}
              thumbColor={Colors.cardWhite}
            />
          </View>

          <View style={styles.langBlock}>
            <View style={styles.langHeader}>
              <Globe size={16} color={Colors.secondaryText} />
              <Text style={styles.switchLabel}>App Language</Text>
            </View>
            <View style={styles.langGrid}>
              {LANGUAGES.map((item) => {
                const active = language === item.code;
                return (
                  <Pressable
                    key={item.code}
                    onPress={() => setLanguage(item.code)}
                    style={[styles.langChip, active && styles.langChipActive]}
                  >
                    <Text style={[styles.langText, active && styles.langTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Help & About */}
        <View style={styles.card}>
          <Pressable onPress={() => setInfoModal('SUPPORT')} style={styles.menuRow}>
            <HelpCircle size={18} color={Colors.primaryBlack} />
            <Text style={styles.menuText}>Help &amp; Support</Text>
            <ChevronRight size={18} color={Colors.secondaryText} />
          </Pressable>
          <View style={styles.menuDivider} />
          <Pressable onPress={() => setInfoModal('ABOUT')} style={styles.menuRow}>
            <Info size={18} color={Colors.primaryBlack} />
            <Text style={styles.menuText}>About Kings Taxi</Text>
            <ChevronRight size={18} color={Colors.secondaryText} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => setLogoutConfirmOpen(true)}
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.9 }]}
        >
          <LogOut size={18} color={Colors.cardWhite} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      <ConfirmModal
        visible={logoutConfirmOpen}
        title="Sign Out of Driver App?"
        message="You will be signed out of this Phase 1 driver session and returned to the login screen."
        confirmLabel="Sign Out"
        destructive
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          logout();
        }}
        onCancel={() => setLogoutConfirmOpen(false)}
      />

      <Modal
        visible={infoModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {infoModal === 'SUPPORT' ? 'Driver Help & Support' : 'About Kings Taxi Driver'}
            </Text>
            <Text style={styles.modalBody}>
              {infoModal === 'SUPPORT'
                ? 'For dispatch assistance, document verification, or account questions, contact Gondar Fleet Operations at support@kingstaxi.et.'
                : 'Kings Taxi Driver App (Phase 1 UI/UX Prototype). Designed for Ethiopian fleet partners with silver-obsidian automotive clarity.'}
            </Text>
            <Pressable onPress={() => setInfoModal(null)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.screenBg },
  content: { padding: Spacing.lg, paddingBottom: 36, gap: Spacing.md },
  profileCard: {
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    ...CardShadow,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2,
    borderColor: Colors.primarySilver,
    marginBottom: Spacing.md,
  },
  name: { fontSize: 20, fontWeight: '800', color: Colors.primaryBlack },
  code: { fontSize: 13, color: Colors.secondaryText, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    width: '100%',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: '800', color: Colors.primaryBlack },
  statLabel: { fontSize: 11, color: Colors.secondaryText, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.border },
  card: {
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...CardShadow,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  infoLabel: { fontSize: 13, color: Colors.secondaryText, width: 64 },
  infoValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryBlack,
    textAlign: 'right',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: Colors.primaryBlack },
  langBlock: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  langHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Colors.screenBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langChipActive: {
    backgroundColor: Colors.primaryBlack,
    borderColor: Colors.primaryBlack,
  },
  langText: { fontSize: 12, fontWeight: '700', color: Colors.primaryBlack },
  langTextActive: { color: Colors.cardWhite },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  menuText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.primaryBlack },
  menuDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 6 },
  logoutBtn: {
    backgroundColor: Colors.primaryBlack,
    borderRadius: Radius.md,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.xs,
  },
  logoutText: { color: Colors.cardWhite, fontSize: 15, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primaryBlack,
    marginBottom: Spacing.sm,
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.secondaryText,
    marginBottom: Spacing.xl,
  },
  modalCloseBtn: {
    backgroundColor: Colors.primaryBlack,
    borderRadius: Radius.md,
    paddingVertical: 11,
    alignItems: 'center',
  },
  modalCloseText: { color: Colors.cardWhite, fontSize: 14, fontWeight: '700' },
});
