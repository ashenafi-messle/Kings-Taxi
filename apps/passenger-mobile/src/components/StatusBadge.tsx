import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';
import { StatusVariant } from '../types';

export interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  style,
}) => {
  const resolveVariant = (): StatusVariant => {
    if (variant) return variant;
    const s = status.toUpperCase();
    if (s.includes('COMPLETED') || s.includes('CONFIRMED') || s.includes('ARRIVED')) {
      return 'success';
    }
    if (s.includes('SEARCHING') || s.includes('PENDING') || s.includes('REQUESTED')) {
      return 'warning';
    }
    if (s.includes('CANCELLED') || s.includes('FAILED')) {
      return 'danger';
    }
    if (s.includes('ASSIGNED') || s.includes('STARTED') || s.includes('ARRIVING')) {
      return 'info';
    }
    return 'default';
  };

  const v = resolveVariant();

  const getColors = () => {
    switch (v) {
      case 'success':
        return { bg: theme.colors.successLight, text: theme.colors.success };
      case 'warning':
        return { bg: theme.colors.warningLight, text: '#B45309' };
      case 'danger':
        return { bg: theme.colors.dangerLight, text: theme.colors.danger };
      case 'info':
        return { bg: theme.colors.infoLight, text: theme.colors.info };
      default:
        return { bg: theme.colors.surfaceMuted, text: theme.colors.textSecondary };
    }
  };

  const { bg, text } = getColors();

  const formatStatus = (raw: string) => {
    return raw.replace(/_/g, ' ');
  };

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: text }]}>{formatStatus(status)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    ...theme.typography.badge,
    textTransform: 'uppercase',
  },
});
