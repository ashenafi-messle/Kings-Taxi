import { SupportedLanguage, getCurrentLanguage, getLanguageLocale } from '../i18n';

export function formatDateShort(dateString: string, lang?: SupportedLanguage): string {
  try {
    const d = new Date(dateString);
    const activeLang = lang || getCurrentLanguage();
    const locale = getLanguageLocale(activeLang);

    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatTimeShort(dateString: string, lang?: SupportedLanguage): string {
  try {
    const d = new Date(dateString);
    const activeLang = lang || getCurrentLanguage();
    const locale = getLanguageLocale(activeLang);

    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string, lang?: SupportedLanguage): string {
  const activeLang = lang || getCurrentLanguage();
  const connector = activeLang === 'am' ? ' በ ' : activeLang === 'om' ? ' irratti ' : ' at ';
  return `${formatDateShort(dateString, activeLang)}${connector}${formatTimeShort(dateString, activeLang)}`;
}
