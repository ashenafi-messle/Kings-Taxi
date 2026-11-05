import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

export type SupportedLanguage = 'en' | 'am' | 'om';

export const LANGUAGE_STORAGE_KEY = 'kings_taxi_user_language';

export const SUPPORTED_LANGUAGES: {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  sublabel: string;
}[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    sublabel: 'Default (Ethiopia & Global)',
  },
  {
    code: 'am',
    name: 'Amharic',
    nativeName: 'አማርኛ',
    sublabel: 'ኢትዮጵያ',
  },
  {
    code: 'om',
    name: 'Afaan Oromoo',
    nativeName: 'Afaan Oromoo',
    sublabel: 'Oromiyaa',
  },
];

/**
 * Detects device language or falls back to 'en'
 */
export function detectDeviceLanguage(): SupportedLanguage {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const code = locales[0].languageCode?.toLowerCase();
      if (code === 'am') return 'am';
      if (code === 'om') return 'om';
    }
  } catch (error) {
    console.warn('[i18n] Error detecting device locale:', error);
  }
  return 'en';
}

/**
 * Retrieves saved language preference from AsyncStorage
 */
export async function getPersistedLanguage(): Promise<SupportedLanguage> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'am' || saved === 'om') {
      return saved as SupportedLanguage;
    }
  } catch (error) {
    console.warn('[i18n] Error reading persisted language:', error);
  }
  return detectDeviceLanguage();
}

/**
 * Persists language preference to AsyncStorage
 */
export async function persistLanguage(language: SupportedLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.error('[i18n] Error persisting language:', error);
  }
}

