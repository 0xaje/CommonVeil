import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { timing } from '../design/timing';
import { Scene01Problem } from '../scenes/Scene01Problem';

interface CommonVeilFilmProps {
  enableAudio?: boolean;
}

export const CommonVeilFilm: React.FC<CommonVeilFilmProps> = ({
  enableAudio = true,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#040814' }}>
      {/* Audio Layer: Documentary Narration & Ambient Tension Bed */}
      {enableAudio && (
        <>
          {/* Synchronized 20s Narration Track */}
          <Sequence from={0} durationInFrames={timing.scene01DurationFrames}>
            <Audio
              src={staticFile('audio/narration-scene01.mp3')}
              volume={1.0}
            />
          </Sequence>

          {/* Restrained Sub-Bass Ambient Tension Bed */}
          <Sequence from={0} durationInFrames={timing.scene01DurationFrames}>
            <Audio
              src={staticFile('audio/ambient-tension.mp3')}
              volume={0.25}
            />
          </Sequence>
        </>
      )}

      {/* ======================================================== */}
      {/* SCENE 01: Problem Story (Frames 0 - 600 / 0:00 - 0:20)   */}
      {/* ======================================================== */}
      <Sequence
        from={0}
        durationInFrames={timing.scene01DurationFrames}
        name="Scene 01: Problem Story"
      >
        <Scene01Problem />
      </Sequence>
    </AbsoluteFill>
  );
};
