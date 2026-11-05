import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Globe } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { KingsTaxiLogo } from './KingsTaxiLogo';
import { LanguageSelectorModal } from '../common/LanguageSelectorModal';
import { SUPPORTED_LANGUAGES, useTranslation } from '../../i18n';
import { useSettingsStore } from '../../stores';

interface BrandHeaderProps {
  showLanguagePill?: boolean;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({
  showLanguagePill = true,
  rightAction,
  style,
}) => {
  const [langModalVisible, setLangModalVisible] = useState(false);
  const { language } = useSettingsStore();

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <>
      <View style={[styles.container, style]}>
        <KingsTaxiLogo variant="header" showTagline showText />

        <View style={styles.rightCluster}>
          {showLanguagePill && (
            <TouchableOpacity
              style={styles.langPill}
              onPress={() => setLangModalVisible(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Current language: ${currentLang.nativeName}. Tap to change language.`}
            >
              <Globe size={14} color={colors.deepGold} />
              <Text style={styles.langPillText}>{currentLang.nativeName}</Text>
            </TouchableOpacity>
          )}
          {rightAction}
        </View>
      </View>

      <LanguageSelectorModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.lightGold,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.champagne,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.deepGold,
  },
});
