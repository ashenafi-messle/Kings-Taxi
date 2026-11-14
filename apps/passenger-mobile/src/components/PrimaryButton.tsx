import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
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
    if (variant === 'navy') return theme.colors.deepChocolate;
    if (variant === 'danger') return theme.colors.danger;
    return theme.colors.buttonPrimary;
  };

  const getTextColor = () => {
    if (isActionDisabled) return theme.colors.textMuted;
    if (variant === 'navy' || variant === 'danger') return theme.colors.textInverse;
    return theme.colors.buttonPrimaryText;
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: isActionDisabled, busy: loading }}
      activeOpacity={0.8}
      disabled={isActionDisabled}
      onPress={() => {
        if (
          Platform.OS === 'web' &&
          typeof document !== 'undefined' &&
          document.activeElement instanceof HTMLElement
        ) {
          document.activeElement.blur();
        }
        onPress();
      }}
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
    borderWidth: 1.5,
    borderColor: '#D4A63C',
    ...theme.shadows.goldSubtle,
  },
  text: {
    ...theme.typography.h4,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  disabledBorder: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
});
