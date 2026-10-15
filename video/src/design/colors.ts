export const colors = {
  // Midnight foundation
  bg: {
    primary: '#040814',
    secondary: '#070e22',
    surface: '#0d1633',
    surfaceSubtle: 'rgba(13, 22, 51, 0.75)',
    card: 'rgba(16, 25, 53, 0.85)',
  },

  // Primary palette
  navy: {
    900: '#060b1a',
    800: '#0a122c',
    700: '#101d42',
    600: '#1a2a5e',
    500: '#2b3f80',
  },

  // Accents
  midnightViolet: {
    base: '#7952f5',
    bright: '#9d72ff',
    glow: 'rgba(121, 82, 245, 0.35)',
    dim: 'rgba(121, 82, 245, 0.15)',
  },
  midnightCyan: {
    base: '#00e5ff',
    bright: '#5df2ff',
    glow: 'rgba(0, 229, 255, 0.35)',
    dim: 'rgba(0, 229, 255, 0.12)',
  },

  // Danger / Vulnerability Accent (restrained red / amber)
  danger: {
    base: '#f97316',
    alert: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.4)',
    border: 'rgba(239, 68, 68, 0.65)',
    subtle: 'rgba(239, 68, 68, 0.15)',
  },

  // Monochromes & Text
  text: {
    primary: '#f8fafc',
    secondary: '#cbd5e1',
    muted: '#94a3b8',
    dim: '#64748b',
  },

  // Technical borders & lines
  border: {
    subtle: 'rgba(148, 163, 184, 0.15)',
    medium: 'rgba(148, 163, 184, 0.3)',
    active: 'rgba(0, 229, 255, 0.4)',
    violet: 'rgba(121, 82, 245, 0.4)',
  },

  // Supply chain graph elements
  graph: {
    nodeBg: '#0b132b',
    nodeBorder: 'rgba(100, 116, 139, 0.4)',
    nodeText: '#e2e8f0',
    link: 'rgba(100, 116, 139, 0.25)',
    linkActive: 'rgba(239, 68, 68, 0.6)',
    pkgHighlight: '#00e5ff',
    vulnHighlight: '#ef4444',
  },
} as const;
