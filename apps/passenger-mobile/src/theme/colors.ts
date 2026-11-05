/**
 * Kings Taxi Color Tokens
 * Premium Ethiopian Mobility & Hospitality Identity
 * Luxury Gold & Warm Ivory Design System
 */

export const Colors = {
  primaryGold: '#C69A45', // Official Kings Taxi Gold
  deepGold: '#9D722D',    // Deep Royal Gold Accent
  champagne: '#E9D5A5',   // Subtle Champagne Highlight
  lightGold: '#F8F1E3',   // Soft Gold Tint
  white: '#FFFFFF',
  background: '#FCFBF8',  // Warm Ivory Background
  dark: '#202020',        // Deep Charcoal for Optimal Typography Contrast
  secondaryText: '#77736B',
  border: '#EAE5DA',      // Elegant Warm Card Border
  success: '#168A63',     // Emerald Green
  error: '#D64545',       // Crimson Red
  warning: '#F59E0B',
  info: '#0D6EFD',
  telegram: '#2AABEE',    // Official Telegram Brand Blue
} as const;

export const colors = {
  // Brand Gold
  primary: '#C69A45', // Official Kings Taxi Gold
  primaryDark: '#9D722D',
  primaryLight: '#F8F1E3',
  primaryMuted: '#E9D5A5',
  primaryGold: '#C69A45',
  deepGold: '#9D722D',
  champagne: '#E9D5A5',
  lightGold: '#F8F1E3',
  white: '#FFFFFF',
  dark: '#202020',

  // Deep Charcoal & Contrast
  secondary: '#202020',
  secondaryLight: '#333333',
  secondaryText: '#77736B',

  // Surfaces & Backgrounds
  background: '#FCFBF8', // Warm luxury ivory
  surface: '#FFFFFF',
  surfaceMuted: '#F6F3ED',
  surfaceElevated: '#FFFFFF',

  // Borders & Dividers
  border: '#EAE5DA',
  borderStrong: '#D6CFBF',
  borderGold: '#E9D5A5',

  // Text Hierarchy
  text: '#202020', // Dark Charcoal for optimal readability
  textSecondary: '#77736B',
  textMuted: '#8E8A82',
  textLight: '#BDB9B0',
  textInverse: '#FFFFFF',
  textGold: '#9D722D',

  // Status & Semantic Feedback
  success: '#168A63',
  successLight: '#E8F5E9',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#D64545',
  dangerLight: '#FEE2E2',
  error: '#D64545',
  info: '#0D6EFD',
  infoLight: '#E7F1FF',
  telegram: '#2AABEE',

  // Specific Service Category Accents
  rideAccent: '#C69A45',
  hotelAccent: '#3B82F6',
  heritageAccent: '#8B5CF6',
  tourAccent: '#168A63',

  // Maps & Overlays
  overlay: 'rgba(0, 0, 0, 0.45)',
  overlayDark: 'rgba(0, 0, 0, 0.75)',
  mapPolyline: '#202020',
  mapPickupMarker: '#168A63',
  mapDropoffMarker: '#D64545',
} as const;

export type Colors = typeof Colors;
export type ColorTokens = typeof colors;
