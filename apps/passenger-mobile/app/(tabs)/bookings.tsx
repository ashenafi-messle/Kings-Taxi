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
import { theme } from '../../src/theme';
import { BookingCard, BookingSummaryItem, EmptyState } from '../../src/components';
import { useRideStore, useBookingStore } from '../../src/stores';
import { useTranslation } from '../../src/i18n';

type TabType = 'all' | 'rides' | 'hotels' | 'tours';

export default function BookingsScreen() {
  const router = useRouter();
  const { t } = useTranslation(['bookings', 'navigation', 'common']);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const { rideHistory } = useRideStore();
  const { hotelReservations, tourContracts } = useBookingStore();

  const formattedRides: BookingSummaryItem[] = rideHistory.map((r) => ({
    id: r.id,
    type: 'ride',
    title: `${r.pickup.title.split(',')[0]} → ${r.destination.title.split(',')[0]}`,
    subtitle: `${r.vehicleCategory.toUpperCase()} • Driver: ${r.driver?.name || 'Assigned'}`,
    date: r.createdAt,
    priceETB: r.finalPrice || r.estimatedPrice,
    status: r.status,
  }));

  const formattedHotels: BookingSummaryItem[] = hotelReservations.map((h) => ({
    id: h.id,
    type: 'hotel',
    title: h.hotelName,
    subtitle: `${h.roomTitle} • ${h.nightsCount} Nights (${h.guestsCount} Guests)`,
    date: h.checkInDate,
    priceETB: h.totalPriceETB,
    status: h.status,
  }));

  const formattedTours: BookingSummaryItem[] = tourContracts.map((t) => ({
    id: t.id,
    type: 'tour',
    title: `Full Contract: ${t.selectedStops.map((s) => s.siteName.split(' ')[0]).join(' + ')}`,
    subtitle: `${t.vehicleCategory.toUpperCase()} • ${t.durationDays} Day chauffeured contract`,
    date: t.startDate,
    priceETB: t.estimatedPriceETB,
    status: t.status,
  }));

  const allBookings = [...formattedRides, ...formattedHotels, ...formattedTours].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const displayedBookings = allBookings.filter((b) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'rides') return b.type === 'ride';
    if (activeTab === 'hotels') return b.type === 'hotel';
    if (activeTab === 'tours') return b.type === 'tour';
    return true;
  });

  const handleBookingPress = (booking: BookingSummaryItem) => {
    if (booking.type === 'ride') {
      router.push('/rides/receipt');
    } else if (booking.type === 'hotel') {
      // Navigate to hotel details
      const hotelRes = hotelReservations.find((h) => h.id === booking.id);
      if (hotelRes) {
        router.push({ pathname: '/hotels/[id]', params: { id: hotelRes.hotelId } });
      }
    } else if (booking.type === 'tour') {
      router.push('/tours/contract-builder');
    }
  };

  const getTabLabel = (tab: TabType) => {
    switch (tab) {
      case 'all':
        return t('common:viewAll');
      case 'rides':
        return t('card.rideType');
      case 'hotels':
        return t('card.hotelType');
      case 'tours':
        return t('card.tourType');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('navigation:tabs.bookings')}</Text>
        <Text style={styles.headerSubtitle}>
          {t('navigation:tabs.bookingsA11y')}
        </Text>

        {/* Tab Filters */}
        <View style={styles.tabsRow}>
          {(['all', 'rides', 'hotels', 'tours'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === tab && styles.tabButtonTextActive,
                ]}
              >
                {getTabLabel(tab)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollList}
        showsVerticalScrollIndicator={false}
      >
        {displayedBookings.length === 0 ? (
          <EmptyState
            title={t('emptyState.activeTitle')}
            description={t('emptyState.activeSubtitle')}
            actionTitle={t('common:seeMore')}
            onAction={() => router.push('/(tabs)/explore')}
          />
        ) : (
          displayedBookings.map((booking) => (
            <BookingCard
              key={`${booking.type}_${booking.id}`}
              booking={booking}
              onPress={() => handleBookingPress(booking)}
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
    marginBottom: theme.spacing.md,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: theme.colors.primaryDark,
  },
  tabButtonText: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
  },
  tabButtonTextActive: {
    color: theme.colors.text,
  },
  scrollList: {
    padding: theme.spacing.md,
    paddingBottom: theme.layout.tabBarContentPadding,
  },
});
