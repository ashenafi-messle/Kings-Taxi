import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Clock,
  CheckCircle,
  Users,
  Bed,
  Plane,
  Car,
  ChevronRight,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Camera,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import {
  AppHeader,
  RatingComponent,
  PrimaryButton,
  RoomImageCarousel,
} from '../../src/components';
import { HotelService } from '../../src/services/hotel.service';
import { Hotel, AirportTransferRateDto } from '../../src/types';
import { mockHotels } from '../../src/mocks';
import { formatETB } from '../../src/utils/currency';
import { useTranslation } from '../../src/i18n';

const EMPTY_IMAGES: string[] = [];

export default function HotelDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { t } = useTranslation(['hotels', 'common', 'navigation']);

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [transferRates, setTransferRates] = useState<AirportTransferRateDto[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const hotelId = Array.isArray(id) ? id[0] || '' : id || '';

  const loadHotel = useCallback(async () => {
    if (!hotelId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [hotelRes, ratesRes] = await Promise.all([
        HotelService.getHotelById(hotelId),
        HotelService.getTransferRates(hotelId),
      ]);

      if (hotelRes.success && hotelRes.data) {
        let loadedHotel = hotelRes.data;
        // If rooms array is empty, fetch rooms explicitly
        if (!loadedHotel.rooms || loadedHotel.rooms.length === 0) {
          const roomsRes = await HotelService.getHotelRooms(hotelId);
          if (roomsRes.success && roomsRes.data.length > 0) {
            loadedHotel = { ...loadedHotel, rooms: roomsRes.data };
          }
        }
        setHotel(loadedHotel);
        if (loadedHotel.rooms.length > 0) {
          setSelectedRoomId(loadedHotel.rooms[0].id);
        }
      } else {
        setError(hotelRes.error || 'Hotel property not found.');
      }

      if (ratesRes.success && ratesRes.data) {
        setTransferRates(ratesRes.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load hotel details.');
    } finally {
      setIsLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!hotelId) return;
      setIsLoading(true);
      setError(null);
      try {
        const [hotelRes, ratesRes] = await Promise.all([
          HotelService.getHotelById(hotelId),
          HotelService.getTransferRates(hotelId),
        ]);
        if (cancelled) return;

        if (hotelRes.success && hotelRes.data) {
          let loadedHotel = hotelRes.data;
          if (!loadedHotel.rooms || loadedHotel.rooms.length === 0) {
            const roomsRes = await HotelService.getHotelRooms(hotelId);
            if (!cancelled && roomsRes.success && roomsRes.data.length > 0) {
              loadedHotel = { ...loadedHotel, rooms: roomsRes.data };
            }
          }
          if (!cancelled) {
            setHotel(loadedHotel);
            if (loadedHotel.rooms.length > 0) {
              setSelectedRoomId(loadedHotel.rooms[0].id);
            }
          }
        } else if (!cancelled) {
          setError(hotelRes.error || 'Hotel property not found.');
        }

        if (!cancelled && ratesRes.success && ratesRes.data) {
          setTransferRates(ratesRes.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load hotel details.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [hotelId]);

  if (isLoading && !hotel) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Hotel Details" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.antiqueGold} />
          <Text style={styles.loadingText}>Loading hotel and room inventory...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !hotel) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Hotel Not Found" showBack />
        <View style={styles.errorFullContainer}>
          <AlertCircle size={40} color="#D32F2F" />
          <Text style={styles.errorTitle}>Hotel Unavailable</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <View style={styles.errorActionsRow}>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={loadHotel}
              activeOpacity={0.8}
            >
              <RefreshCw size={14} color="#FFF" />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <ArrowLeft size={14} color={theme.colors.text} />
              <Text style={styles.backBtnText}>Return to Hotels</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!hotel) return null;

  const selectedRoom =
    hotel.rooms.find((r) => r.id === selectedRoomId) || hotel.rooms[0];

  const handleProceedToReserve = () => {
    if (
      Platform.OS === 'web' &&
      typeof document !== 'undefined' &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
    router.push({
      pathname: '/hotels/reserve',
      params: {
        hotelId: hotel.id,
        roomId: selectedRoom?.id || '',
      },
    });
  };

  const galleryImages = hotel.photos && hotel.photos.length > 0 ? hotel.photos : [hotel.heroImage];

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={hotel.name} showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Display Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: galleryImages[selectedImageIndex] || hotel.heroImage }}
            style={styles.heroImage}
          />
          <View style={styles.categoryPill}>
            <Sparkles size={11} color="#FFF" />
            <Text style={styles.categoryPillText}>
              {(hotel.category || 'LUXURY').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Thumbnail Gallery (if multiple) */}
        {galleryImages.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailsWrap}
          >
            {galleryImages.map((uri, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedImageIndex(index)}
                style={[
                  styles.thumbnailBtn,
                  selectedImageIndex === index && styles.thumbnailBtnActive,
                ]}
              >
                <Image source={{ uri }} style={styles.thumbnailImg} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Hotel Identity Card */}
        <View style={styles.contentCard}>
          <View style={styles.titleRow}>
            <Text style={styles.hotelName}>{hotel.name}</Text>
            <View style={styles.cityBadge}>
              <MapPin size={12} color={theme.colors.hotelAccent} />
              <Text style={styles.cityText}>{hotel.city}</Text>
            </View>
          </View>

          <RatingComponent
            rating={hotel.reviewScore}
            reviewCount={hotel.reviewCount}
            showScore
            size={16}
            style={styles.ratingRow}
          />

          <Text style={styles.addressText}>{hotel.address}</Text>

          {/* Contact Row */}
          <View style={styles.contactRow}>
            {hotel.phone && (
              <TouchableOpacity
                style={styles.contactItem}
                onPress={() => Linking.openURL(`tel:${hotel.phone}`)}
              >
                <Phone size={14} color={theme.colors.secondary} />
                <Text style={styles.contactText}>{hotel.phone}</Text>
              </TouchableOpacity>
            )}
            {hotel.email && (
              <TouchableOpacity
                style={styles.contactItem}
                onPress={() => Linking.openURL(`mailto:${hotel.email}`)}
              >
                <Mail size={14} color={theme.colors.secondary} />
                <Text style={styles.contactText}>Inquire Email</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('aboutHotel')}</Text>
          <Text style={styles.descriptionText}>{hotel.description}</Text>
        </View>

        {/* Dedicated Gondar Airport Transfer Feature Card */}
        <View style={styles.transferSectionCard}>
          <View style={styles.transferHeader}>
            <View style={styles.transferIconCircle}>
              <Plane size={20} color="#0D5C3A" />
            </View>
            <View style={styles.transferHeaderTextWrap}>
              <Text style={styles.transferTitle}>Gondar Airport Transfer</Text>
              <Text style={styles.transferSubtitle}>
                Atse Tewodros Airport (GDQ) ⇄ {hotel.name}
              </Text>
            </View>
          </View>

          <Text style={styles.transferDescription}>
            Seamless fixed-price private transfer. Meet-and-greet in arrival terminal, baggage assistance, and direct travel with Kings Taxi executive drivers.
          </Text>

          <View style={styles.transferRatePillsContainer}>
            {transferRates.map((rate) => (
              <View key={rate.id} style={styles.transferRateCard}>
                <View style={styles.transferRateVehicleRow}>
                  <Car size={16} color={theme.colors.primaryDark} />
                  <Text style={styles.transferVehicleName}>
                    {rate.vehicleCategory === 'SEDAN'
                      ? 'Standard Sedan'
                      : rate.vehicleCategory === 'SUV'
                        ? 'Executive SUV'
                        : rate.vehicleCategory === 'VAN'
                          ? 'Passenger Van'
                          : rate.vehicleCategory}
                  </Text>
                </View>
                <Text style={styles.transferPriceTag}>
                  {formatETB(rate.fixedPriceETB)}
                </Text>
                <Text style={styles.transferEtaText}>
                  ~{rate.estimatedMinutes} mins • Fixed Price
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.transferCtaRow}
            onPress={handleProceedToReserve}
          >
            <Text style={styles.transferCtaText}>
              Add airport pickup during room reservation
            </Text>
            <ChevronRight size={16} color="#0D5C3A" />
          </TouchableOpacity>
        </View>

        {/* Facilities & Amenities */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('amenities')}</Text>
          <View style={styles.amenitiesWrap}>
            {hotel.amenities.map((amenity, idx) => (
              <View key={idx} style={styles.amenityChip}>
                <CheckCircle size={14} color={theme.colors.hotelAccent} />
                <Text style={styles.amenityText}>{amenity}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Room Categories */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('availableRooms')}</Text>
          {hotel.rooms.map((room) => {
            const isSelected = room.id === selectedRoomId;
            const roomImages = room.photos || EMPTY_IMAGES;
            return (
              <View
                key={room.id}
                style={[
                  styles.roomCard,
                  isSelected && styles.roomCardSelected,
                ]}
              >
                <RoomImageCarousel
                  images={roomImages}
                  roomTitle={room.title}
                />

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setSelectedRoomId(room.id)}
                  style={styles.roomDetails}
                >
                  <View style={styles.roomHeaderRow}>
                    <Text style={styles.roomTitle}>{room.title}</Text>
                    {isSelected && (
                      <View style={styles.selectedBadge}>
                        <Text style={styles.selectedBadgeText}>Selected</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.roomDesc}>{room.description}</Text>
                  <View style={styles.roomMetaRow}>
                    <View style={styles.roomMeta}>
                      <Bed size={14} color={theme.colors.textMuted} />
                      <Text style={styles.roomMetaText}>{room.bedType || 'King Bed'}</Text>
                    </View>
                    <View style={styles.roomMeta}>
                      <Users size={14} color={theme.colors.textMuted} />
                      <Text style={styles.roomMetaText}>
                        {room.capacityAdults} Adults, {room.capacityChildren} Child
                      </Text>
                    </View>
                  </View>

                  <View style={styles.roomPriceRow}>
                    <Text style={styles.roomPrice}>
                      {formatETB(room.pricePerNight)}
                      <Text style={styles.perNight}> / {t('common:perNight')}</Text>
                    </Text>
                    <Text style={styles.availabilityText}>
                      {room.availableCount > 0
                        ? `${room.availableCount} rooms available`
                        : 'Available on request'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Hotel Policies */}
        {hotel.policies && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('policies')}</Text>
            <View style={styles.policyRow}>
              <Clock size={16} color={theme.colors.textSecondary} />
              <Text style={styles.policyText}>
                {t('checkInTime')}: {hotel.policies.checkInTime} • {t('checkOutTime')}: {hotel.policies.checkOutTime}
              </Text>
            </View>
            <View style={styles.policyRow}>
              <ShieldCheck size={16} color={theme.colors.success} />
              <Text style={styles.policyText}>{hotel.policies.cancellationPolicy}</Text>
            </View>
          </View>
        )}

        {/* Reserve CTA */}
        <PrimaryButton
          title={`Reserve ${selectedRoom?.title || 'Room'} • ${formatETB(selectedRoom?.pricePerNight || hotel.startingPricePerNight)}`}
          onPress={handleProceedToReserve}
          style={styles.reserveBtn}
        />
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
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 240,
    backgroundColor: theme.colors.surfaceMuted,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  categoryPill: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  categoryPillText: {
    ...theme.typography.captionBold,
    color: '#FFF',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  thumbnailsWrap: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  thumbnailBtn: {
    width: 60,
    height: 44,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailBtnActive: {
    borderColor: theme.colors.primary,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  contentCard: {
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
  hotelName: {
    ...theme.typography.h2,
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cityText: {
    ...theme.typography.captionBold,
    color: theme.colors.primaryDark,
  },
  ratingRow: {
    marginVertical: 4,
  },
  addressText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    ...theme.typography.captionBold,
    color: theme.colors.secondary,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  descriptionText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  transferSectionCard: {
    backgroundColor: '#F0FDF4',
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#BBF7D0',
  },
  transferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  transferIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transferHeaderTextWrap: {
    flex: 1,
  },
  transferTitle: {
    ...theme.typography.h3,
    color: '#14532D',
  },
  transferSubtitle: {
    ...theme.typography.caption,
    color: '#166534',
  },
  transferDescription: {
    ...theme.typography.body,
    fontSize: 13,
    lineHeight: 18,
    color: '#166534',
    marginBottom: 12,
  },
  transferRatePillsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  transferRateCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  transferRateVehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  transferVehicleName: {
    ...theme.typography.captionBold,
    color: theme.colors.text,
    fontSize: 11,
  },
  transferPriceTag: {
    ...theme.typography.bodyBold,
    color: '#0D5C3A',
    fontSize: 14,
  },
  transferEtaText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  transferCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#BBF7D0',
  },
  transferCtaText: {
    ...theme.typography.captionBold,
    color: '#0D5C3A',
  },
  amenitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF2D3',
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
  },
  amenityText: {
    ...theme.typography.captionBold,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
  },
  roomCard: {
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    ...theme.shadows.cardGold,
  },
  roomCardSelected: {
    borderColor: theme.colors.brightGold,
    backgroundColor: theme.colors.paleGold,
  },
  roomImageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
    backgroundColor: theme.colors.surfaceMuted,
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  photoCountText: {
    ...theme.typography.captionBold,
    color: '#FFF',
    fontSize: 10,
  },
  roomGalleryContainer: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderGold,
  },
  roomGalleryLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  roomGalleryScroll: {
    gap: 8,
  },
  roomGalleryThumbWrap: {
    position: 'relative',
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
  },
  roomGalleryThumb: {
    width: 64,
    height: 48,
    backgroundColor: theme.colors.surfaceMuted,
  },
  primaryPhotoBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: 1,
  },
  primaryPhotoText: {
    ...theme.typography.captionBold,
    color: '#FBBF24',
    fontSize: 8,
    textAlign: 'center',
  },
  roomImage: {
    width: '100%',
    height: 140,
    backgroundColor: theme.colors.surfaceMuted,
  },
  roomDetails: {
    padding: theme.spacing.md,
  },
  roomHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomTitle: {
    ...theme.typography.h4,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
  },
  selectedBadge: {
    backgroundColor: theme.colors.antiqueGold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectedBadgeText: {
    ...theme.typography.badge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  roomDesc: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 4,
    marginBottom: theme.spacing.sm,
  },
  roomMetaRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  roomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roomMetaText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  roomPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderGold,
  },
  roomPrice: {
    ...theme.typography.h3,
    color: theme.colors.antiqueGold,
    fontWeight: '800',
  },
  perNight: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  availabilityText: {
    ...theme.typography.captionBold,
    color: theme.colors.success,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  policyText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  reserveBtn: {
    margin: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: 12,
  },
  errorFullContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginHorizontal: 16,
  },
  errorTitle: {
    ...theme.typography.h3,
    color: '#C62828',
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '700',
  },
  errorMessage: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  errorActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.antiqueGold,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  retryBtnText: {
    ...theme.typography.captionBold,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  backBtnText: {
    ...theme.typography.captionBold,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
});
