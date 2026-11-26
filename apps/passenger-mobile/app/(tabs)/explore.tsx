import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Compass, Landmark, Route } from 'lucide-react-native';
import { theme } from '../../src/theme';
import {
  SearchInput,
  HeritageCard,
  EmptyState,
} from '../../src/components';
import { HeritageService } from '../../src/services/heritage.service';
import { HeritageSite } from '../../src/types';
import { useTranslation } from '../../src/i18n';

type CategoryFilter = 'all' | 'heritage' | 'tours';

export default function ExploreScreen() {
  const router = useRouter();
  const { t } = useTranslation(['heritage', 'home', 'common']);
  const [selectedFilter, setSelectedFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [heritageSites, setHeritageSites] = useState<HeritageSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadExploreData = useCallback(async () => {
    setIsLoading(true);
    try {
      const sitesRes = await HeritageService.getAllSites();
      if (sitesRes.success && Array.isArray(sitesRes.data)) {
        setHeritageSites(sitesRes.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExploreData();
    }, [loadExploreData])
  );

  const filteredHeritage = heritageSites.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasResults = filteredHeritage.length > 0;

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
              color={selectedFilter === 'all' ? theme.colors.antiqueGold : theme.colors.textMuted}
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
            style={[styles.filterPill, selectedFilter === 'heritage' && styles.filterPillActive]}
            onPress={() => setSelectedFilter('heritage')}
          >
            <Landmark
              size={14}
              color={selectedFilter === 'heritage' ? theme.colors.antiqueGold : theme.colors.textMuted}
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
              color={selectedFilter === 'tours' ? theme.colors.antiqueGold : theme.colors.textMuted}
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
        {isLoading && heritageSites.length === 0 ? (
          <View style={{ paddingVertical: 48, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.antiqueGold} />
          </View>
        ) : !hasResults ? (
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
    borderBottomWidth: 1.5,
    borderBottomColor: theme.colors.borderGold,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.deepChocolate,
    fontWeight: '800',
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
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
  },
  filterPillActive: {
    backgroundColor: theme.colors.paleGold,
    borderColor: theme.colors.brightGold,
  },
  filterPillText: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
  },
  filterPillTextActive: {
    color: theme.colors.deepChocolate,
    fontWeight: '700',
  },
  scrollList: {
    padding: theme.spacing.md,
    paddingBottom: theme.layout.tabBarContentPadding,
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
