import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
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
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import {
  AppHeader,
  RatingComponent,
  PrimaryButton,
} from '../../src/components';
import { mockHotels } from '../../src/mocks';
import { formatETB } from '../../src/utils/currency';
import { useTranslation } from '../../src/i18n';

export default function HotelDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { t } = useTranslation(['hotels', 'common', 'navigation']);

  const hotel = mockHotels.find((h) => h.id === id) || mockHotels[0];
  const [selectedRoomId, setSelectedRoomId] = useState(hotel.rooms[0]?.id || '');

  const selectedRoom = hotel.rooms.find((r) => r.id === selectedRoomId) || hotel.rooms[0];

  const handleProceedToReserve = () => {
    router.push({
      pathname: '/hotels/reserve',
      params: {
        hotelId: hotel.id,
        roomId: selectedRoom.id,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={hotel.name} showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <Image source={{ uri: hotel.heroImage }} style={styles.heroImage} />

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
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => Linking.openURL(`tel:${hotel.phone}`)}
            >
              <Phone size={14} color={theme.colors.secondary} />
              <Text style={styles.contactText}>{hotel.phone}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => Linking.openURL(`mailto:${hotel.email}`)}
            >
              <Mail size={14} color={theme.colors.secondary} />
              <Text style={styles.contactText}>{t('contactHotel')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('aboutHotel')}</Text>
          <Text style={styles.descriptionText}>{hotel.description}</Text>
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
            return (
              <TouchableOpacity
                key={room.id}
                activeOpacity={0.85}
                onPress={() => setSelectedRoomId(room.id)}
                style={[
                  styles.roomCard,
                  isSelected && styles.roomCardSelected,
                ]}
              >
                <Image source={{ uri: room.photos[0] }} style={styles.roomImage} />
                <View style={styles.roomDetails}>
                  <View style={styles.roomHeaderRow}>
                    <Text style={styles.roomTitle}>{room.title}</Text>
                    {isSelected && (
                      <View style={styles.selectedBadge}>
                        <Text style={styles.selectedBadgeText}>{t('selectRoom')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.roomDesc}>{room.description}</Text>
                  <View style={styles.roomMetaRow}>
                    <View style={styles.roomMeta}>
                      <Bed size={14} color={theme.colors.textMuted} />
                      <Text style={styles.roomMetaText}>{room.bedType}</Text>
                    </View>
                    <View style={styles.roomMeta}>
                      <Users size={14} color={theme.colors.textMuted} />
                      <Text style={styles.roomMetaText}>{room.capacityAdults} {t('guestCount')}</Text>
                    </View>
                  </View>
                  <View style={styles.roomPriceRow}>
                    <Text style={styles.roomPrice}>
                      {formatETB(room.pricePerNight)}
                      <Text style={styles.perNight}> / {t('common:perNight')}</Text>
                    </Text>
                    <Text style={styles.availabilityText}>
                      {room.availableCount} {t('common:status')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Hotel Policies */}
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

        {/* Reserve CTA */}
        <PrimaryButton
          title={`${t('reserveNow')} • ${formatETB(selectedRoom?.pricePerNight)}`}
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
  heroImage: {
    width: '100%',
    height: 220,
    backgroundColor: theme.colors.surfaceMuted,
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
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  cityText: {
    ...theme.typography.captionBold,
    color: theme.colors.hotelAccent,
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
  amenitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
  },
  amenityText: {
    ...theme.typography.captionBold,
    color: theme.colors.text,
  },
  roomCard: {
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  roomCardSelected: {
    borderColor: theme.colors.hotelAccent,
    backgroundColor: '#F8FAFC',
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
    color: theme.colors.text,
  },
  selectedBadge: {
    backgroundColor: theme.colors.hotelAccent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectedBadgeText: {
    ...theme.typography.badge,
    color: '#FFFFFF',
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
    borderTopColor: theme.colors.border,
  },
  roomPrice: {
    ...theme.typography.h3,
    color: theme.colors.primaryDark,
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
});
