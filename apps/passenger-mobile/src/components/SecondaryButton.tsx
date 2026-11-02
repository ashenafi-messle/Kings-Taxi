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

export interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'outline' | 'ghost';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'outline',
  style,
  textStyle,
  icon,
}) => {
  const isActionDisabled = disabled || loading;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: isActionDisabled, busy: loading }}
      activeOpacity={0.7}
      disabled={isActionDisabled}
      onPress={onPress}
      style={[
        styles.button,
        variant === 'outline' && styles.outline,
        isActionDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              isActionDisabled && { color: theme.colors.textMuted },
              textStyle,
            ]}
          >
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
    backgroundColor: 'transparent',
  },
  outline: {
    borderWidth: 1.5,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    ...theme.typography.h4,
    color: theme.colors.text,
    textAlign: 'center',
  },
});
