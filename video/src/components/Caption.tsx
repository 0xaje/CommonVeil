import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { colors } from '../design/colors';
import { typography } from '../design/typography';
import { CaptionSegment } from '../narration/script';

interface CaptionProps {
  segments: CaptionSegment[];
  bottom?: number;
}

export const Caption: React.FC<CaptionProps> = ({
  segments,
  bottom = 72,
}) => {
  const frame = useCurrentFrame();

  // Find active segment
  const activeSegment = segments.find(
    (s) => frame >= s.startFrame && frame <= s.endFrame
  );

  if (!activeSegment) {
    return null;
  }

  // Smooth entrance & exit fade (deterministic)
  const fadeInFrames = 6;
  const fadeOutFrames = 6;

  const opacityIn = interpolate(
    frame,
    [activeSegment.startFrame, activeSegment.startFrame + fadeInFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const opacityOut = interpolate(
    frame,
    [activeSegment.endFrame - fadeOutFrames, activeSegment.endFrame],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const opacity = Math.min(opacityIn, opacityOut);

  return (
    <div
      style={{
        position: 'absolute',
        bottom,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 120px',
        pointerEvents: 'none',
        zIndex: 60,
        opacity,
      }}
    >
      <div
        style={{
          background: 'rgba(4, 8, 20, 0.88)',
          border: `1px solid ${colors.border.subtle}`,
          borderRadius: 8,
          padding: '12px 28px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.65)',
          maxWidth: 1100,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            ...typography.styles.caption,
            color: colors.text.primary,
            lineHeight: 1.35,
          }}
        >
          {activeSegment.text}
        </div>
        {activeSegment.secondaryText && (
          <div
            style={{
              ...typography.styles.caption,
              color: colors.text.secondary,
              marginTop: 4,
              fontSize: 24,
            }}
          >
            {activeSegment.secondaryText}
          </div>
        )}
      </div>
    </div>
  );
};
