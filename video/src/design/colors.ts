export const colors = {
  // Editorial Incident Palette (Scene 01)
  editorial: {
    bg: '#F4F1EA',               // Warm off-white presentation background
    surface: '#FFFFFF',          // Pure white source surfaces
    surfaceSubtle: '#EDE8DE',    // Subtle secondary paper surface
    border: 'rgba(28, 30, 36, 0.12)',
    borderMedium: 'rgba(28, 30, 36, 0.24)',
    shadow: '0 12px 36px rgba(28, 30, 36, 0.07)',

    // Charcoal typography
    textPrimary: '#1C1E24',
    textSecondary: '#3C424E',
    textMuted: '#68707E',

    // Restrained warning red
    red: '#C53030',
    redMuted: '#9B2C2C',
    redBg: 'rgba(197, 48, 48, 0.08)',
    redBorder: 'rgba(197, 48, 48, 0.28)',
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

