import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { theme } from '../theme';

export interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'gold' | 'navy' | 'danger';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'gold',
  style,
  textStyle,
  icon,
}) => {
  const isActionDisabled = disabled || loading;

  const getBackgroundColor = () => {
    if (isActionDisabled) return theme.colors.surfaceMuted;
    if (variant === 'navy') return theme.colors.secondary;
    if (variant === 'danger') return theme.colors.danger;
    return theme.colors.primary;
  };

  const getTextColor = () => {
    if (isActionDisabled) return theme.colors.textMuted;
    if (variant === 'navy' || variant === 'danger') return theme.colors.textInverse;
    return theme.colors.text; // Near black on gold for maximum contrast
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: isActionDisabled, busy: loading }}
      activeOpacity={0.8}
      disabled={isActionDisabled}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        isActionDisabled && styles.disabledBorder,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'gold' ? theme.colors.text : theme.colors.textInverse}
        />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: theme.layout.buttonHeight,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
    ...theme.shadows.subtle,
  },
  text: {
    ...theme.typography.h4,
    textAlign: 'center',
  },
  disabledBorder: {
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
