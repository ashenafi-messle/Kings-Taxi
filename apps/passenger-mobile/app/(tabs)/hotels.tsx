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

const CITIES = ['All Cities', 'Addis Ababa', 'Bahir Dar', 'Hawassa', 'Lalibela'];

export default function HotelsTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHotels = mockHotels.filter((hotel) => {
    const matchesCity =
      selectedCity === 'All Cities' ||
      hotel.city.toLowerCase() === selectedCity.toLowerCase();
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
          <Text style={styles.headerTitle}>Hotels & Resorts</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Verified luxury, boutique & resort stays across Ethiopia
        </Text>

        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by hotel name or location..."
          style={styles.searchBar}
        />

        {/* City Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityPillsContainer}
        >
          {CITIES.map((city) => {
            const isSelected = selectedCity === city;
            return (
              <TouchableOpacity
                key={city}
                style={[styles.cityPill, isSelected && styles.cityPillActive]}
                onPress={() => setSelectedCity(city)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                {city !== 'All Cities' && (
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
                  {city}
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
            title="No Hotels Found"
            description="Try modifying your search or selecting a different city filter."
            actionTitle="Reset Filters"
            onAction={() => {
              setSearchQuery('');
              setSelectedCity('All Cities');
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
