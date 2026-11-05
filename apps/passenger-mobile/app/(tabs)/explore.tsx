import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Compass, Hotel as HotelIcon, Landmark, Route, Car } from 'lucide-react-native';
import { theme } from '../../src/theme';
import {
  SearchInput,
  HotelCard,
  HeritageCard,
  EmptyState,
} from '../../src/components';
import { mockHotels, mockHeritageSites } from '../../src/mocks';
import { useTranslation } from '../../src/i18n';

type CategoryFilter = 'all' | 'hotels' | 'heritage' | 'tours';

export default function ExploreScreen() {
  const router = useRouter();
  const { t } = useTranslation(['heritage', 'hotels', 'home', 'common']);
  const [selectedFilter, setSelectedFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHotels = mockHotels.filter(
    (h) =>
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredHeritage = mockHeritageSites.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasResults =
    (selectedFilter === 'all' && (filteredHotels.length > 0 || filteredHeritage.length > 0)) ||
    (selectedFilter === 'hotels' && filteredHotels.length > 0) ||
    (selectedFilter === 'heritage' && filteredHeritage.length > 0) ||
    selectedFilter === 'tours';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('home:popularDestinations')}</Text>
        <Text style={styles.headerSubtitle}>
          {t('heritage:customTour.subtitle')}
        </Text>
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('heritage:searchPlaceholder')}
          style={styles.searchBar}
        />

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsContainer}
        >
          <TouchableOpacity
            style={[styles.filterPill, selectedFilter === 'all' && styles.filterPillActive]}
            onPress={() => setSelectedFilter('all')}
          >
            <Compass
              size={14}
              color={selectedFilter === 'all' ? theme.colors.text : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.filterPillText,
                selectedFilter === 'all' && styles.filterPillTextActive,
              ]}
            >
              {t('heritage:categories.all')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, selectedFilter === 'hotels' && styles.filterPillActive]}
            onPress={() => setSelectedFilter('hotels')}
          >
            <HotelIcon
              size={14}
              color={selectedFilter === 'hotels' ? theme.colors.text : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.filterPillText,
                selectedFilter === 'hotels' && styles.filterPillTextActive,
              ]}
            >
              {t('home:services.hotelsTitle')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, selectedFilter === 'heritage' && styles.filterPillActive]}
            onPress={() => setSelectedFilter('heritage')}
          >
            <Landmark
              size={14}
              color={selectedFilter === 'heritage' ? theme.colors.text : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.filterPillText,
                selectedFilter === 'heritage' && styles.filterPillTextActive,
              ]}
            >
              {t('heritage:categories.historical')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, selectedFilter === 'tours' && styles.filterPillActive]}
            onPress={() => setSelectedFilter('tours')}
          >
            <Route
              size={14}
              color={selectedFilter === 'tours' ? theme.colors.text : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.filterPillText,
                selectedFilter === 'tours' && styles.filterPillTextActive,
              ]}
            >
              {t('home:services.customTourTitle')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollList}
        showsVerticalScrollIndicator={false}
      >
        {!hasResults ? (
          <EmptyState
            title={t('common:noResults')}
            description={t('common:empty')}
            actionTitle={t('common:retry')}
            onAction={() => {
              setSearchQuery('');
              setSelectedFilter('all');
            }}
          />
        ) : (
          <>
            {/* Full Contract Tour Builder Callout */}
            {(selectedFilter === 'all' || selectedFilter === 'tours') && (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => router.push('/tours/contract-builder')}
                style={styles.contractCalloutCard}
              >
                <View style={styles.contractCalloutIcon}>
                  <Car size={24} color={theme.colors.secondary} />
                </View>
                <View style={styles.contractCalloutContent}>
                  <Text style={styles.contractCalloutTitle}>
                    {t('heritage:customTour.title')}
                  </Text>
                  <Text style={styles.contractCalloutDesc}>
                    {t('heritage:customTour.subtitle')}
                  </Text>
                  <Text style={styles.contractCalloutAction}>{t('heritage:buildCustomTourBtn')} →</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Heritage Sites Section */}
            {(selectedFilter === 'all' || selectedFilter === 'heritage') && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('heritage:categories.historical')}</Text>
                  <Text style={styles.sectionSubtitle}>
                    {t('heritage:categories.unesco')}
                  </Text>
                </View>
                {filteredHeritage.map((site) => (
                  <HeritageCard
                    key={site.id}
                    site={site}
                    onPress={() =>
                      router.push({
                        pathname: '/heritage/[id]',
                        params: { id: site.id },
                      })
                    }
                  />
                ))}
              </View>
            )}

            {/* Verified Hotels Section */}
            {(selectedFilter === 'all' || selectedFilter === 'hotels') && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Verified Ethiopian Hotels</Text>
                  <Text style={styles.sectionSubtitle}>
                    Curated luxury, resort, and boutique accommodations
                  </Text>
                </View>
                {filteredHotels.map((hotel) => (
                  <HotelCard
                    key={hotel.id}
                    hotel={hotel}
                    onPress={() =>
                      router.push({
                        pathname: '/hotels/[id]',
                        params: { id: hotel.id },
                      })
                    }
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
    marginBottom: theme.spacing.sm,
  },
  searchBar: {
    marginBottom: theme.spacing.sm,
  },
  filterPillsContainer: {
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterPillActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryDark,
  },
  filterPillText: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
  },
  filterPillTextActive: {
    color: theme.colors.text,
  },
  scrollList: {
    padding: theme.spacing.md,
    paddingBottom: theme.layout.tabBarContentPadding,
  },
  contractCalloutCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  contractCalloutIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractCalloutContent: {
    flex: 1,
  },
  contractCalloutTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.secondary,
  },
  contractCalloutDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  contractCalloutAction: {
    ...theme.typography.captionBold,
    color: theme.colors.hotelAccent,
    marginTop: 4,
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  sectionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
