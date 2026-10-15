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
  bottom = 84, // Title-safe margin
}) => {
  const frame = useCurrentFrame();

  // Find active segment by explicit start and end frame
  const activeSegment = segments.find(
    (s) => frame >= s.startFrame && frame <= s.endFrame
  );

  // If no segment is currently active, render nothing (no lingering caption)
  if (!activeSegment) {
    return null;
  }

  // Complete phrase entrance & exit (clean 3-frame phrase fade, zero partial-word animation)
  const fadeInFrames = 3;
  const fadeOutFrames = 3;

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
        padding: '0 96px', // Title-safe horizontal margin
        pointerEvents: 'none',
        zIndex: 100,
        opacity,
      }}
    >
      <div
        style={{
          background: colors.caption.bg,
          border: `1px solid ${colors.caption.border}`,
          borderRadius: 12,
          padding: '16px 36px',
          boxShadow: colors.caption.shadow,
          maxWidth: 1152, // Exactly 60% of 1920px frame
          width: 'fit-content',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            ...typography.styles.caption,
            color: colors.caption.textPrimary,
            fontSize: 42, // Meets 40-46px rule
            lineHeight: 1.25,
            display: '-webkit-box',
            WebkitLineClamp: 2, // Maximum 2 lines
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {activeSegment.text}
          {activeSegment.secondaryText ? ` ${activeSegment.secondaryText}` : ''}
        </div>
      </div>
    </div>
  );
};

