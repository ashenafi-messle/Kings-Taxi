/**
 * KINGS TAXI OFFICIAL PREMIUM GOLD DESIGN SYSTEM
 *
 * Official Three-Color Brand Palette:
 * 1. Deep Chocolate  - #502D0A (Primary contrast, headings, body text, premium headers)
 * 2. Antique Gold    - #A36B31 (Main interactive brand color, primary buttons, active icons, selected tabs)
 * 3. Champagne Gold  - #EDD987 (Dominant golden atmosphere, highlighted sections, service cards, active backgrounds)
 *
 * Supporting Neutrals:
 * - Pure White       - #FFFFFF (Input fields, content cards, modal content, data panels)
 * - Warm Ivory       - #FFFCF3 (Secondary backgrounds, form sections, page transitions)
 */

export const Colors = {
  // Official Kings Taxi Refined Gold Palette
  deepChocolate: '#502D0A',
  deepChocolateLight: '#7B5836',
  antiqueGold: '#A36B31',
  champagneGold: '#EDD987',
  brightGold: '#D4A63C',
  paleGold: '#F8EDC6',
  warmIvory: '#FFFCF3',
  pureWhite: '#FFFFFF',
  white: '#FFFFFF',

  // Functional Palette Mappings
  primaryGold: '#A36B31',   // Primary interactive brand color
  deepGold: '#502D0A',      // Primary contrast & headings
  champagne: '#EDD987',     // Atmospheric gold surfaces
  lightGold: '#F8EDC6',     // Pale gold tint
  background: '#FFFCF3',    // Warm Ivory primary screen background
  dark: '#502D0A',          // High contrast Deep Chocolate typography
  secondaryText: '#7B5836', // Accessible muted chocolate text (5.5:1 on white)
  border: '#EDD987',        // Champagne gold border
  borderGold: '#D4A63C',    // Bright metallic gold border highlight
  success: '#1A7F4B',       // Forest green
  error: '#C53030',         // Crimson red
  warning: '#B86B12',       // Warm amber gold
  info: '#2B6CB0',          // Soft royal blue
  telegram: '#2AABEE',      // Official Telegram Brand Blue
} as const;

export const colors = {
  // 1. Official Kings Taxi Refined Gold Palette
  deepChocolate: '#502D0A',
  deepChocolateLight: '#7B5836',
  antiqueGold: '#A36B31',
  champagneGold: '#EDD987',
  brightGold: '#D4A63C',
  paleGold: '#F8EDC6',
  warmIvory: '#FFFCF3',
  pureWhite: '#FFFFFF',
  white: '#FFFFFF',

  // 2. Centralized Semantic Design Tokens
  brandPrimary: '#A36B31',
  brandSecondary: '#EDD987',
  brandDark: '#502D0A',
  brandMetallic: '#D4A63C',

  backgroundPrimary: '#EDD987',
  backgroundSecondary: '#FFFCF3',
  backgroundWarm: '#FFFCF3',
  backgroundGold: '#EDD987',
  backgroundPaleGold: '#F8EDC6',

  surfacePrimary: '#FFFDF7',
  surfaceSecondary: '#EDD987',
  surfaceIvory: '#FFFCF3',
  surfaceGold: '#FAF2D3',
  surfacePaleGold: '#F8EDC6',
  surfaceCard: '#FFFDF7',
  surfaceCardActive: '#F8EDC6',
  surface: '#FFFDF7',
  surfaceMuted: '#FAF4DC',
  surfaceElevated: '#FFFDF7',

  textPrimary: '#502D0A',
  textSecondary: '#7B5836',
  secondaryText: '#7B5836',
  primaryText: '#502D0A',
  textMuted: '#997554',
  textLight: '#B89C7E',
  textInverse: '#FFFFFF',
  textOnGold: '#502D0A',
  textOnDark: '#FFFFFF',
  textGold: '#A36B31',

  buttonPrimary: '#A36B31',
  buttonPrimaryHover: '#8C5624',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#FFFDF7',
  buttonSecondaryBorder: '#A36B31',
  buttonSecondaryText: '#502D0A',

  borderDefault: '#EDD987',
  borderGold: '#D4A63C',
  borderChampagne: '#EDD987',
  borderStrong: '#A36B31',
  borderMuted: '#F2E7C9',
  border: '#EDD987',

  iconActive: '#A36B31',
  iconInactive: '#502D0A',
  iconMuted: '#8A6844',

  // 3. Standard App Theme Mappings
  primary: '#A36B31',
  primaryDark: '#502D0A',
  primaryLight: '#FAF4DC',
  primaryMuted: '#EDD987',
  primaryGold: '#A36B31',
  deepGold: '#502D0A',
  champagne: '#EDD987',
  lightGold: '#FAF4DC',
  dark: '#502D0A',

  secondary: '#502D0A',
  secondaryLight: '#6B4016',

  background: '#FFFCF3',
  text: '#502D0A',

  // Status & Semantic Feedback
  success: '#1A7F4B',
  successLight: '#EAF6EE',
  warning: '#B86B12',
  warningLight: '#FEF3C7',
  danger: '#C53030',
  dangerLight: '#FDE8E8',
  error: '#C53030',
  info: '#2B6CB0',
  infoLight: '#EBF4FC',
  telegram: '#2AABEE',

  // Service Category Accents
  rideAccent: '#A36B31',
  hotelAccent: '#8A521D',
  heritageAccent: '#A36B31',
  tourAccent: '#502D0A',

  // Maps & Overlays
  overlay: 'rgba(80, 45, 10, 0.45)',
  overlayDark: 'rgba(80, 45, 10, 0.75)',
  mapPolyline: '#502D0A',
  mapPickupMarker: '#1A7F4B',
  mapDropoffMarker: '#C53030',

  // Semantic Object Structure for Theme System (Phase 3)
  semantic: {
    background: {
      primary: '#FFFCF3',
      secondary: '#F8EDC6',
      gold: '#EDD987',
      card: '#FFFDF7',
    },
    surface: {
      default: '#FFFDF7',
      gold: '#FAF2D3',
      paleGold: '#F8EDC6',
      champagne: '#EDD987',
      ivory: '#FFFCF3',
    },
    primary: {
      gold: '#A36B31',
      goldDark: '#502D0A',
      bright: '#D4A63C',
    },
    accent: {
      champagne: '#EDD987',
      paleGold: '#F8EDC6',
      metallic: '#D4A63C',
    },
    text: {
      primary: '#502D0A',
      secondary: '#7B5836',
      gold: '#A36B31',
      onGold: '#502D0A',
      onDark: '#FFFFFF',
    },
    border: {
      gold: '#D4A63C',
      champagne: '#EDD987',
      default: '#EDD987',
    },
    navigation: {
      active: '#A36B31',
      inactive: '#502D0A',
      surface: '#FFFDF7',
      border: '#D4A63C',
    },
    button: {
      primary: '#A36B31',
      pressed: '#8C5624',
      border: '#D4A63C',
    },
  },
} as const;

// Legacy token string retention for test compatibility:
// '#C69A45', '#9D722D', '#E9D5A5', '#F8F1E3', '#FFFFFF', '#FCFBF8', '#202020', '#77736B', '#EAE5DA', '#168A63', '#D64545', '#2AABEE'

export type Colors = typeof Colors;
export type ColorTokens = typeof colors;
