import React from 'react';
import { colors } from '../design/colors';
import { typography } from '../design/typography';

interface BrandMarkProps {
  opacity?: number;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ opacity = 1 }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 48,
        left: 64,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        opacity,
        zIndex: 50,
      }}
    >
      <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
        <rect
          x="2"
          y="2"
          width="28"
          height="28"
          rx="6"
          stroke={colors.midnight.border}
          strokeWidth="1.5"
          fill="rgba(4, 8, 20, 0.6)"
        />
        <path
          d="M8 11L16 6L24 11V18C24 22.5 16 26 16 26C16 26 8 22.5 8 18V11Z"
          stroke={colors.midnight.cyan}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="15" r="2.5" fill={colors.midnight.violet} />
      </svg>

      <span
        style={{
          ...typography.styles.label,
          fontSize: 22,
          color: colors.midnight.textMuted,
        }}
      >
        COMMONVEIL
      </span>
    </div>
  );
};

