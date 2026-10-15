import React from 'react';
import { useCurrentFrame } from 'remotion';
import { colors } from '../design/colors';
import { typography } from '../design/typography';

interface TimelineGuideProps {
  totalFrames?: number;
  showTimecode?: boolean;
  sceneName?: string;
}

export const TimelineGuide: React.FC<TimelineGuideProps> = ({
  totalFrames = 600,
  showTimecode = true,
  sceneName = 'SCENE 01 // PROBLEM DISCLOSURE',
}) => {
  const frame = useCurrentFrame();
  const progress = Math.min(1, Math.max(0, frame / totalFrames));

  const totalSeconds = frame / 30;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frameRemainder = Math.floor(frame % 30);

  const formattedTimecode = `${String(minutes).padStart(2, '0')}:${String(
    seconds
  ).padStart(2, '0')}:${String(frameRemainder).padStart(2, '0')}`;

  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        right: 80,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        zIndex: 50,
      }}
    >
      <div style={{ textAlign: 'right' }}>
        <div
          style={{
            ...typography.styles.label,
            fontSize: 22,
            color: colors.midnight.textMuted,
            letterSpacing: '0.12em',
          }}
        >
          {sceneName}
        </div>
        {showTimecode && (
          <div
            style={{
              ...typography.styles.label,
              fontSize: 22,
              color: colors.midnight.cyan,
              marginTop: 2,
            }}
          >
            {formattedTimecode}
          </div>
        )}
      </div>

      {/* Subtle mini progress line */}
      <div
        style={{
          width: 80,
          height: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 1,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: `${progress * 100}%`,
            backgroundColor: colors.midnight.cyan,
          }}
        />
      </div>
    </div>
  );
};

