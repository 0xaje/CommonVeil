export const colors = {
  // Incident-document palette (Scene 01). Scene 01 and Scene 02 deliberately
  // share the same Midnight foundation so the film reads as one production.
  // Evidence cards are elevated documents, not a separate white presentation.
  editorial: {
    bg: '#11152D',
    surface: '#181E3D',
    surfaceSubtle: '#20284F',
    border: 'rgba(148, 163, 184, 0.18)',
    borderMedium: 'rgba(148, 163, 184, 0.30)',
    shadow: '0 16px 44px rgba(0, 0, 0, 0.45)',

    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',

    // Restrained warning red
    red: '#F87171',
    redMuted: '#EF4444',
    redBg: 'rgba(239, 68, 68, 0.10)',
    redBorder: 'rgba(248, 113, 113, 0.38)',
  },

  // Midnight Indigo Palette (Scene 02 & Cryptographic Solution)
  midnight: {
    bg: '#11152D',               // Deep Midnight indigo presentation background
    bgGradient: 'radial-gradient(ellipse at 50% 40%, #1A2146 0%, #11152D 75%, #0B0E20 100%)',
    surface: '#181E3D',          // Clearly separated elevated content panel
    surfaceElevated: '#20284F',  // Highlighted / focused panel
    surfaceDim: 'rgba(24, 30, 61, 0.55)', // Receded panel
    border: 'rgba(148, 163, 184, 0.18)',
    borderActive: 'rgba(0, 229, 255, 0.5)',
    borderViolet: 'rgba(121, 82, 245, 0.5)',
    shadow: '0 16px 44px rgba(0, 0, 0, 0.45)',

    // High-contrast text on Midnight
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',

    // Accents
    cyan: '#00E5FF',
    cyanMuted: 'rgba(0, 229, 255, 0.15)',
    violet: '#7952F5',
    violetMuted: 'rgba(121, 82, 245, 0.18)',
    green: '#10B981',
    greenMuted: 'rgba(16, 185, 129, 0.15)',
  },

  // Global Caption Overlay (Consistent, highly legible across both light and dark scenes)
  caption: {
    bg: 'rgba(17, 21, 45, 0.94)',
    border: 'rgba(148, 163, 184, 0.28)',
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
    shadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
  },
} as const;

