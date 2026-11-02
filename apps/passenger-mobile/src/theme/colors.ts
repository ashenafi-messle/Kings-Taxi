/**
 * Kings Taxi Color Tokens
 * Premium Ethiopian Mobility & Hospitality Identity
 */
export const colors = {
  // Brand Gold
  primary: '#D4AF37', // Imperial Ethiopian Gold
  primaryDark: '#AA820A',
  primaryLight: '#FFF9E6',
  primaryMuted: '#E6C65A',

  // Deep Navy / Slate for Royal Contrast
  secondary: '#0F1E36', // Deep Royal Blue
  secondaryLight: '#1C2E4A',

  // Surfaces & Backgrounds
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F3F5',
  surfaceElevated: '#FFFFFF',

  // Borders & Dividers
  border: '#E9ECEF',
  borderStrong: '#CED4DA',
  borderGold: '#E6D385',

  // Text Hierarchy
  text: '#1A1D20', // Near Black for optimal readability
  textSecondary: '#495057', // Muted body text
  textMuted: '#6C757D', // Captions and timestamps
  textLight: '#ADB5BD',
  textInverse: '#FFFFFF',
  textGold: '#AA820A',

  // Status & Semantic Feedback
  success: '#198754',
  successLight: '#E8F5E9',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#DC3545',
  dangerLight: '#FEE2E2',
  info: '#0D6EFD',
  infoLight: '#E7F1FF',

  // Specific Service Category Accents
  rideAccent: '#D4AF37',
  hotelAccent: '#3B82F6',
  heritageAccent: '#8B5CF6',
  tourAccent: '#10B981',

  // Maps & Overlays
  overlay: 'rgba(0, 0, 0, 0.45)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
  mapPolyline: '#0F1E36',
  mapPickupMarker: '#10B981',
  mapDropoffMarker: '#DC3545',
} as const;

export type Colors = typeof colors;
