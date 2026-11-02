import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import {
  Smartphone,
  CreditCard,
  Building2,
  Banknote,
  CheckCircle2,
} from 'lucide-react-native';
import { theme } from '../theme';
import { PaymentMethodOption } from '../types';

export interface PaymentMethodCardProps {
  method: PaymentMethodOption;
  isSelected: boolean;
  onSelect: () => void;
  style?: ViewStyle;
}

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  method,
  isSelected,
  onSelect,
  style,
}) => {
  const renderIcon = () => {
    switch (method.id) {
      case 'telebirr':
        return <Smartphone size={24} color="#007ACC" />;
      case 'cbe_birr':
        return <Building2 size={24} color="#800080" />;
      case 'chapa':
        return <CreditCard size={24} color="#10B981" />;
      case 'bank_transfer':
        return <Building2 size={24} color={theme.colors.secondary} />;
      case 'cash':
      default:
        return <Banknote size={24} color="#16A34A" />;
    }
  };

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
      <View style={styles.iconWrapper}>{renderIcon()}</View>
      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{method.name}</Text>
          {method.badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{method.badge}</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle}>{method.subtitle}</Text>
      </View>
      <View style={styles.selectionIndicator}>
        {isSelected ? (
          <CheckCircle2 size={22} color={theme.colors.primaryDark} fill={theme.colors.primaryLight} />
        ) : (
          <View style={styles.radioUnchecked} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.subtle,
  },
  selectedContainer: {
    borderColor: theme.colors.primaryDark,
    backgroundColor: theme.colors.primaryLight,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  name: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  badge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.primaryMuted,
  },
  badgeText: {
    ...theme.typography.badge,
    color: theme.colors.primaryDark,
  },
  selectionIndicator: {
    marginLeft: theme.spacing.sm,
  },
  radioUnchecked: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.borderStrong,
  },
});
