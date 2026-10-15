import React from 'react';
import { Composition } from 'remotion';
import { CommonVeilFilm } from './compositions/CommonVeilFilm';
import { timing } from './design/timing';
import { Scene01Problem } from './scenes/Scene01Problem';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Main Feature Composition (Milestone 1: Scene 01 / 600 frames; Final target: 5400 frames) */}
      <Composition
        id="CommonVeilBuildathonFilm"
        component={CommonVeilFilm}
        durationInFrames={timing.scene01DurationFrames} // 600 frames / 20 seconds for Milestone 1
        fps={timing.fps}
        width={1920}
        height={1080}
        defaultProps={{
          enableAudio: false,
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
    </>
  );
};
