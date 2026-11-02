import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Crown,
  MapPin,
  Car,
  Hotel,
  Compass,
  FileText,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import { SearchInput, DestinationCard, StatusBadge } from '../../src/components';
import { useAuthStore, useRideStore } from '../../src/stores';
import { mockLocations, mockHeritageSites, mockHotels } from '../../src/mocks';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentRide, setDestination, setPickup } = useRideStore();
  const [searchQuery, setSearchQuery] = useState('');

  const firstName = user?.fullName?.split(' ')[0] || 'Passenger';

  const handleSelectRecentDestination = (loc: typeof mockLocations[0]) => {
    setDestination(loc);
    router.push('/rides/book');
  };

  const handleSelectPickup = (loc: typeof mockLocations[0]) => {
    setPickup(loc);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Branding & Greeting Bar */}
        <View style={styles.topHeader}>
          <View>
            <View style={styles.brandRow}>
              <Crown size={20} color={theme.colors.primary} />
              <Text style={styles.brandName}>KINGS TAXI</Text>
            </View>
            <Text style={styles.greetingText}>Selam, {firstName}! 👋</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={() => router.push('/(tabs)/profile')}
          >
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitial}>{firstName[0]}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Current Location Pill */}
        <View style={styles.locationPill}>
          <MapPin size={14} color={theme.colors.primaryDark} />
          <Text style={styles.locationLabel}>Pickup Location:</Text>
          <Text style={styles.locationValue} numberOfLines={1}>
            Bole Airport, Addis Ababa
          </Text>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/rides/book')}
          style={styles.searchWrapper}
        >
          <SearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Where to? (e.g. Skylight Hotel, Piassa...)"
          />
        </TouchableOpacity>

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
                <Text style={styles.activeRideTitle}>Active Trip in Progress</Text>
                <Text style={styles.activeRideSubtitle} numberOfLines={1}>
                  {currentRide.destination.title}
                </Text>
              </View>
            </View>
            <View style={styles.activeRideRight}>
              <StatusBadge status={currentRide.status} />
              <ChevronRight size={16} color={theme.colors.textMuted} />
            </View>
          </TouchableOpacity>
        )}

        {/* Primary 4 Service Verticals Grid */}
        <View style={styles.servicesGrid}>
          {/* Service 1: Ride-Hailing */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/rides/book')}
            style={[styles.serviceCard, styles.rideCard]}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: '#FFF9E6' }]}>
              <Car size={26} color={theme.colors.primaryDark} />
            </View>
            <Text style={styles.serviceTitle}>Kings Rides</Text>
            <Text style={styles.serviceDesc}>Instant city rides & airport transfers</Text>
            <View style={styles.serviceBadge}>
              <Text style={styles.serviceBadgeText}>From 120 ETB</Text>
            </View>
          </TouchableOpacity>

          {/* Service 2: Hotel Reservations */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/explore')}
            style={[styles.serviceCard, styles.hotelCard]}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Hotel size={26} color={theme.colors.hotelAccent} />
            </View>
            <Text style={styles.serviceTitle}>Verified Hotels</Text>
            <Text style={styles.serviceDesc}>Luxury stays across Ethiopian cities</Text>
            <View style={[styles.serviceBadge, { backgroundColor: '#DBEAFE' }]}>
              <Text style={[styles.serviceBadgeText, { color: theme.colors.hotelAccent }]}>
                Verified
              </Text>
            </View>
          </TouchableOpacity>

          {/* Service 3: Heritage & Tourism */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/explore')}
            style={[styles.serviceCard, styles.heritageCard]}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: '#F3E8FF' }]}>
              <Compass size={26} color={theme.colors.heritageAccent} />
            </View>
            <Text style={styles.serviceTitle}>Heritage Tours</Text>
            <Text style={styles.serviceDesc}>UNESCO landmarks & cultural sites</Text>
            <View style={[styles.serviceBadge, { backgroundColor: '#EDE9FE' }]}>
              <Text style={[styles.serviceBadgeText, { color: theme.colors.heritageAccent }]}>
                Historical
              </Text>
            </View>
          </TouchableOpacity>

          {/* Service 4: Full-Contract Transportation */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/tours/contract-builder')}
            style={[styles.serviceCard, styles.contractCard]}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <FileText size={26} color="#059669" />
            </View>
            <Text style={styles.serviceTitle}>Full Contract</Text>
            <Text style={styles.serviceDesc}>Multi-destination dedicated transport</Text>
            <View style={[styles.serviceBadge, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.serviceBadgeText, { color: '#059669' }]}>Chauffeured</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Featured Full-Contract Itinerary Banner */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push('/tours/contract-builder')}
          style={styles.featuredContractBanner}
        >
          <View style={styles.featuredContractContent}>
            <View style={styles.goldPill}>
              <Sparkles size={12} color="#FFFFFF" />
              <Text style={styles.goldPillText}>ROYAL CONTRACT EXPEDITION</Text>
            </View>
            <Text style={styles.featuredContractTitle}>
              Historic Northern Route Tour
            </Text>
            <Text style={styles.featuredContractDesc}>
              Dedicated chauffeured 4WD vehicle: Gondar Castles, Fasilides Bath & Debre Berhan.
            </Text>
            <View style={styles.featuredContractAction}>
              <Text style={styles.featuredActionText}>Build Custom Itinerary →</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Recent Destinations Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Clock size={18} color={theme.colors.text} />
            <Text style={styles.sectionTitle}>Frequent Destinations</Text>
          </View>
        </View>
        <View style={styles.recentDestinationsContainer}>
          {mockLocations.slice(1, 4).map((loc) => (
            <DestinationCard
              key={loc.id}
              location={loc}
              onSelect={() => handleSelectRecentDestination(loc)}
              isRecent
            />
          ))}
        </View>

        {/* Recommended Heritage & Tourism Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Compass size={18} color={theme.colors.text} />
            <Text style={styles.sectionTitle}>Explore Ethiopia</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {mockHeritageSites.slice(0, 3).map((site) => (
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
            <Text style={styles.safetyTitle}>Verified Drivers & Transparent Fares</Text>
            <Text style={styles.safetySubtitle}>
              Every ride is insured and monitored with emergency support and digital receipts.
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
    paddingBottom: theme.spacing.xxl,
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
    color: theme.colors.text,
    marginTop: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 2,
    borderColor: theme.colors.primary,
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
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: theme.spacing.md,
  },
  locationLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
  },
  locationValue: {
    ...theme.typography.captionBold,
    color: theme.colors.text,
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.subtle,
  },
  rideCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  hotelCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.hotelAccent,
  },
  heritageCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.heritageAccent,
  },
  contractCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  serviceIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  serviceTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
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
  featuredContractBanner: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  featuredContractContent: {
    gap: 4,
  },
  goldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 4,
  },
  goldPillText: {
    ...theme.typography.badge,
    color: theme.colors.text,
    fontSize: 9,
  },
  featuredContractTitle: {
    ...theme.typography.h3,
    color: theme.colors.textInverse,
  },
  featuredContractDesc: {
    ...theme.typography.caption,
    color: '#94A3B8',
    lineHeight: 18,
  },
  featuredContractAction: {
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  featuredActionText: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
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
    color: theme.colors.text,
  },
  seeAllText: {
    ...theme.typography.captionBold,
    color: theme.colors.primaryDark,
  },
  recentDestinationsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.subtle,
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
    color: theme.colors.text,
  },
  heritageCardRegion: {
    ...theme.typography.caption,
    color: theme.colors.heritageAccent,
    marginTop: 2,
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
});
