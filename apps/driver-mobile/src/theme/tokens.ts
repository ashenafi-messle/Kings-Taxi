import { Platform } from 'react-native';

export const BRAND_LOGO_URL =
  'https://res.cloudinary.com/oxzqogef/image/upload/v1795761825/Gemini_Generated_Image_8utz418utz418utz.jpg';

export const Colors = {
  primarySilver: '#C7C9CC',
  lightSilver: '#E5E7EB',
  screenBg: '#F5F6F7',
  cardWhite: '#FFFFFF',
  primaryBlack: '#111111',
  secondaryText: '#777777',
  border: '#E3E5E8',
  success: '#2E7D32',
  successBg: '#EAF5EC',
  warning: '#B7791F',
  warningBg: '#FDF6E7',
  error: '#C62828',
  errorBg: '#FDECEC',
  metallicMuted: '#9EA3AE',
  surfaceSubtle: '#ECEEF1',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const CardShadow = Platform.select({
  ios: {
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: {
    elevation: 2,
  },
  default: {
    boxShadow: '0px 4px 12px rgba(17, 17, 17, 0.06)',
  },
});
