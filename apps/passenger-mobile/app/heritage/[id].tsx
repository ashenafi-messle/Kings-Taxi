import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  MapPin,
  Clock,
  Award,
  Calendar,
  Sparkles,
  Ticket,
  ChevronRight,
  Car,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import { AppHeader, PrimaryButton, SecondaryButton } from '../../src/components';
import { mockHeritageSites } from '../../src/mocks';
import { formatETB } from '../../src/utils/currency';
import { useTranslation } from '../../src/i18n';

export default function HeritageDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { t } = useTranslation(['heritage', 'common', 'navigation']);

  const site = mockHeritageSites.find((s) => s.id === id) || mockHeritageSites[0];

  const handleStartContractWithSite = () => {
    router.push('/tours/contract-builder');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={site.name} showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <Image source={{ uri: site.heroImage }} style={styles.heroImage} />

        {/* Identity & UNESCO Pill */}
        <View style={styles.headerCard}>
          <View style={styles.titleRow}>
            <Text style={styles.siteTitle}>{site.name}</Text>
          </View>
          <View style={styles.regionRow}>
            <MapPin size={14} color={theme.colors.heritageAccent} />
            <Text style={styles.regionText}>{site.region}</Text>
          </View>

          {site.unescoDesignated && (
            <View style={styles.unescoPill}>
              <Award size={14} color="#8B5CF6" />
              <Text style={styles.unescoText}>
                {t('categories.unesco')} ({site.unescoYear || 1978})
              </Text>
            </View>
          )}

          {/* Practical Visit Info Grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Clock size={16} color={theme.colors.textMuted} />
              <Text style={styles.infoColLabel}>{t('recommendedDuration')}</Text>
              <Text style={styles.infoColValue}>{site.recommendedDuration}</Text>
            </View>
            <View style={styles.infoColDivider} />
            <View style={styles.infoCol}>
              <Ticket size={16} color={theme.colors.textMuted} />
              <Text style={styles.infoColLabel}>{t('entryFee')}</Text>
              <Text style={styles.infoColValue}>{formatETB(site.entryFeeETB)}</Text>
            </View>
          </View>
        </View>

        {/* Historical Context Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('historicalOverview')}</Text>
          <Text style={styles.bodyText}>{site.historicalOverview}</Text>
        </View>

        {/* Cultural Significance */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('categories.cultural')}</Text>
          <Text style={styles.bodyText}>{site.culturalSignificance}</Text>
        </View>

        {/* Key Highlights */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('highlights')}</Text>
          <View style={styles.highlightsWrap}>
            {site.keyHighlights.map((hl, index) => (
              <View key={index} style={styles.highlightItem}>
                <Sparkles size={14} color={theme.colors.primaryDark} />
                <Text style={styles.highlightText}>{hl}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Visiting Guidelines */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('visitorInfo')}</Text>
          <Text style={styles.bodyText}>
            {site.visitingHours}. {t('guidedTourAvailable')}.
          </Text>
        </View>

        {/* Chauffeured Full-Contract Tour CTA Banner */}
        <View style={styles.contractBanner}>
          <View style={styles.contractIconCircle}>
            <Car size={24} color={theme.colors.secondary} />
          </View>
          <View style={styles.contractTextWrap}>
            <Text style={styles.contractBannerTitle}>{t('transportOptions')}</Text>
            <Text style={styles.contractBannerDesc}>
              {t('customTour.subtitle')}
            </Text>
            <PrimaryButton
              title={t('bookTourBtn')}
              onPress={handleStartContractWithSite}
              style={styles.addContractBtn}
            />
          </View>
        </View>
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
    paddingBottom: theme.spacing.xxl,
  },
  heroImage: {
    width: '100%',
    height: 230,
    backgroundColor: theme.colors.surfaceMuted,
  },
  headerCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  siteTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  regionText: {
    ...theme.typography.captionBold,
    color: theme.colors.heritageAccent,
  },
  unescoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  unescoText: {
    ...theme.typography.captionBold,
    color: '#7C3AED',
  },
  infoGrid: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  infoCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoColDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  infoColLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  infoColValue: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  bodyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  highlightsWrap: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  highlightText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    flex: 1,
  },
  contractBanner: {
    backgroundColor: '#F8FAFC',
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    gap: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  contractIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  contractTextWrap: {
    flex: 1,
  },
  contractBannerTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.secondary,
  },
  contractBannerDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  addContractBtn: {
    marginTop: theme.spacing.sm,
  },
});
