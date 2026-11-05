import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  View,
} from 'react-native';
import { Send } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';

interface TelegramAuthButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  style?: ViewStyle;
}

export const TelegramAuthButton: React.FC<TelegramAuthButtonProps> = ({
  onPress,
  isLoading = false,
  style,
}) => {
  const { t } = useTranslation(['auth', 'common']);

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={t('auth:continueWithTelegram')}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.white} size="small" />
      ) : (
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Send size={15} color={colors.telegram} style={styles.sendIcon} />
          </View>
          <Text style={styles.label}>
            {t('auth:continueWithTelegram')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.telegram,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.telegram,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    transform: [{ rotate: '-15deg' }, { translateX: -1 }, { translateY: 0 }],
  },
  label: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
