import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';
import { useTranslation } from '../i18n';

export interface LoadingStateProps {
  message?: string;
  style?: ViewStyle;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  style,
}) => {
  const { t } = useTranslation('common');
  const displayMessage = message !== undefined ? message : t('loading');

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={theme.colors.primaryDark} />
      {displayMessage ? <Text style={styles.message}>{displayMessage}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
  },
});
