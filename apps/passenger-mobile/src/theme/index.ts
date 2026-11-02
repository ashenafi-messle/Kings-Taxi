import { colors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius, layout } from './spacing';
import { shadows } from './shadows';

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  layout,
  shadows,
} as const;

export type Theme = typeof theme;
export * from './colors';
export * from './typography';
export * from './spacing';
export * from './shadows';
