export const FPS = 30;

export const timing = {
  fps: FPS,
  totalFilmDurationFrames: 180 * FPS, // 5400 frames (180s)
  scene01DurationFrames: 20 * FPS,    // 600 frames (20s)

  scene01: {
    startFrame: 0,
    endFrame: 600,
    durationFrames: 600,

    // Phase 1: 0:00 - 0:02 (Frames 0 - 60)
    // Black screen with "29 MARCH 2024"
    dateStart: 0,
    dateEnd: 60,

    // Phase 2: 0:02 - 0:07 (Frames 60 - 210)
    // Authentic advisory headline montage (CISA, tukaani.org, Red Hat)
    advisoriesStart: 60,
    advisoriesEnd: 210,

    // Phase 3: 0:07 - 0:11 (Frames 210 - 330)
    // Visually isolate releases "5.6.0" and "5.6.1"
    isolateReleasesStart: 210,
    isolateReleasesEnd: 330,

    // Phase 4: 0:11 - 0:15 (Frames 330 - 450)
    // "Which organizations were exposed?"
    orgExposureStart: 330,
    orgExposureEnd: 450,

    // Phase 5: 0:15 - 0:18 (Frames 450 - 540)
    // "Answering could reveal their internal software inventory."
    inventoryRiskStart: 450,
    inventoryRiskEnd: 540,

    // Phase 6: 0:18 - 0:20 (Frames 540 - 600)
    // "What if exposure could be proven without revealing the inventory?"
    zkPivotStart: 540,
    zkPivotEnd: 600,
  },
} as const;
