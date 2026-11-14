import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Car,
  Hotel,
  Compass,
  Calendar,
  Clock,
  MapPin,
  User,
  X,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Phone,
  Sparkles,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import {
  BookingCard,
  BookingSummaryItem,
  EmptyState,
  StatusBadge,
} from '../../src/components';
import { PassengerBookingsService } from '../../src/services/passengerBookings.service';
import {
  UnifiedBookingItem,
  PassengerBookingHistorySummary,
  BookingHistoryPagination,
  BookingFilterType,
} from '../../src/types';
import { formatETB } from '../../src/utils/currency';
import { formatDateShort } from '../../src/utils/date';
import { useTranslation } from '../../src/i18n';
import { useAuthStore } from '../../src/stores/auth.store';

type TabType = 'ALL' | 'RIDE' | 'HOTEL' | 'LOUNGE' | 'HERITAGE';

interface TabConfig {
  key: TabType;
  label: string;
}

export default function BookingsScreen() {
  const router = useRouter();
  const { t } = useTranslation(['bookings', 'navigation', 'common']);
  const token = useAuthStore((s) => s.token);

  // Filters & Pagination State
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [items, setItems] = useState<UnifiedBookingItem[]>([]);
  const [summary, setSummary] = useState<PassengerBookingHistorySummary | null>(null);
  const [pagination, setPagination] = useState<BookingHistoryPagination | null>(null);

  // Loading & Network States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected Booking Detail Modal
  const [selectedItem, setSelectedItem] = useState<UnifiedBookingItem | null>(null);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  const tabs: TabConfig[] = useMemo(
    () => [
      { key: 'ALL', label: t('common:viewAll', 'All') },
      { key: 'RIDE', label: t('card.rideType', 'Rides') },
      { key: 'HOTEL', label: t('card.hotelType', 'Hotels') },
      { key: 'LOUNGE', label: t('card.loungeType', 'Lounges') },
      { key: 'HERITAGE', label: t('card.tourType', 'Heritage Tours') },
    ],
    [t]
  );

  /**
   * Fetch bookings from unified backend service
   */
  const loadBookings = useCallback(
    async (tab: TabType, page: number = 1, append: boolean = false) => {
      if (page === 1 && !append) {
        setIsLoading(true);
        setErrorMessage(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const res = await PassengerBookingsService.getBookingsHistory({
          type: tab,
          page,
          limit: 15,
          sort: 'NEWEST',
        });

        if (res.success && res.data) {
          if (append) {
            setItems((prev) => [...prev, ...res.data.items]);
          } else {
            setItems(res.data.items);
          }
          setPagination(res.data.pagination);
          if (res.data.summary) {
            setSummary(res.data.summary);
          }
          setErrorMessage(null);
        } else {
          setErrorMessage(res.error || 'Failed to load bookings');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    loadBookings(activeTab, 1, false);
  }, [activeTab, loadBookings]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadBookings(activeTab, 1, false);
  }, [activeTab, loadBookings]);

  const handleLoadMore = useCallback(() => {
    if (
      !isLoading &&
      !isLoadingMore &&
      pagination &&
      pagination.hasMore &&
      items.length > 0
    ) {
      loadBookings(activeTab, pagination.page + 1, true);
    }
  }, [isLoading, isLoadingMore, pagination, items.length, activeTab, loadBookings]);

  const handleCardPress = (item: UnifiedBookingItem) => {
    setSelectedItem(item);
    setIsModalVisible(true);
  };

  const handleOpenReceiptOrDetails = (item: UnifiedBookingItem) => {
    setIsModalVisible(false);
    if (item.type === 'RIDE') {
      router.push({
        pathname: '/rides/receipt',
        params: { id: item.id },
      });
    } else if (item.type === 'HOTEL') {
      router.push('/(tabs)/hotels');
    } else if (item.type === 'LOUNGE') {
      router.push('/(tabs)/hotels');
    } else if (item.type === 'HERITAGE') {
      router.push('/(tabs)/explore');
    }
  };

  const getEmptyStateProps = () => {
    if (!token) {
      return {
        title: t('emptyState.loginTitle', 'Welcome to Kings Taxi'),
        description: t(
          'emptyState.loginSubtitle',
          'Sign in to your Kings Taxi passenger account to view and track your rides, hotel reservations, and heritage tours.'
        ),
        actionTitle: t('emptyState.loginAction', 'Sign In / Register'),
        onAction: () => router.push('/(auth)/login'),
      };
    }

    switch (activeTab) {
      case 'RIDE':
        return {
          title: t('emptyState.ridesTitle', 'No Taxi Rides Yet'),
          description: t(
            'emptyState.ridesSubtitle',
            'Request an on-demand taxi ride across Gondar or to Atse Tewodros Airport.'
          ),
          actionTitle: t('emptyState.bookRideAction', 'Book a Taxi Ride'),
          onAction: () => router.push('/rides/book'),
        };
      case 'HOTEL':
        return {
          title: t('emptyState.hotelsTitle', 'No Hotel Reservations'),
          description: t(
            'emptyState.hotelsSubtitle',
            'Discover luxury hotels and resorts in Gondar with optional chauffeured airport transfers.'
          ),
          actionTitle: t('emptyState.browseHotelsAction', 'Browse Hotels'),
          onAction: () => router.push('/(tabs)/hotels'),
        };
      case 'LOUNGE':
        return {
          title: t('emptyState.loungesTitle', 'No Lounge Reservations'),
          description: t(
            'emptyState.loungesSubtitle',
            'Reserve VIP lounge seating at Fasil Imperial Terrace and airport departure terminals.'
          ),
          actionTitle: t('emptyState.browseLoungesAction', 'Browse Lounges'),
          onAction: () => router.push('/(tabs)/hotels'),
        };
      case 'HERITAGE':
        return {
          title: t('emptyState.toursTitle', 'No Heritage Tours Booked'),
          description: t(
            'emptyState.toursSubtitle',
            'Explore Fasil Ghebbi, Debre Berhan Selassie, and Lake Tana monasteries with licensed guides.'
          ),
          actionTitle: t('emptyState.discoverToursAction', 'Discover Heritage Tours'),
          onAction: () => router.push('/(tabs)/explore'),
        };
      case 'ALL':
      default:
        return {
          title: t('emptyState.activeTitle', 'No Bookings Found'),
          description: t(
            'emptyState.activeSubtitle',
            'Your upcoming rides, hotel stays, and heritage tour contracts will appear here.'
          ),
          actionTitle: t('emptyState.exploreAction', 'Explore Kings Taxi Services'),
          onAction: () => router.push('/(tabs)/explore'),
        };
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>{t('navigation:tabs.bookings', 'Bookings')}</Text>
        <TouchableOpacity
          onPress={handleRefresh}
          style={styles.refreshIconBtn}
          accessibilityLabel="Refresh bookings"
        >
          <RefreshCw size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>
      <Text style={styles.headerSubtitle}>
        {t('navigation:tabs.bookingsA11y', 'Track your journeys, stays, and heritage tour contracts')}
      </Text>

      {/* Summary Metrics Cards */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{summary ? summary.totalBookings : '—'}</Text>
          <Text style={styles.metricLabel}>{t('summary.total', 'Total')}</Text>
        </View>
        <View style={[styles.metricCard, styles.metricCardCompleted]}>
          <Text style={[styles.metricValue, styles.metricValueSuccess]}>
            {summary ? summary.completed : '—'}
          </Text>
          <Text style={styles.metricLabel}>{t('summary.completed', 'Completed')}</Text>
        </View>
        <View style={[styles.metricCard, styles.metricCardPending]}>
          <Text style={[styles.metricValue, styles.metricValueWarning]}>
            {summary ? summary.pending : '—'}
          </Text>
          <Text style={styles.metricLabel}>{t('summary.active', 'Active / Upcoming')}</Text>
        </View>
      </View>

      {/* Tab Filters */}
      <View style={styles.tabsRow}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === tab.key && styles.tabButtonTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: UnifiedBookingItem }) => {
    const cardItem: BookingSummaryItem = {
      id: item.id,
      reference: item.reference,
      type: item.type,
      title: item.title,
      subtitle: item.subtitle,
      date: item.scheduledAt || item.createdAt,
      priceETB: item.totalAmount,
      status: item.status,
      normalizedStatus: item.normalizedStatus,
      paymentStatus: item.paymentStatus,
      imageUrl: item.imageUrl,
      summaryDetails: item.summaryDetails,
    };

    return <BookingCard booking={cardItem} onPress={() => handleCardPress(item)} />;
  };

  const renderFooter = () => {
    if (!isLoadingMore) return <View style={styles.listFooterPadding} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primaryDark} />
        <Text style={styles.footerLoaderText}>
          {t('common:loadingMore', 'Loading more bookings...')}
        </Text>
      </View>
    );
  };

  const emptyProps = getEmptyStateProps();

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderHeader()}

      {/* Network Error Banner */}
      {errorMessage && items.length === 0 ? (
        <View style={styles.errorBanner}>
          <AlertCircle size={20} color={theme.colors.danger} />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity onPress={() => loadBookings(activeTab, 1, false)} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>{t('common:retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Initial Loading Skeleton */}
      {isLoading && items.length === 0 ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((k) => (
            <View key={k} style={styles.skeletonCard}>
              <View style={styles.skeletonTopRow}>
                <View style={styles.skeletonCircle} />
                <View style={styles.skeletonBarShort} />
              </View>
              <View style={styles.skeletonBarLong} />
              <View style={styles.skeletonBarMedium} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.type}_${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.scrollList}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primaryDark}
              colors={[theme.colors.primaryDark]}
            />
          }
          ListEmptyComponent={
            !isLoading ? (
              <EmptyState
                title={emptyProps.title}
                description={emptyProps.description}
                actionTitle={emptyProps.actionTitle}
                onAction={emptyProps.onAction}
              />
            ) : null
          }
        />
      )}

      {/* Detail Bottom Sheet Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedItem && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderTitleRow}>
                    <View style={styles.modalIconBox}>
                      {selectedItem.type === 'RIDE' ? (
                        <Car size={22} color={theme.colors.primaryDark} />
                      ) : selectedItem.type === 'HOTEL' ? (
                        <Hotel size={22} color={theme.colors.hotelAccent} />
                      ) : (
                        <Compass size={22} color={theme.colors.tourAccent} />
                      )}
                    </View>
                    <View>
                      <Text style={styles.modalTypeLabel}>{selectedItem.type} BOOKING</Text>
                      <Text style={styles.modalRefText}>Ref: {selectedItem.reference}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsModalVisible(false)}
                    style={styles.modalCloseBtn}
                  >
                    <X size={20} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* Status & Payment Row */}
                  <View style={styles.detailStatusRow}>
                    <View>
                      <Text style={styles.detailFieldLabel}>Status</Text>
                      <StatusBadge status={selectedItem.normalizedStatus || selectedItem.status} />
                    </View>
                    <View style={styles.detailAlignRight}>
                      <Text style={styles.detailFieldLabel}>Payment</Text>
                      <Text
                        style={[
                          styles.paymentTag,
                          selectedItem.paymentStatus === 'SUCCESS' && styles.paymentTagSuccess,
                        ]}
                      >
                        {selectedItem.paymentStatus}
                      </Text>
                    </View>
                  </View>

                  {/* Title & Scheduled Time */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailTitle}>{selectedItem.title}</Text>
                    <View style={styles.detailDateRow}>
                      <Calendar size={14} color={theme.colors.textMuted} />
                      <Text style={styles.detailDateText}>
                        {formatDateShort(selectedItem.scheduledAt || selectedItem.createdAt)}
                      </Text>
                    </View>
                  </View>

                  {/* Category Specific Details */}
                  {selectedItem.type === 'RIDE' && (
                    <View style={styles.detailSectionBox}>
                      <View style={styles.detailRowItem}>
                        <MapPin size={16} color={theme.colors.antiqueGold} />
                        <View style={styles.detailRowContent}>
                          <Text style={styles.detailRowLabel}>Pickup</Text>
                          <Text style={styles.detailRowValue}>
                            {selectedItem.summaryDetails.pickupLocation || 'Gondar'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.detailRowItem}>
                        <MapPin size={16} color={theme.colors.danger} />
                        <View style={styles.detailRowContent}>
                          <Text style={styles.detailRowLabel}>Destination</Text>
                          <Text style={styles.detailRowValue}>
                            {selectedItem.summaryDetails.destinationLocation || 'Destination'}
                          </Text>
                        </View>
                      </View>
                      {selectedItem.summaryDetails.driverName ? (
                        <View style={styles.detailRowItem}>
                          <User size={16} color={theme.colors.secondary} />
                          <View style={styles.detailRowContent}>
                            <Text style={styles.detailRowLabel}>Assigned Driver</Text>
                            <Text style={styles.detailRowValue}>
                              {selectedItem.summaryDetails.driverName} (
                              {selectedItem.summaryDetails.vehicleModel || 'Kings Sedan'})
                            </Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {selectedItem.type === 'HOTEL' && (
                    <View style={styles.detailSectionBox}>
                      <View style={styles.detailRowItem}>
                        <Hotel size={16} color={theme.colors.hotelAccent} />
                        <View style={styles.detailRowContent}>
                          <Text style={styles.detailRowLabel}>Hotel Property</Text>
                          <Text style={styles.detailRowValue}>
                            {selectedItem.summaryDetails.hotelName || selectedItem.title}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.detailRowItem}>
                        <Clock size={16} color={theme.colors.textMuted} />
                        <View style={styles.detailRowContent}>
                          <Text style={styles.detailRowLabel}>Duration & Guests</Text>
                          <Text style={styles.detailRowValue}>
                            {selectedItem.summaryDetails.nightsCount || 1} Nights •{' '}
                            {selectedItem.summaryDetails.adults || 1} Adults
                            {selectedItem.summaryDetails.hasAirportTransfer ? ' • Airport Transfer Included' : ''}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {selectedItem.type === 'LOUNGE' && (
                    <View style={styles.detailSectionBox}>
                      <View style={styles.detailRowItem}>
                        <Sparkles size={16} color={theme.colors.antiqueGold} />
                        <View style={styles.detailRowContent}>
                          <Text style={styles.detailRowLabel}>Lounge Venue</Text>
                          <Text style={styles.detailRowValue}>
                            {selectedItem.summaryDetails.loungeName || selectedItem.title}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.detailRowItem}>
                        <Clock size={16} color={theme.colors.textMuted} />
                        <View style={styles.detailRowContent}>
                          <Text style={styles.detailRowLabel}>Reservation Time & Guests</Text>
                          <Text style={styles.detailRowValue}>
                            {selectedItem.summaryDetails.reservationTime || '18:00'} •{' '}
                            {selectedItem.summaryDetails.guestsCount || 1} Guests
                          </Text>
                        </View>
                      </View>
                      {selectedItem.summaryDetails.loungeAddress ? (
                        <View style={styles.detailRowItem}>
                          <MapPin size={16} color={theme.colors.antiqueGold} />
                          <View style={styles.detailRowContent}>
                            <Text style={styles.detailRowLabel}>Location</Text>
                            <Text style={styles.detailRowValue}>
                              {selectedItem.summaryDetails.loungeAddress}
                            </Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {selectedItem.type === 'HERITAGE' && (
                    <View style={styles.detailSectionBox}>
                      <View style={styles.detailRowItem}>
                        <Compass size={16} color={theme.colors.tourAccent} />
                        <View style={styles.detailRowContent}>
                          <Text style={styles.detailRowLabel}>Heritage Itinerary</Text>
                          <Text style={styles.detailRowValue}>
                            {selectedItem.summaryDetails.siteNames?.join(', ') || selectedItem.title}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.detailRowItem}>
                        <Clock size={16} color={theme.colors.textMuted} />
                        <View style={styles.detailRowContent}>
                          <Text style={styles.detailRowLabel}>Departure Time & Vehicle</Text>
                          <Text style={styles.detailRowValue}>
                            {selectedItem.summaryDetails.preferredStartTime || '09:00'} •{' '}
                            {selectedItem.summaryDetails.vehicleOptionName || 'Dedicated Vehicle'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Total Amount Box */}
                  <View style={styles.detailAmountBox}>
                    <Text style={styles.detailAmountLabel}>Total Amount</Text>
                    <Text style={styles.detailAmountValue}>
                      {formatETB(selectedItem.totalAmount)}
                    </Text>
                  </View>
                </ScrollView>

                {/* Modal Actions */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalPrimaryBtn}
                    onPress={() => handleOpenReceiptOrDetails(selectedItem)}
                  >
                    <Text style={styles.modalPrimaryBtnText}>
                      {selectedItem.type === 'RIDE' ? 'View Journey Receipt' : 'View Service Details'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalSecondaryBtn}
                    onPress={() => setIsModalVisible(false)}
                  >
                    <Text style={styles.modalSecondaryBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    borderBottomWidth: 1.5,
    borderBottomColor: theme.colors.borderGold,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.deepChocolate,
    fontWeight: '800',
  },
  refreshIconBtn: {
    padding: 6,
    borderRadius: theme.borderRadius.sm,
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
    marginBottom: theme.spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    alignItems: 'center',
    ...theme.shadows.subtle,
  },
  metricCardCompleted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  metricCardPending: {
    backgroundColor: '#FAF4DC',
    borderColor: theme.colors.borderGold,
  },
  metricValue: {
    ...theme.typography.h3,
    color: theme.colors.deepChocolate,
    fontWeight: '800',
  },
  metricValueSuccess: {
    color: '#15803D',
  },
  metricValueWarning: {
    color: theme.colors.antiqueGold,
  },
  metricLabel: {
    ...theme.typography.badge,
    fontSize: 10,
    color: theme.colors.deepChocolateLight,
    marginTop: 2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: theme.colors.brightGold,
  },
  tabButtonText: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
  },
  tabButtonTextActive: {
    color: theme.colors.antiqueGold,
    fontWeight: '800',
  },
  scrollList: {
    padding: theme.spacing.md,
    paddingBottom: theme.layout.tabBarContentPadding,
  },
  listFooterPadding: {
    height: theme.spacing.xl,
  },
  footerLoader: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  footerLoaderText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  errorBanner: {
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: '#FEE2E2',
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  errorText: {
    ...theme.typography.bodySmall,
    color: '#B91C1C',
    flex: 1,
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
  },
  retryBtnText: {
    ...theme.typography.captionBold,
    color: theme.colors.text,
  },
  loadingContainer: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  skeletonCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  skeletonTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceMuted,
  },
  skeletonBarShort: {
    height: 14,
    width: 80,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceMuted,
  },
  skeletonBarLong: {
    height: 16,
    width: '80%',
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceMuted,
  },
  skeletonBarMedium: {
    height: 14,
    width: '60%',
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceMuted,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  modalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTypeLabel: {
    ...theme.typography.badge,
    color: theme.colors.textMuted,
  },
  modalRefText: {
    ...theme.typography.captionBold,
    color: theme.colors.text,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalBody: {
    marginVertical: theme.spacing.md,
  },
  detailStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  detailFieldLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  detailAlignRight: {
    alignItems: 'flex-end',
  },
  paymentTag: {
    ...theme.typography.badge,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.textMuted,
    overflow: 'hidden',
  },
  paymentTagSuccess: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
  },
  detailSection: {
    marginBottom: theme.spacing.md,
  },
  detailTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  detailDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  detailDateText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  detailSectionBox: {
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    gap: 12,
  },
  detailRowItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  detailRowContent: {
    flex: 1,
  },
  detailRowLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  detailRowValue: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 2,
  },
  detailAmountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  detailAmountLabel: {
    ...theme.typography.h4,
    color: theme.colors.textMuted,
  },
  detailAmountValue: {
    ...theme.typography.h2,
    color: theme.colors.antiqueGold,
    fontWeight: '700',
  },
  modalActions: {
    gap: 8,
    paddingTop: theme.spacing.sm,
  },
  modalPrimaryBtn: {
    backgroundColor: theme.colors.buttonPrimary,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.buttonPrimaryText,
  },
  modalSecondaryBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalSecondaryBtnText: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
  },
});
