import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Crown,
  MapPin,
  Car,
  Hotel,
  Compass,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Phone,
  Coffee,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import {
  SearchInput,
  DestinationCard,
  StatusBadge,
  KingsTaxiLogo,
  HomeAdCarousel,
  KingsTaxiBrandShowcase,
} from '../../src/components';
import { useAuthStore, useRideStore } from '../../src/stores';
import { mockLocations, mockHeritageSites, mockHotels } from '../../src/mocks';
import { useTranslation } from '../../src/i18n';
import { PassengerBookingsService } from '../../src/services/passengerBookings.service';
import { PassengerRecentActivity } from '../../src/types';

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation(['home', 'transportation', 'common', 'navigation']);
  const { user, isAuthenticated, token, isSessionReady } = useAuthStore();
  const { currentRide, setDestination, setPickup } = useRideStore();
  const [searchQuery, setSearchQuery] = useState('');

  const [activities, setActivities] = useState<PassengerRecentActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  // Unauthenticated access guard: redirect to welcome only when session initialization is resolved
  useEffect(() => {
    if (isSessionReady && !isAuthenticated && !user && !token) {
      router.replace('/(auth)/welcome');
    }
  }, [isSessionReady, isAuthenticated, user, token, router]);

  // Account-isolated recent activities loader
  const loadRecentActivities = useCallback(async () => {
    if (!user?.id) {
      setActivities([]);
      setActivitiesLoading(false);
      return;
    }
    setActivitiesLoading(true);
    setActivitiesError(null);
    try {
      const res = await PassengerBookingsService.getRecentActivities(5);
      if (res.success && Array.isArray(res.data)) {
        setActivities(res.data);
      } else {
        setActivities([]);
      }
    } catch {
      setActivitiesError('Unable to load recent activities');
    } finally {
      setActivitiesLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadRecentActivities();
  }, [loadRecentActivities]);

  const firstName = (user?.fullName ? user.fullName.trim().split(' ')[0] : '') || 'Passenger';
  const avatarInitial = (firstName && firstName.length > 0 ? firstName[0] : 'P').toUpperCase();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greetingMorning', { name: firstName });
    if (hour < 18) return t('greetingAfternoon', { name: firstName });
    return t('greetingEvening', { name: firstName });
  };

  const handleSelectRecentDestination = (loc: typeof mockLocations[0]) => {
    setDestination(loc);
    router.push('/rides/book');
  };

  const handleSelectPickup = (loc: typeof mockLocations[0]) => {
    setPickup(loc);
  };

  useEffect(() => {
    useRideStore.getState().fetchRideHistory().catch(() => null);
  }, []);

  if (!isSessionReady) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.antiqueGold} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Branding & Greeting Bar */}
        <View style={styles.topHeader}>
          <View>
            <KingsTaxiLogo variant="header" showTagline={true} showText={true} />
            <Text style={styles.greetingText}>{getGreeting()}</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={() => router.push('/(tabs)/profile')}
            accessibilityRole="button"
            accessibilityLabel="View profile"
          >
            {user?.profileImage || user?.avatarUrl ? (
              <Image source={{ uri: (user.profileImage || user.avatarUrl)! }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitial}>{avatarInitial}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Current Location Pill — Gondar City */}
        <View style={styles.locationPill}>
          <MapPin size={14} color={theme.colors.primaryDark} />
          <Text style={styles.locationLabel}>Operating In:</Text>
          <Text style={styles.locationValue} numberOfLines={1}>
            Gondar City, Amhara, Ethiopia
          </Text>
        </View>

        {/* Active Ride Banner (if active ride exists) */}
        {currentRide && currentRide.status !== 'PAYMENT_COMPLETED' && currentRide.status !== 'CANCELLED' && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/rides/active')}
            style={styles.activeRideBanner}
          >
            <View style={styles.activeRideLeft}>
              <View style={styles.activeRideIcon}>
                <Car size={20} color={theme.colors.primaryDark} />
              </View>
              <View>
                <Text style={styles.activeRideTitle}>{t('activeRideBannerTitle')}</Text>
                <Text style={styles.activeRideSubtitle} numberOfLines={1}>
                  {currentRide.destination?.title || currentRide.subcityName || 'Gondar On-Demand Ride'}
                </Text>
              </View>
            </View>
            <View style={styles.activeRideRight}>
              <StatusBadge status={currentRide.status} />
              <ChevronRight size={16} color={theme.colors.textMuted} />
            </View>
          </TouchableOpacity>
        )}

        {/* Request-Based On-Demand Hero Card (No Destination Required) */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/rides/book')}
          style={styles.requestRideHeroCard}
        >
          <View style={styles.requestHeroHeader}>
            <View style={styles.requestHeroIconBox}>
              <Car size={24} color={theme.colors.antiqueGold} />
            </View>
            <View style={styles.requestHeroTextWrap}>
              <Text style={styles.requestHeroTitle}>Request a Taxi in Gondar</Text>
              <Text style={styles.requestHeroSubtitle}>
                No upfront destination needed • Instant on-demand dispatch
              </Text>
            </View>
          </View>
          <View style={styles.requestHeroDivider} />
          <View style={styles.requestHeroBottomRow}>
            <View style={styles.requestPhonePill}>
              <Phone size={13} color={theme.colors.antiqueGold} />
              <Text style={styles.requestPhoneText}>
                {user?.phone || user?.phoneNumber || '0911234567'}
              </Text>
              <ShieldCheck size={14} color={theme.colors.success} />
            </View>
            <View style={styles.requestBtnInline}>
              <Text style={styles.requestBtnInlineText}>Request Ride</Text>
              <ChevronRight size={14} color="#FFFFFF" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Primary 4 Service Verticals Grid */}
        <View style={styles.servicesGrid}>
          {/* Service 1: Ride-Hailing */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/rides/book')}
            style={[styles.serviceCard, styles.rideCard]}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: '#FAF4DC' }]}>
              <Car size={26} color={theme.colors.antiqueGold} />
            </View>
            <Text style={styles.serviceTitle}>{t('services.rideTitle')}</Text>
            <Text style={styles.serviceDesc}>Instant taxi dispatch</Text>
            <View style={styles.serviceBadge}>
              <Text style={styles.serviceBadgeText}>Standard Rates</Text>
            </View>
          </TouchableOpacity>

          {/* Service 2: Hotel Reservations */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/hotels')}
            style={[styles.serviceCard, styles.hotelCard]}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: '#FAF2D3' }]}>
              <Hotel size={26} color={theme.colors.antiqueGold} />
            </View>
            <Text style={styles.serviceTitle}>{t('services.hotelsTitle')}</Text>
            <Text style={styles.serviceDesc}>{t('services.hotelsSubtitle')}</Text>
            <View style={[styles.serviceBadge, { backgroundColor: '#FAF2D3' }]}>
              <Text style={[styles.serviceBadgeText, { color: theme.colors.antiqueGold }]}>
                {t('common:status')}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Service 3: Heritage & Tourism */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/explore')}
            style={[styles.serviceCard, styles.heritageCard]}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: '#FAF4DC' }]}>
              <Compass size={26} color={theme.colors.deepChocolate} />
            </View>
            <Text style={styles.serviceTitle}>{t('services.heritageTitle')}</Text>
            <Text style={styles.serviceDesc}>{t('services.heritageSubtitle')}</Text>
            <View style={[styles.serviceBadge, { backgroundColor: theme.colors.deepChocolate }]}>
              <Text style={[styles.serviceBadgeText, { color: theme.colors.champagneGold }]}>
                UNESCO
              </Text>
            </View>
          </TouchableOpacity>

          {/* Service 4: Premium Kings Taxi Brand Showcase */}
          <KingsTaxiBrandShowcase />
        </View>

        {/* Premium 5-Slide Advertising Carousel */}
        <HomeAdCarousel />

        {/* Real Authenticated Recent Activities Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Clock size={18} color={theme.colors.text} />
            <Text style={styles.sectionTitle}>{t('recentActivity')}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/bookings')}>
            <Text style={styles.seeAllText}>{t('seeAllDestinations', 'View All')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentDestinationsContainer}>
          {activitiesLoading ? (
            <View style={styles.activityLoadingBox}>
              <ActivityIndicator size="small" color={theme.colors.antiqueGold} />
              <Text style={styles.activityLoadingText}>Loading recent activities...</Text>
            </View>
          ) : activitiesError ? (
            <View style={styles.activityErrorBox}>
              <Text style={styles.activityErrorText}>{activitiesError}</Text>
              <TouchableOpacity
                style={styles.activityRetryBtn}
                onPress={loadRecentActivities}
                activeOpacity={0.7}
              >
                <Text style={styles.activityRetryText}>{t('common:retry', 'Retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : activities.length === 0 ? (
            <View style={styles.activityEmptyBox}>
              <Text style={styles.activityEmptyText}>
                Your recent activities will appear here when you start using Kings Taxi.
              </Text>
            </View>
          ) : (
            activities.map((item, index) => {
              const isLast = index === activities.length - 1;
              return (
                <TouchableOpacity
                  key={item.id || item.reference || index}
                  activeOpacity={0.7}
                  onPress={() => router.push('/(tabs)/bookings')}
                  style={[styles.activityRow, isLast && { borderBottomWidth: 0 }]}
                >
                  <View style={styles.activityIconCircle}>
                    {item.category === 'ride' ? (
                      <Car size={18} color={theme.colors.antiqueGold} />
                    ) : item.category === 'hotel' ? (
                      <Hotel size={18} color={theme.colors.antiqueGold} />
                    ) : item.category === 'lounge' ? (
                      <Coffee size={18} color={theme.colors.antiqueGold} />
                    ) : (
                      <Compass size={18} color={theme.colors.antiqueGold} />
                    )}
                  </View>
                  <View style={styles.activityDetails}>
                    <Text style={styles.activityTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.activitySubtitle} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  </View>
                  <View style={styles.activityMeta}>
                    <View
                      style={[
                        styles.activityBadge,
                        item.normalizedStatus === 'COMPLETED'
                          ? styles.badgeCompleted
                          : item.normalizedStatus === 'IN_PROGRESS'
                          ? styles.badgeInProgress
                          : item.normalizedStatus === 'CONFIRMED'
                          ? styles.badgeConfirmed
                          : item.normalizedStatus === 'CANCELLED'
                          ? styles.badgeCancelled
                          : styles.badgePending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.activityBadgeText,
                          item.normalizedStatus === 'COMPLETED'
                            ? styles.badgeTextCompleted
                            : item.normalizedStatus === 'IN_PROGRESS'
                            ? styles.badgeTextInProgress
                            : item.normalizedStatus === 'CONFIRMED'
                            ? styles.badgeTextConfirmed
                            : item.normalizedStatus === 'CANCELLED'
                            ? styles.badgeTextCancelled
                            : styles.badgeTextPending,
                        ]}
                      >
                        {item.normalizedStatus}
                      </Text>
                    </View>
                    <Text style={styles.activityTimestamp}>
                      {formatRelativeTime(item.timestamp)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Recommended Heritage & Tourism Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Compass size={18} color={theme.colors.text} />
            <Text style={styles.sectionTitle}>{t('popularDestinations')}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
            <Text style={styles.seeAllText}>{t('seeAllDestinations')}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {mockHeritageSites.slice(0, 5).map((site) => (
            <TouchableOpacity
              key={site.id}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/heritage/[id]', params: { id: site.id } })}
              style={styles.horizontalHeritageCard}
            >
              <Image source={{ uri: site.heroImage }} style={styles.heritageImage} />
              <View style={styles.heritageCardBody}>
                <Text style={styles.heritageCardTitle} numberOfLines={1}>
                  {site.name}
                </Text>
                <Text style={styles.heritageCardRegion}>{site.region}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Trust & Safety Assurance Banner */}
        <View style={styles.safetyBanner}>
          <ShieldCheck size={22} color={theme.colors.success} />
          <View style={styles.safetyTextWrap}>
            <Text style={styles.safetyTitle}>{t('tagline', { ns: 'auth' })}</Text>
            <Text style={styles.safetySubtitle}>
              {t('services:vanDesc', { defaultValue: 'Insured and monitored passenger mobility across Ethiopia' })}
            </Text>
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
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.layout.tabBarContentPadding,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandName: {
    ...theme.typography.h4,
    color: theme.colors.secondary,
    letterSpacing: 1.5,
  },
  greetingText: {
    ...theme.typography.h2,
    color: theme.colors.deepChocolate,
    fontWeight: '800',
    marginTop: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FAF2D3',
    borderWidth: 2,
    borderColor: theme.colors.brightGold,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    ...theme.typography.h4,
    color: theme.colors.primaryDark,
    fontWeight: '800',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF2D3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.brightGold,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  locationLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.deepChocolateLight,
  },
  locationValue: {
    ...theme.typography.captionBold,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
    maxWidth: 200,
  },
  searchWrapper: {
    marginBottom: theme.spacing.md,
  },
  activeRideBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  activeRideLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  activeRideIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeRideTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  activeRideSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  activeRideRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    ...theme.shadows.cardGold,
  },
  rideCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.antiqueGold,
  },
  hotelCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.brightGold,
  },
  heritageCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.deepChocolate,
  },
  serviceIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
  },
  serviceTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
  },
  serviceDesc: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
    marginBottom: theme.spacing.sm,
    minHeight: 32,
  },
  serviceBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  serviceBadgeText: {
    ...theme.typography.captionBold,
    color: theme.colors.primaryDark,
    fontSize: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.deepChocolate,
    fontWeight: '800',
  },
  seeAllText: {
    ...theme.typography.captionBold,
    color: theme.colors.antiqueGold,
  },
  recentDestinationsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.cardGold,
  },
  horizontalScroll: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  horizontalHeritageCard: {
    width: 220,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    ...theme.shadows.cardGold,
  },
  heritageImage: {
    width: '100%',
    height: 110,
    backgroundColor: theme.colors.surfaceMuted,
  },
  heritageCardBody: {
    padding: theme.spacing.sm,
  },
  heritageCardTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
  },
  heritageCardRegion: {
    ...theme.typography.caption,
    color: theme.colors.antiqueGold,
    marginTop: 2,
    fontWeight: '600',
  },
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: theme.spacing.sm,
  },
  safetyTextWrap: {
    flex: 1,
  },
  safetyTitle: {
    ...theme.typography.bodyBold,
    color: '#166534',
  },
  safetySubtitle: {
    ...theme.typography.caption,
    color: '#15803D',
    marginTop: 2,
  },
  requestRideHeroCard: {
    backgroundColor: '#FAF4DC',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.brightGold,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.cardGold,
  },
  requestHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  requestHeroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FAF2D3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
  },
  requestHeroTextWrap: {
    flex: 1,
  },
  requestHeroTitle: {
    ...theme.typography.bodyBold,
    fontSize: 16,
    color: theme.colors.deepChocolate,
    fontWeight: '800',
  },
  requestHeroSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.deepChocolateLight,
    marginTop: 2,
  },
  requestHeroDivider: {
    height: 1,
    backgroundColor: theme.colors.borderGold,
    marginVertical: theme.spacing.sm,
  },
  requestHeroBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestPhonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFDF7',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
  },
  requestPhoneText: {
    ...theme.typography.captionBold,
    color: theme.colors.deepChocolate,
  },
  requestBtnInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.antiqueGold,
    borderWidth: 1,
    borderColor: theme.colors.brightGold,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.full,
  },
  requestBtnInlineText: {
    ...theme.typography.captionBold,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activityLoadingBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityLoadingText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  activityErrorBox: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityErrorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginBottom: 8,
    textAlign: 'center',
  },
  activityRetryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FAF4DC',
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
  },
  activityRetryText: {
    ...theme.typography.captionBold,
    color: theme.colors.antiqueGold,
  },
  activityEmptyBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityEmptyText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGold,
  },
  activityIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FAF2D3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
  },
  activityDetails: {
    flex: 1,
    marginRight: 8,
  },
  activityTitle: {
    ...theme.typography.bodyBold,
    fontSize: 14,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
  },
  activitySubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  activityMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  activityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  badgeCompleted: {
    backgroundColor: '#ECFDF5',
  },
  badgeTextCompleted: {
    color: '#059669',
  },
  badgeInProgress: {
    backgroundColor: '#EFF6FF',
  },
  badgeTextInProgress: {
    color: '#2563EB',
  },
  badgeConfirmed: {
    backgroundColor: '#FEF3C7',
  },
  badgeTextConfirmed: {
    color: '#D97706',
  },
  badgeCancelled: {
    backgroundColor: '#FEE2E2',
  },
  badgeTextCancelled: {
    color: '#DC2626',
  },
  badgePending: {
    backgroundColor: '#F3F4F6',
  },
  badgeTextPending: {
    color: '#4B5563',
  },
  activityTimestamp: {
    ...theme.typography.caption,
    fontSize: 10,
    color: theme.colors.textMuted,
  },
});
