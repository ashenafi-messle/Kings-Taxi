import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Image,
  Platform,
} from 'react-native';
import { Car, Hotel, Compass, Calendar, ChevronRight, Sparkles } from 'lucide-react-native';
import { theme } from '../theme';
import { StatusBadge } from './StatusBadge';
import { formatETB } from '../utils/currency';
import { formatDateShort } from '../utils/date';
import { useTranslation } from '../i18n';

export interface BookingSummaryItem {
  id: string;
  reference?: string;
  type: 'ride' | 'hotel' | 'tour' | 'lounge' | 'RIDE' | 'HOTEL' | 'LOUNGE' | 'HERITAGE';
  title: string;
  subtitle: string;
  date: string;
  priceETB: number;
  status: string;
  normalizedStatus?: string;
  paymentStatus?: string;
  imageUrl?: string | null;
  summaryDetails?: any;
}

export interface BookingCardProps {
  booking: BookingSummaryItem;
  onPress: () => void;
  style?: ViewStyle;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onPress,
  style,
}) => {
  const { t } = useTranslation(['bookings', 'common']);
  const normalizedType = (booking.type || '').toLowerCase();

  const getTypeName = () => {
    switch (normalizedType) {
      case 'ride':
        return t('card.rideType', 'TAXI RIDE');
      case 'hotel':
        return t('card.hotelType', 'HOTEL');
      case 'lounge':
        return t('card.loungeType', 'LOUNGE');
      case 'heritage':
      case 'tour':
        return t('card.tourType', 'HERITAGE TOUR');
      default:
        return booking.type.toUpperCase();
    }
  };

  const getIcon = () => {
    switch (normalizedType) {
      case 'ride':
        return <Car size={20} color={theme.colors.primaryDark} />;
      case 'hotel':
        return <Hotel size={20} color={theme.colors.hotelAccent} />;
      case 'lounge':
        return <Sparkles size={20} color={theme.colors.antiqueGold} />;
      case 'heritage':
      case 'tour':
        return <Compass size={20} color={theme.colors.tourAccent} />;
      default:
        return <Car size={20} color={theme.colors.primaryDark} />;
    }
  };

  const displayStatus = booking.normalizedStatus || booking.status;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.container, style]}
    >
      <View style={styles.topRow}>
        <View style={styles.typeRow}>
          {booking.imageUrl ? (
            <Image
              source={{ uri: booking.imageUrl }}
              style={styles.imageThumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.iconCircle}>{getIcon()}</View>
          )}
          <View style={styles.typeMeta}>
            <View style={styles.typeLabelRow}>
              <Text style={styles.typeText}>{getTypeName()}</Text>
              {booking.reference ? (
                <Text style={styles.refText}>#{booking.reference.slice(-8)}</Text>
              ) : null}
            </View>
            <View style={styles.dateRow}>
              <Calendar size={12} color={theme.colors.textMuted} />
              <Text style={styles.dateText}>{formatDateShort(booking.date)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.badgesCol}>
          <StatusBadge status={displayStatus} />
          {booking.paymentStatus && booking.paymentStatus !== 'PENDING' ? (
            <Text
              style={[
                styles.paymentPill,
                booking.paymentStatus === 'SUCCESS' && styles.paymentSuccess,
                booking.paymentStatus === 'FAILED' && styles.paymentFailed,
              ]}
            >
              {booking.paymentStatus}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {booking.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {booking.subtitle}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.price}>{formatETB(booking.priceETB)}</Text>
        <View style={styles.detailsBtn}>
          <Text style={styles.detailsBtnText}>{t('card.viewReceipt', 'Details')}</Text>
          <ChevronRight size={14} color={theme.colors.antiqueGold} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    ...theme.shadows.cardGold,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  typeMeta: {
    flex: 1,
  },
  typeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  imageThumbnail: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceGold,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    ...theme.typography.badge,
    color: theme.colors.deepChocolateLight,
    fontWeight: '700',
  },
  refText: {
    ...theme.typography.caption,
    fontSize: 10,
    color: theme.colors.textMuted,
    fontFamily: Platform?.OS === 'ios' ? 'Courier' : 'monospace',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dateText: {
    ...theme.typography.caption,
    color: theme.colors.deepChocolateLight,
  },
  badgesCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  paymentPill: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.textMuted,
  },
  paymentSuccess: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
  },
  paymentFailed: {
    backgroundColor: '#FEE2E2',
    color: '#B91C1C',
  },
  body: {
    marginVertical: theme.spacing.xs,
  },
  title: {
    ...theme.typography.h4,
    color: theme.colors.deepChocolate,
    fontWeight: '700',
  },
  subtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderGold,
  },
  price: {
    ...theme.typography.h4,
    color: theme.colors.antiqueGold,
    fontWeight: '800',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsBtnText: {
    ...theme.typography.captionBold,
    color: theme.colors.antiqueGold,
  },
});
