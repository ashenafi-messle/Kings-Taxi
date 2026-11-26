import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  MapPin,
  Clock,
  Award,
  Sparkles,
  Ticket,
  Car,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import { AppHeader, PrimaryButton, RoomImageCarousel } from '../../src/components';
import { HeritageService } from '../../src/services/heritage.service';
import { HeritageSite } from '../../src/types';
import { formatETB } from '../../src/utils/currency';
import { useTranslation } from '../../src/i18n';

export default function HeritageDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { t } = useTranslation(['heritage', 'common', 'navigation']);
  const siteId = Array.isArray(id) ? id[0] || '' : id || '';
  const [site, setSite] = useState<HeritageSite | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSite = useCallback(async () => {
    if (!siteId) return;
    setIsLoading(true);
    try {
      const res = await HeritageService.getSiteById(siteId);
      if (res.success && res.data) {
        setSite(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [siteId]);

  useFocusEffect(
    useCallback(() => {
      loadSite();
    }, [loadSite])
  );

  if (isLoading && !site) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Heritage Destination" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.antiqueGold} />
        </View>
      </SafeAreaView>
    );
  }

  if (!site) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Destination Not Found" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={styles.bodyText}>Heritage destination is currently unavailable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const galleryImages: string[] =
    (site as any).galleryImages && (site as any).galleryImages.length > 0
      ? (site as any).galleryImages
      : [site.heroImage];
  const highlightsList: string[] =
    (site as any).highlights || site.keyHighlights || [];
  const visitingInfo =
    (site as any).visitingRules || site.visitingHours || 'Open daily for guided tours';

  const handleStartContractWithSite = () => {
    router.push({
      pathname: '/tours/book',
      params: { siteId: site.id },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={site.name} showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <RoomImageCarousel images={galleryImages} roomTitle={site.name} height={240} />

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
              <Award size={14} color={theme.colors.primary} />
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
        {highlightsList.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('highlights')}</Text>
            <View style={styles.highlightsWrap}>
              {highlightsList.map((hl, index) => (
                <View key={index} style={styles.highlightItem}>
                  <Sparkles size={14} color={theme.colors.primaryDark} />
                  <Text style={styles.highlightText}>{hl}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Visiting Guidelines */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('visitorInfo')}</Text>
          <Text style={styles.bodyText}>
            {visitingInfo}. {t('guidedTourAvailable')}.
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
    color: theme.colors.primary,
  },
  unescoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  unescoText: {
    ...theme.typography.captionBold,
    color: theme.colors.primaryDark,
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
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: theme.colors.borderGold,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
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
    backgroundColor: '#FAF4DC',
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    flexDirection: 'row',
    gap: theme.spacing.md,
    ...theme.shadows.cardGold,
  },
  contractIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FAF2D3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
  },
  contractTextWrap: {
    flex: 1,
  },
  contractBannerTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.primaryDark,
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
