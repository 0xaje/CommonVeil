import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { timing } from '../design/timing';
import { Scene01Problem } from '../scenes/Scene01Problem';

interface CommonVeilFilmProps {
  enableAudio?: boolean;
}

export const CommonVeilFilm: React.FC<CommonVeilFilmProps> = ({
  enableAudio = false,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#040814' }}>
      {/* Optional Audio Layers (Narration, Ambient, SFX) */}
      {enableAudio && (
        <>
          {/* Timeline support for scene 01 narration */}
          <Sequence from={0} durationInFrames={timing.scene01DurationFrames}>
            {/* When narration audio file is supplied, uncomment:
            <Audio src={staticFile('audio/scene01-narration.mp3')} volume={0.9} />
            */}
          </Sequence>

          {/* Timeline support for low-volume background tension music */}
          <Sequence from={0} durationInFrames={timing.totalFilmDurationFrames}>
            {/* When tension track is supplied, uncomment:
            <Audio src={staticFile('audio/ambient-tension.mp3')} volume={0.15} />
            */}
          </Sequence>
        </>
      )}

      {/* ======================================================== */}
      {/* SCENE 01: The Problem (Frames 0 - 600 / 0:00 - 0:20)     */}
      {/* ======================================================== */}
      <Sequence
        from={0}
        durationInFrames={timing.scene01DurationFrames}
        name="Scene 01: Problem Story"
      >
        <Scene01Problem />
      </Sequence>

      {/* Placeholder Sequences for Future Scenes (Milestones 2+) */}
      {/*
        Scene 02: 0:20 - 0:45 (Midnight & Zero-Knowledge Solution)
        Scene 03: 0:45 - 1:15 (Architecture & Compact Contract)
        Scene 04: 1:15 - 1:45 (Live Proof Generation & Verification)
        Scene 05: 1:45 - 2:15 (Ecosystem Aggregation & Shielded Analytics)
        Scene 06: 2:15 - 2:40 (Real Distribution Evidence)
        Scene 07: 2:40 - 2:55 (Security Guarantees & Audit Gateway)
        Scene 08: 2:55 - 3:00 (Call to Action & Midnight Buildathon Close)
      */}
    </AbsoluteFill>
  );
};
