import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { timing } from '../design/timing';
import { Scene01Problem } from '../scenes/Scene01Problem';
import { Scene02Solution } from '../scenes/Scene02Solution';

interface CommonVeilFilmProps {
  enableAudio?: boolean;
}

export const CommonVeilFilm: React.FC<CommonVeilFilmProps> = ({
  enableAudio = true,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#040814' }}>
      {/* Audio Layer: Mastered Stereo Documentary Mixes (-16 LUFS, -1.5 dBTP) */}
      {enableAudio && (
        <>
          {/* Scene 01 Audio */}
          <Sequence from={0} durationInFrames={timing.scene01DurationFrames}>
            <Audio
              src={staticFile('audio/master-mix-scene01.mp3')}
              volume={1.0}
            />
          </Sequence>

          {/* Scene 02 Audio */}
          <Sequence
            from={timing.scene01DurationFrames}
            durationInFrames={timing.scene02DurationFrames}
          >
            <Audio
              src={staticFile('audio/master-mix-scene02.mp3')}
              volume={1.0}
            />
          </Sequence>
        </>
      )}

      {/* ======================================================== */}
      {/* SCENE 01: Problem Story (Frames 0 - 790 / 0:00 - 0:26.33)*/}
      {/* ======================================================== */}
      <Sequence
        from={0}
        durationInFrames={timing.scene01DurationFrames}
        name="Scene 01: Problem Story"
      >
        <Scene01Problem />
      </Sequence>

      {/* ======================================================== */}
      {/* SCENE 02: Solution Story (Frames 790 - 1745 / 0:26.33 - 0:58.17) */}
      {/* ======================================================== */}
      <Sequence
        from={timing.scene01DurationFrames}
        durationInFrames={timing.scene02DurationFrames}
        name="Scene 02: Solution Story"
      >
        <Scene02Solution />
      </Sequence>
    </AbsoluteFill>
  );
};

