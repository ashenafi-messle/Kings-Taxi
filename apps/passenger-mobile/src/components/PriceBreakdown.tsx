import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';
import { formatETB } from '../utils/currency';

export interface PriceBreakdownItem {
  label: string;
  amount: number;
  isDiscount?: boolean;
}

export interface PriceBreakdownProps {
  items: PriceBreakdownItem[];
  total: number;
  totalLabel?: string;
  currency?: string;
  style?: ViewStyle;
}

export const PriceBreakdown: React.FC<PriceBreakdownProps> = ({
  items,
  total,
  totalLabel = 'Total Payable',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {items.map((item, index) => (
        <View key={index} style={styles.row}>
          <Text style={styles.label}>{item.label}</Text>
          <Text
            style={[
              styles.value,
              item.isDiscount && { color: theme.colors.success },
            ]}
          >
            {item.isDiscount ? `-${formatETB(item.amount)}` : formatETB(item.amount)}
          </Text>
        </View>
      ))}
      <View style={styles.divider} />
      <View style={[styles.row, styles.totalRow]}>
        <Text style={styles.totalLabel}>{totalLabel}</Text>
        <Text style={styles.totalValue}>{formatETB(total)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  label: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  value: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  totalRow: {
    marginBottom: 0,
    marginTop: theme.spacing.xs,
  },
  totalLabel: {
    ...theme.typography.h4,
    color: theme.colors.text,
  },
  totalValue: {
    ...theme.typography.h3,
    color: theme.colors.primaryDark,
  },
});
