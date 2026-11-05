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
import { Hotel as HotelIcon, MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../src/theme';
import { SearchInput, HotelCard, EmptyState } from '../../src/components';
import { mockHotels } from '../../src/mocks';
import { useTranslation } from '../../src/i18n';

interface CityFilter {
  id: string;
  name: string;
  labelKey: string;
}

const CITY_OPTIONS: CityFilter[] = [
  { id: 'ALL', name: 'All Cities', labelKey: 'allCities' },
  { id: 'Addis Ababa', name: 'Addis Ababa', labelKey: 'cities.addisAbaba' },
  { id: 'Bahir Dar', name: 'Bahir Dar', labelKey: 'cities.bahirDar' },
  { id: 'Hawassa', name: 'Hawassa', labelKey: 'cities.hawassa' },
  { id: 'Lalibela', name: 'Lalibela', labelKey: 'cities.lalibela' },
];

export default function HotelsTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['hotels', 'home', 'common']);
  const [selectedCityId, setSelectedCityId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHotels = mockHotels.filter((hotel) => {
    const matchesCity =
      selectedCityId === 'ALL' ||
      hotel.city.toLowerCase() === selectedCityId.toLowerCase();
    const matchesSearch =
      hotel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hotel.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hotel.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCity && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <HotelIcon size={22} color={theme.colors.hotelAccent} />
          <Text style={styles.headerTitle}>{t('home:services.hotelsTitle')}</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {t('home:services.hotelsSubtitle')}
        </Text>

        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('hotels:searchPlaceholder')}
          style={styles.searchBar}
        />

        {/* City Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityPillsContainer}
        >
          {CITY_OPTIONS.map((item) => {
            const isSelected = selectedCityId === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.cityPill, isSelected && styles.cityPillActive]}
                onPress={() => setSelectedCityId(item.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                {item.id !== 'ALL' && (
                  <MapPin
                    size={12}
                    color={isSelected ? theme.colors.text : theme.colors.textMuted}
                  />
                )}
                <Text
                  style={[
                    styles.cityPillText,
                    isSelected && styles.cityPillTextActive,
                  ]}
                >
                  {t(item.labelKey as any)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollList,
          { paddingBottom: theme.layout.tabBarContentPadding + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {filteredHotels.length === 0 ? (
          <EmptyState
            title={t('hotels:noHotelsFound')}
            description={t('common:noResults')}
            actionTitle={t('hotels:resetFilters')}
            onAction={() => {
              setSearchQuery('');
              setSelectedCityId('ALL');
            }}
          />
        ) : (
          filteredHotels.map((hotel) => (
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
          ))
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  cityPillsContainer: {
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cityPillActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryDark,
  },
  cityPillText: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
  },
  cityPillTextActive: {
    color: theme.colors.text,
  },
  scrollList: {
    padding: theme.spacing.md,
  },
});
