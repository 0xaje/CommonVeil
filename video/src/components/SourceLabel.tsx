import React from 'react';
import { colors } from '../design/colors';
import { typography } from '../design/typography';

interface SourceLabelProps {
  sourceText: string;
  opacity?: number;
  bottom?: number;
  left?: number;
}

export const SourceLabel: React.FC<SourceLabelProps> = ({
  sourceText,
  opacity = 1,
  bottom = 40,
  left = 80,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom,
        left,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        opacity,
        zIndex: 45,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: 3,
          height: 14,
          backgroundColor: colors.midnight.violet,
          borderRadius: 1,
        }}
      />
      <span
        style={{
          ...typography.styles.label,
          color: colors.midnight.textMuted,
          fontSize: 22,
          letterSpacing: '0.04em',
          textTransform: 'none',
        }}
      >
        {sourceText}
      </span>
    </div>
  );
};

