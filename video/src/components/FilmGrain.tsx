import React from 'react';
import { useCurrentFrame } from 'remotion';

interface FilmGrainProps {
  opacity?: number;
}

export const FilmGrain: React.FC<FilmGrainProps> = ({ opacity = 0.035 }) => {
  const frame = useCurrentFrame();
  // Deterministic seed cycle (4 frames loop) to avoid rapid jitter
  const grainSeed = (frame % 4) * 31;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 100,
        opacity,
        mixBlendMode: 'screen',
      }}
    >
      <svg
        width="100%"
        height="100%"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <filter id="documentary-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="3"
            seed={grainSeed}
            result="noise"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1   0 0 0 0 1   0 0 0 0 1  0 0 0 0.8 0"
          />
        </filter>
        <rect
          width="100%"
          height="100%"
          filter="url(#documentary-grain)"
          fill="transparent"
        />
      </svg>
    </div>
  );
};
