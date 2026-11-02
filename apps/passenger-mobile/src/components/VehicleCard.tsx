import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Car, Users, Clock } from 'lucide-react-native';
import { theme } from '../theme';
import { VehicleOption } from '../types';
import { formatETB } from '../utils/currency';

export interface VehicleCardProps {
  vehicle: VehicleOption;
  isSelected: boolean;
  onSelect: () => void;
  style?: ViewStyle;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  isSelected,
  onSelect,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onSelect}
      style={[
        styles.container,
        isSelected && styles.selectedContainer,
        style,
      ]}
    >
      <View style={styles.iconContainer}>
        <Car
          size={28}
          color={isSelected ? theme.colors.primaryDark : theme.colors.textSecondary}
        />
      </View>
      <View style={styles.detailsContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{vehicle.name}</Text>
          <View style={styles.capacityBadge}>
            <Users size={12} color={theme.colors.textMuted} />
            <Text style={styles.capacityText}>{vehicle.capacity}</Text>
          </View>
        </View>
        <Text style={styles.description}>{vehicle.description}</Text>
        <View style={styles.etaRow}>
          <Clock size={12} color={theme.colors.textMuted} />
          <Text style={styles.etaText}>{vehicle.etaMinutes} min away</Text>
        </View>
      </View>
      <View style={styles.priceContainer}>
        <Text style={styles.price}>{formatETB(vehicle.estimatedPrice)}</Text>
        <Text style={styles.estLabel}>Est. Fare</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.subtle,
  },
  selectedContainer: {
    borderColor: theme.colors.primaryDark,
    backgroundColor: theme.colors.primaryLight,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  detailsContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  name: {
    ...theme.typography.h4,
    color: theme.colors.text,
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  capacityText: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
  },
  description: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  etaText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginLeft: theme.spacing.sm,
  },
  price: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  estLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
});
