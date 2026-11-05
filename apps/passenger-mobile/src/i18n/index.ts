import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { resources, defaultNamespace, namespaces } from './config';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  getPersistedLanguage,
  persistLanguage,
} from './languageDetector';

let isInitialized = false;

export async function initI18n(): Promise<void> {
  if (isInitialized) return;

  const initialLanguage = await getPersistedLanguage();

  await i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    defaultNS: defaultNamespace,
    ns: [...namespaces],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Mobile doesn't require Suspense
    },
    compatibilityJSON: 'v4',
  });

  isInitialized = true;
}

// Synchronously initialize with fallback so modules calling i18n before async boot don't crash
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: defaultNamespace,
    ns: [...namespaces],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    compatibilityJSON: 'v4',
  });
}

/**
 * Changes active language, saves to persistent storage, and updates i18n
 */
export async function changeLanguage(language: SupportedLanguage): Promise<void> {
  await persistLanguage(language);
  await i18n.changeLanguage(language);
}

/**
 * Gets the current active language code
 */
export function getCurrentLanguage(): SupportedLanguage {
  const current = (i18n.language || 'en').slice(0, 2) as SupportedLanguage;
  if (current === 'am' || current === 'om') return current;
  return 'en';
}

/**
 * Maps app language code to BCP-47 locale string for Intl APIs
 */
export function getLanguageLocale(lang?: SupportedLanguage): string {
  const active = lang || getCurrentLanguage();
  switch (active) {
    case 'am':
      return 'am-ET';
    case 'om':
      return 'om-ET';
    case 'en':
    default:
      return 'en-ET';
  }
}

export {
  useTranslation,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  getPersistedLanguage,
  persistLanguage,
};
export default i18n;

