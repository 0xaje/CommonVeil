export const FPS = 30;

export const timing = {
  fps: FPS,
  totalFilmDurationFrames: 180 * FPS, // 5400 frames (180s)
  scene01DurationFrames: 28 * FPS,    // 840 frames (28.0s) matching natural voice cadence

  scene01: {
    startFrame: 0,
    endFrame: 840,
    durationFrames: 840,

    // Phase 1: 0:00 - 0:02 (Frames 0 - 60)
    // Black screen with "29 MARCH 2024"
    dateStart: 0,
    dateEnd: 60,

    // Phase 2: 0:02 - 0:07.3 (Frames 60 - 220)
    // Authentic advisory headline montage (CISA, tukaani.org, oss-security)
    advisoriesStart: 60,
    advisoriesEnd: 220,

    // Phase 3: 0:07.3 - 0:12 (Frames 220 - 360)
    // Visually isolate releases "5.6.0" and "5.6.1"
    isolateReleasesStart: 220,
    isolateReleasesEnd: 360,

    // Phase 4: 0:12 - 0:16.5 (Frames 360 - 495)
    // "Which organizations were exposed?"
    orgExposureStart: 360,
    orgExposureEnd: 495,

    // Phase 5: 0:16.5 - 0:21.8 (Frames 495 - 654)
    // "Answering could reveal their internal software inventory."
    inventoryRiskStart: 495,
    inventoryRiskEnd: 654,

    // Phase 6: 0:21.8 - 0:28 (Frames 654 - 840)
    // "What if exposure could be proven without revealing the inventory?"
    zkPivotStart: 654,
    zkPivotEnd: 840,
  },
} as const;
