export const FPS = 30;

export const timing = {
  fps: FPS,
  totalFilmDurationFrames: 180 * FPS, // 5400 frames (180s)
  scene01DurationFrames: 790,         // 790 frames (26.33s; speech ends at 25.27s, ~1.06s silent hold)
  scene02DurationFrames: 955,         // 955 frames (31.83s; speech ends at 30.74s, ~1.09s silent hold)

  scene01: {
    startFrame: 0,
    endFrame: 790,
    durationFrames: 790,

    // Phase 1: 0:00 - 0:02.0 (Frames 0 - 60)
    // Black screen with "29 MARCH 2024"
    dateStart: 0,
    dateEnd: 60,

    // Phase 2: 0:02.0 - 0:07.5 (Frames 60 - 225)
    // Authentic advisory headline montage (CISA, tukaani.org, oss-security authentic crop)
    advisoriesStart: 60,
    advisoriesEnd: 225,

    // Phase 3: 0:07.5 - 0:11.8 (Frames 225 - 355)
    // Visually isolate releases "5.6.0" and "5.6.1"
    isolateReleasesStart: 225,
    isolateReleasesEnd: 355,

    // Phase 4: 0:11.8 - 0:16.2 (Frames 355 - 488)
    // "Which organizations were exposed?" (seamless crossfade, zero blank interval)
    orgExposureStart: 355,
    orgExposureEnd: 488,

    // Phase 5: 0:16.2 - 0:21.5 (Frames 488 - 645)
    // "Answering could reveal their internal software inventory."
    inventoryRiskStart: 488,
    inventoryRiskEnd: 645,

    // Phase 6: 0:21.5 - 0:26.33 (Frames 645 - 790)
    // "What if exposure could be proven without revealing the inventory?"
    // Holds for ~1.06s after speech ends before transition into Scene 02
    zkPivotStart: 645,
    zkPivotEnd: 790,
  },

  scene02: {
    startFrame: 0,
    endFrame: 955,
    durationFrames: 955,

    // Phase 1: 0:00 - 0:06.0 (Frames 0 - 180)
    // Direct Answer: "This is CommonVeil: confidential vulnerability coordination built natively on Midnight."
    heroStart: 0,
    heroEnd: 180,

    // Phase 2: 0:06.0 - 0:17.5 (Frames 180 - 525)
    // The Solution Architecture: Pre-certified private inventory without revealing identity or endpoints
    protocolStart: 180,
    protocolEnd: 525,

    // Phase 3: 0:17.5 - 0:31.83 (Frames 525 - 955)
    // Compact circuits, scoped nullifiers, and public ledger accountability
    circuitsStart: 525,
    circuitsEnd: 955,
  },
} as const;

