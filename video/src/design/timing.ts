export const FPS = 30;

export const timing = {
  fps: FPS,
  totalFilmDurationFrames: 180 * FPS, // 5400 frames (180s)
  scene01DurationFrames: 20 * FPS,    // 600 frames (20s)

  scene01: {
    startFrame: 0,
    endFrame: 600,
    durationFrames: 600,

    // Phase 1: 0:00 - 0:03 (Frames 0 - 90)
    // Hidden dependency reveals deep in Linux supply chain
    phase1Start: 0,
    phase1End: 90,

    // Phase 2: 0:03 - 0:08 (Frames 90 - 240)
    // Affected releases: CVE-2024-3094 warning state & advisory
    phase2Start: 90,
    phase2End: 240,

    // Phase 3: 0:08 - 0:14 (Frames 240 - 420)
    // Coordination problem: signal propagating to anonymous institutions
    phase3Start: 240,
    phase3End: 420,

    // Phase 4: 0:14 - 0:20 (Frames 420 - 600)
    // Privacy dilemma: two stark choices + resolution statement
    phase4Start: 420,
    phase4End: 600,
  },
} as const;
