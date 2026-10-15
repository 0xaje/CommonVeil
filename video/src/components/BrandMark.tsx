import React from 'react';
import { colors } from '../design/colors';
import { typography } from '../design/typography';

interface BrandMarkProps {
  opacity?: number;
  showSubtitle?: boolean;
}

export const BrandMark: React.FC<BrandMarkProps> = ({
  opacity = 1,
  showSubtitle = true,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        left: 80,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        opacity,
        zIndex: 50,
      }}
    >
      {/* Veil geometric emblem */}
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect
          x="2"
          y="2"
          width="28"
          height="28"
          rx="6"
          stroke={colors.border.active}
          strokeWidth="1.5"
          fill="rgba(4, 8, 20, 0.7)"
        />
        <path
          d="M8 11L16 6L24 11V18C24 22.5 16 26 16 26C16 26 8 22.5 8 18V11Z"
          stroke={colors.midnightCyan.base}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="15" r="2.5" fill={colors.midnightViolet.bright} />
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              ...typography.styles.codeBadge,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: colors.text.primary,
            }}
          >
            COMMONVEIL
          </span>
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: colors.midnightCyan.base,
              boxShadow: `0 0 8px ${colors.midnightCyan.glow}`,
            }}
          />
        </div>
        {showSubtitle && (
          <span
            style={{
              ...typography.styles.sourceLabel,
              fontSize: 10,
              color: colors.text.dim,
              letterSpacing: '0.15em',
            }}
          >
            CONFIDENTIAL SUPPLY CHAIN INTELLIGENCE
          </span>
        )}
      </div>
    </div>
  );
};
