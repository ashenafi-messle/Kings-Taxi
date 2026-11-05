import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Car, Hotel, Compass, Calendar, ChevronRight } from 'lucide-react-native';
import { theme } from '../theme';
import { StatusBadge } from './StatusBadge';
import { formatETB } from '../utils/currency';
import { formatDateShort } from '../utils/date';
import { useTranslation } from '../i18n';

export interface BookingSummaryItem {
  id: string;
  type: 'ride' | 'hotel' | 'tour';
  title: string;
  subtitle: string;
  date: string;
  priceETB: number;
  status: string;
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

  const getTypeName = () => {
    switch (booking.type) {
      case 'ride':
        return t('card.rideType');
      case 'hotel':
        return t('card.hotelType');
      case 'tour':
        return t('card.tourType');
    }
  };

  const getIcon = () => {
    switch (booking.type) {
      case 'ride':
        return <Car size={20} color={theme.colors.primaryDark} />;
      case 'hotel':
        return <Hotel size={20} color={theme.colors.hotelAccent} />;
      case 'tour':
        return <Compass size={20} color={theme.colors.tourAccent} />;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.container, style]}
    >
      <View style={styles.topRow}>
        <View style={styles.typeRow}>
          <View style={styles.iconCircle}>{getIcon()}</View>
          <View>
            <Text style={styles.typeText}>{getTypeName()}</Text>
            <View style={styles.dateRow}>
              <Calendar size={12} color={theme.colors.textMuted} />
              <Text style={styles.dateText}>{formatDateShort(booking.date)}</Text>
            </View>
          </View>
        </View>
        <StatusBadge status={booking.status} />
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{booking.title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{booking.subtitle}</Text>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.price}>{formatETB(booking.priceETB)}</Text>
        <View style={styles.detailsBtn}>
          <Text style={styles.detailsBtnText}>{t('card.viewReceipt')}</Text>
          <ChevronRight size={14} color={theme.colors.secondary} />
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.subtle,
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
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    ...theme.typography.badge,
    color: theme.colors.textMuted,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dateText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  body: {
    marginVertical: theme.spacing.xs,
  },
  title: {
    ...theme.typography.h4,
    color: theme.colors.text,
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
    borderTopColor: theme.colors.border,
  },
  price: {
    ...theme.typography.h4,
    color: theme.colors.primaryDark,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsBtnText: {
    ...theme.typography.captionBold,
    color: theme.colors.secondary,
  },
});
