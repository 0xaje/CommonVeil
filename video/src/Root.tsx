import React from 'react';
import { Composition } from 'remotion';
import { CommonVeilFilm } from './compositions/CommonVeilFilm';
import { timing } from './design/timing';
import { Scene01Problem } from './scenes/Scene01Problem';
import { Scene02Solution } from './scenes/Scene02Solution';

export const RemotionRoot: React.FC = () => {
  const combinedDurationFrames =
    timing.scene01DurationFrames + timing.scene02DurationFrames;

  return (
    <>
      {/* Main Feature Composition (Milestone 1+2: Scenes 01 & 02 / 1745 frames; Final target: 5400 frames) */}
      <Composition
        id="CommonVeilBuildathonFilm"
        component={CommonVeilFilm}
        durationInFrames={combinedDurationFrames}
        fps={timing.fps}
        width={1920}
        height={1080}
        defaultProps={{
          enableAudio: true,
        }}
      />

      {/* Standalone Scene 01 Preview Composition */}
      <Composition
        id="Scene01Problem"
        component={Scene01Problem}
        durationInFrames={timing.scene01DurationFrames}
        fps={timing.fps}
        width={1920}
        height={1080}
      />

      {/* Standalone Scene 02 Preview Composition */}
      <Composition
        id="Scene02Solution"
        component={Scene02Solution}
        durationInFrames={timing.scene02DurationFrames}
        fps={timing.fps}
        width={1920}
        height={1080}
      />
    </>
  );
};

