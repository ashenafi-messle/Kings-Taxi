import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';

interface RememberEmailCheckboxProps {
  checked: boolean;
  onToggle: (nextState: boolean) => void;
}

export const RememberEmailCheckbox: React.FC<RememberEmailCheckboxProps> = ({
  checked,
  onToggle,
}) => {
  const { t } = useTranslation(['auth']);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onToggle(!checked)}
      activeOpacity={0.8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={t('auth:rememberEmail')}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && <Check size={13} color={colors.white} strokeWidth={3} />}
      </View>
      <Text style={styles.label}>{t('auth:rememberEmail')}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: colors.primaryGold,
    borderColor: colors.primaryGold,
  },
  label: {
    fontSize: 13,
    color: colors.dark,
    fontWeight: '500',
  },
});
