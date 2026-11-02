import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { MapPin, Navigation } from 'lucide-react-native';
import { theme } from '../theme';
import { AddressLocation } from '../types';

export interface DestinationCardProps {
  location: AddressLocation;
  onSelect: () => void;
  isRecent?: boolean;
  style?: ViewStyle;
}

export const DestinationCard: React.FC<DestinationCardProps> = ({
  location,
  onSelect,
  isRecent = false,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onSelect}
      style={[styles.container, style]}
    >
      <View style={styles.iconContainer}>
        {isRecent ? (
          <Navigation size={18} color={theme.colors.primaryDark} />
        ) : (
          <MapPin size={18} color={theme.colors.secondary} />
        )}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>{location.title}</Text>
        <Text style={styles.address} numberOfLines={1}>
          {location.subtitle || location.address}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  address: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
