import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Hotel as HotelIcon,
  MapPin,
  Coffee,
  Plane,
  Clock,
  Users,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../src/theme';
import { SearchInput, HotelCard, EmptyState } from '../../src/components';
import { HotelService } from '../../src/services/hotel.service';
import { Hotel, Lounge } from '../../src/types';
import { formatETB } from '../../src/utils/currency';
import { useTranslation } from '../../src/i18n';

interface CityFilter {
  id: string;
  name: string;
  labelKey: string;
}

const CITY_OPTIONS: CityFilter[] = [
  { id: 'ALL', name: 'All Cities', labelKey: 'allCities' },
  { id: 'Gondar', name: 'Gondar (GDQ)', labelKey: 'cities.gondar' },
  { id: 'Addis Ababa', name: 'Addis Ababa', labelKey: 'cities.addisAbaba' },
  { id: 'Bahir Dar', name: 'Bahir Dar', labelKey: 'cities.bahirDar' },
  { id: 'Hawassa', name: 'Hawassa', labelKey: 'cities.hawassa' },
  { id: 'Lalibela', name: 'Lalibela', labelKey: 'cities.lalibela' },
];

export default function HotelsTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['hotels', 'home', 'common']);

  const [activeCategory, setActiveCategory] = useState<'HOTELS' | 'LOUNGES'>('HOTELS');
  const [selectedCityId, setSelectedCityId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [lounges, setLounges] = useState<Lounge[]>([]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);
    try {
      if (activeCategory === 'HOTELS') {
        const res = await HotelService.searchHotels(searchQuery, selectedCityId);
        if (res.success && res.data) {
          setHotels(res.data);
        } else {
          setErrorMessage(res.error || 'Unable to retrieve partner hotels at this time.');
        }
      } else {
        const res = await HotelService.listLounges(selectedCityId);
        if (res.success && res.data) {
          let list = res.data;
          if (searchQuery) {
            list = list.filter(
              (l) =>
                l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                l.address.toLowerCase().includes(searchQuery.toLowerCase())
            );
          }
          setLounges(list);
        } else {
          setErrorMessage(res.error || 'Unable to retrieve VIP lounges at this time.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network connection issue. Please check your internet connection.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeCategory, selectedCityId, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {/* Title and Top Section */}
        <View style={styles.headerTitleRow}>
          <HotelIcon size={22} color={theme.colors.antiqueGold} />
          <Text style={styles.headerTitle}>Kings Hospitality</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Curated luxury hotels, airport transfers & premium lounges in Gondar and across Ethiopia.
        </Text>

        {/* Category Switcher: Hotels vs Lounges */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, activeCategory === 'HOTELS' && styles.tabButtonActive]}
            onPress={() => setActiveCategory('HOTELS')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeCategory === 'HOTELS' }}
          >
            <HotelIcon
              size={16}
              color={activeCategory === 'HOTELS' ? theme.colors.antiqueGold : theme.colors.textMuted}
            />
            <Text
              style={[styles.tabButtonText, activeCategory === 'HOTELS' && styles.tabButtonTextActive]}
            >
              Luxury Hotels
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeCategory === 'LOUNGES' && styles.tabButtonActive]}
            onPress={() => setActiveCategory('LOUNGES')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeCategory === 'LOUNGES' }}
          >
            <Coffee
              size={16}
              color={activeCategory === 'LOUNGES' ? theme.colors.antiqueGold : theme.colors.textMuted}
            />
            <Text
              style={[styles.tabButtonText, activeCategory === 'LOUNGES' && styles.tabButtonTextActive]}
            >
              VIP Lounges
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={
            activeCategory === 'HOTELS'
              ? 'Search hotels, locations or amenities...'
              : 'Search lounges, terraces & airport VIP spaces...'
          }
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
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollList,
          { paddingBottom: theme.layout.tabBarContentPadding + insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            colors={[theme.colors.antiqueGold]}
            tintColor={theme.colors.antiqueGold}
          />
        }
      >
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={28} color="#D32F2F" />
            <Text style={styles.errorTitle}>Connection Problem</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => loadData(false)}
              activeOpacity={0.8}
            >
              <RefreshCw size={14} color="#FFF" />
              <Text style={styles.retryButtonText}>Retry Loading</Text>
            </TouchableOpacity>
          </View>
        ) : isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primaryDark} />
            <Text style={styles.loadingText}>Loading curated hospitality destinations...</Text>
          </View>
        ) : activeCategory === 'HOTELS' ? (
          hotels.length === 0 ? (
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
            hotels.map((hotel) => (
              <View key={hotel.id} style={styles.cardWrapper}>
                <HotelCard
                  hotel={hotel}
                  onPress={() =>
                    router.push({
                      pathname: '/hotels/[id]',
                      params: { id: hotel.id },
                    })
                  }
                />
                {/* Fixed Gondar Airport Pickup Badge */}
                <View style={styles.transferBadge}>
                  <Plane size={12} color="#0D5C3A" />
                  <Text style={styles.transferBadgeText}>
                    Direct Gondar Airport (GDQ) Transfer Available
                  </Text>
                </View>
              </View>
            ))
          )
        ) : lounges.length === 0 ? (
          <EmptyState
            title="No Lounges Found"
            description="No lounges matching your current search or city filter."
            actionTitle="Reset Filters"
            onAction={() => {
              setSearchQuery('');
              setSelectedCityId('ALL');
            }}
          />
        ) : (
          lounges.map((lounge) => (
            <TouchableOpacity
              key={lounge.id}
              activeOpacity={0.88}
              style={styles.loungeCard}
              onPress={() => {
                // Navigate or prompt reservation
                router.push({
                  pathname: '/hotels/reserve',
                  params: {
                    hotelId: 'goha-hotel-gondar',
                    loungeId: lounge.id,
                  },
                });
              }}
            >
              <Image source={{ uri: lounge.coverImage }} style={styles.loungeImage} />
              <View style={styles.loungeOverlayTag}>
                <Sparkles size={11} color="#FFF" />
                <Text style={styles.loungeOverlayText}>VIP LOUNGE</Text>
              </View>

              <View style={styles.loungeContent}>
                <View style={styles.loungeHeaderRow}>
                  <Text style={styles.loungeTitle} numberOfLines={1}>
                    {lounge.name}
                  </Text>
                  <View style={styles.cityPillSmall}>
                    <MapPin size={10} color={theme.colors.hotelAccent} />
                    <Text style={styles.cityPillSmallText}>{lounge.city}</Text>
                  </View>
                </View>

                <Text style={styles.loungeAddress} numberOfLines={1}>
                  {lounge.address}
                </Text>

                <Text style={styles.loungeDesc} numberOfLines={2}>
                  {lounge.description}
                </Text>

                <View style={styles.loungeMetaRow}>
                  <View style={styles.loungeMetaItem}>
                    <Clock size={12} color={theme.colors.textMuted} />
                    <Text style={styles.loungeMetaText}>{lounge.openingHours || '07:00 - 23:00'}</Text>
                  </View>
                  <View style={styles.loungeMetaItem}>
                    <Users size={12} color={theme.colors.textMuted} />
                    <Text style={styles.loungeMetaText}>Capacity: {lounge.capacity} guests</Text>
                  </View>
                </View>

                <View style={styles.loungeFooterRow}>
                  <View>
                    <Text style={styles.startingFrom}>Pass Rate</Text>
                    <Text style={styles.loungePrice}>
                      {formatETB(lounge.pricePerPerson)}
                      <Text style={styles.perPerson}> / guest</Text>
                    </Text>
                  </View>
                  <View style={styles.reserveBtn}>
                    <Text style={styles.reserveBtnText}>Reserve Pass</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
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
    borderBottomWidth: 1.5,
    borderBottomColor: theme.colors.borderGold,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#FAF4DC',
    borderRadius: theme.borderRadius.md,
    padding: 3,
    marginBottom: theme.spacing.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
  },
  tabButtonActive: {
    backgroundColor: '#FAF2D3',
    borderWidth: 1,
    borderColor: theme.colors.brightGold,
    ...theme.shadows.subtle,
  },
  tabButtonText: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
  },
  tabButtonTextActive: {
    color: theme.colors.antiqueGold,
    fontWeight: '800',
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
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
  },
  cityPillActive: {
    backgroundColor: theme.colors.antiqueGold,
    borderColor: theme.colors.brightGold,
  },
  cityPillText: {
    ...theme.typography.captionBold,
    color: theme.colors.deepChocolateLight,
  },
  cityPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollList: {
    padding: theme.spacing.md,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  cardWrapper: {
    position: 'relative',
    marginBottom: theme.spacing.sm,
  },
  transferBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#CEEAD6',
    borderRadius: theme.borderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: -8,
    marginBottom: theme.spacing.md,
    marginHorizontal: 4,
  },
  transferBadgeText: {
    ...theme.typography.captionBold,
    color: '#0D5C3A',
    fontSize: 11,
  },
  loungeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    marginBottom: theme.spacing.md,
    ...theme.shadows.cardGold,
  },
  loungeImage: {
    width: '100%',
    height: 160,
    backgroundColor: theme.colors.surfaceMuted,
  },
  loungeOverlayTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.deepChocolate,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.brightGold,
  },
  loungeOverlayText: {
    ...theme.typography.captionBold,
    color: theme.colors.champagneGold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  loungeContent: {
    padding: theme.spacing.md,
  },
  loungeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  loungeTitle: {
    ...theme.typography.h3,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  cityPillSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  cityPillSmallText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  loungeAddress: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  loungeDesc: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  loungeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 10,
  },
  loungeMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  loungeMetaText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  loungeFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  startingFrom: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  loungePrice: {
    ...theme.typography.h3,
    color: theme.colors.antiqueGold,
    fontWeight: '700',
  },
  perPerson: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  reserveBtn: {
    backgroundColor: theme.colors.antiqueGold,
    borderWidth: 1,
    borderColor: theme.colors.brightGold,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
  },
  reserveBtnText: {
    ...theme.typography.captionBold,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginHorizontal: 16,
    marginVertical: 24,
    backgroundColor: '#FFF5F5',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorTitle: {
    ...theme.typography.h3,
    color: '#C62828',
    marginTop: 12,
    marginBottom: 6,
    fontWeight: '700',
  },
  errorMessage: {
    ...theme.typography.body,
    color: '#5D4037',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.antiqueGold,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    ...theme.typography.captionBold,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
