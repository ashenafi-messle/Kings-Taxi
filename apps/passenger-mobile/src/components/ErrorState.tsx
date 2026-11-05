import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { theme } from '../theme';
import { SecondaryButton } from './SecondaryButton';
import { useTranslation } from '../i18n';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  onRetry,
  style,
}) => {
  const { t } = useTranslation('common');
  const displayTitle = title || t('somethingWentWrong');

  return (
    <View style={[styles.container, style]}>
      <AlertCircle size={40} color={theme.colors.danger} style={styles.icon} />
      <Text style={styles.title}>{displayTitle}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <SecondaryButton
          title={t('tryAgain')}
          onPress={onRetry}
          style={styles.retryButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  retryButton: {
    minWidth: 140,
  },
});
