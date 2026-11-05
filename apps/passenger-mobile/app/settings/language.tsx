import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, Globe } from 'lucide-react-native';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components';
import { useSettingsStore, SupportedLanguage } from '../../src/stores';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../src/i18n';

export default function LanguageSettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation(['profile', 'common']);
  const { language, setLanguage } = useSettingsStore();

  const handleSelect = async (code: SupportedLanguage) => {
    await setLanguage(code);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('language.title')} showBack />
      <View style={styles.content}>
        <View style={styles.infoBanner}>
          <Globe size={20} color={theme.colors.primaryDark} />
          <Text style={styles.infoText}>
            {t('language.description')}
          </Text>
        </View>

        <View style={styles.listCard}>
          {SUPPORTED_LANGUAGES.map((item) => {
            const isSelected = language === item.code;
            return (
              <TouchableOpacity
                key={item.code}
                activeOpacity={0.8}
                onPress={() => handleSelect(item.code)}
                accessibilityRole="button"
                accessibilityLabel={`${item.nativeName} (${item.name})`}
                accessibilityState={{ selected: isSelected }}
                style={[
                  styles.languageItem,
                  isSelected && styles.languageItemSelected,
                ]}
              >
                <View style={styles.languageTextWrap}>
                  <Text style={styles.nativeName}>{item.nativeName}</Text>
                  <Text style={styles.englishName}>
                    {item.name} • {item.sublabel}
                  </Text>
                </View>
                {isSelected ? (
                  <CheckCircle2 size={22} color={theme.colors.primaryDark} fill={theme.colors.primaryLight} />
                ) : (
                  <View style={styles.radioUnchecked} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primaryLight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    marginBottom: theme.spacing.md,
  },
  infoText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  listCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...theme.shadows.subtle,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  languageItemSelected: {
    backgroundColor: theme.colors.primaryLight,
  },
  languageTextWrap: {
    flex: 1,
  },
  nativeName: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  englishName: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  radioUnchecked: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.borderStrong,
  },
});
