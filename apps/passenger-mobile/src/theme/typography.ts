import { TextStyle } from 'react-native';

export const typography = {
  h1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  } as TextStyle,
  h2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  } as TextStyle,
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  } as TextStyle,
  h4: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  } as TextStyle,
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  } as TextStyle,
  bodyBold: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  } as TextStyle,
  bodySmall: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  } as TextStyle,
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  } as TextStyle,
  captionBold: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  } as TextStyle,
  badge: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  } as TextStyle,
} as const;

export type Typography = typeof typography;
