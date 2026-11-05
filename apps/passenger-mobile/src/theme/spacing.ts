export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const layout = {
  screenPadding: 16,
  cardRadius: 16,
  inputHeight: 52,
  buttonHeight: 52,
  iconSizeSm: 18,
  iconSizeMd: 24,
  iconSizeLg: 32,
  tabBarBaseHeight: 52,
  tabBarContentPadding: 104, // Generous padding to ensure last item is fully above bottom bar
} as const;
