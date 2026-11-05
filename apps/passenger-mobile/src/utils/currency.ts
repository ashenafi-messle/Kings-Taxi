import { SupportedLanguage, getCurrentLanguage, getLanguageLocale } from '../i18n';

/**
 * Formats a numeric value into Ethiopian Birr (ETB) format with locale-aware number formatting
 */
export function formatETB(
  amount: number | null | undefined,
  lang?: SupportedLanguage
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 ETB';
  }

  const activeLang = lang || getCurrentLanguage();
  const locale = getLanguageLocale(activeLang);

  let formattedNumber = Math.round(amount).toString();
  try {
    formattedNumber = new Intl.NumberFormat(locale).format(Math.round(amount));
  } catch {
    formattedNumber = Math.round(amount).toLocaleString('en-US');
  }

  const currencyUnit = activeLang === 'am' ? 'ብር' : 'ETB';
  return `${formattedNumber} ${currencyUnit}`;
}

export function formatPriceRangeETB(
  min: number,
  max: number,
  lang?: SupportedLanguage
): string {
  return `${formatETB(min, lang)} - ${formatETB(max, lang)}`;
}
