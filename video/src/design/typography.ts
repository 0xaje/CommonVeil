import { CSSProperties } from 'react';

/**
 * Permanent Readability Standards (Midnight Demonstration Film)
 * - Primary headline: minimum 64px
 * - Secondary headline: minimum 48px
 * - Body text intended to be read: minimum 30px
 * - Labels/source attribution: minimum 22px
 * - Captions: 40–46px
 * - Max caption width: approx 60% of frame (1152px on 1080p)
 * - Max caption lines: 2
 * - Title-safe margins: min 96px horizontal, 80px vertical
 */
export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    display: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  },

  // Minimum size constants for validation and strict design enforcement
  minSizes: {
    primaryHeadline: 64,
    secondaryHeadline: 48,
    body: 30,
    label: 22,
    captionMin: 40,
    captionMax: 46,
  },

  styles: {
    // Primary Headline (min 64px)
    primaryHeadline: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 64,
      fontWeight: 700,
      letterSpacing: '-0.025em',
      lineHeight: 1.15,
    } as CSSProperties,

    heroTitle: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 72,
      fontWeight: 800,
      letterSpacing: '-0.03em',
      lineHeight: 1.1,
    } as CSSProperties,

    // Secondary Headline (min 48px)
    secondaryHeadline: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 48,
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.25,
    } as CSSProperties,

    // Body Text Intended to be Read (min 30px)
    bodyLarge: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 32,
      fontWeight: 400,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
    } as CSSProperties,

    bodyText: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 30,
      fontWeight: 400,
      letterSpacing: '-0.005em',
      lineHeight: 1.45,
    } as CSSProperties,

    // Labels & Source Attribution (min 22px)
    label: {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: 22,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
    } as CSSProperties,

    labelLarge: {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: 24,
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
    } as CSSProperties,

    // Captions (40–46px; default 42px)
    caption: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 42,
      fontWeight: 600,
      letterSpacing: '-0.015em',
      lineHeight: 1.25,
    } as CSSProperties,
  },
} as const;

