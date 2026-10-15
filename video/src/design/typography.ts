import { CSSProperties } from 'react';

export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    display: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  styles: {
    heroTitle: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 52,
      fontWeight: 700,
      letterSpacing: '-0.025em',
      lineHeight: 1.15,
    } as CSSProperties,

    sceneTitle: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 40,
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.25,
    } as CSSProperties,

    sectionHeading: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 28,
      fontWeight: 600,
      letterSpacing: '-0.015em',
      lineHeight: 1.3,
    } as CSSProperties,

    bodyLarge: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 22,
      fontWeight: 400,
      letterSpacing: '-0.01em',
      lineHeight: 1.45,
    } as CSSProperties,

    bodyMedium: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 18,
      fontWeight: 400,
      letterSpacing: '0',
      lineHeight: 1.4,
    } as CSSProperties,

    codeBadge: {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: 16,
      fontWeight: 600,
      letterSpacing: '0.04em',
    } as CSSProperties,

    caption: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 26,
      fontWeight: 500,
      letterSpacing: '-0.01em',
      lineHeight: 1.35,
    } as CSSProperties,

    sourceLabel: {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: 13,
      fontWeight: 500,
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
    } as CSSProperties,

    timestamp: {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: 14,
      fontWeight: 500,
      letterSpacing: '0.08em',
    } as CSSProperties,
  },
} as const;
