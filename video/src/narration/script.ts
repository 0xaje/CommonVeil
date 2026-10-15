export interface CaptionSegment {
  id: string;
  startFrame: number;
  endFrame: number;
  text: string;
  secondaryText?: string;
}

export const LOCKED_NARRATION_TEXT =
  "In March 2024, a backdoor was discovered in XZ Utils, a dependency buried deep inside Linux systems. Organizations needed to know whether they were exposed—but reporting an exact software inventory could reveal valuable targeting information. Silence protected privacy. Disclosure improved coordination. Neither choice was good enough.";

export const scene01Captions: CaptionSegment[] = [
  {
    id: 's01-c01',
    startFrame: 15,
    endFrame: 125,
    text: 'In March 2024, a backdoor was discovered in XZ Utils,',
    secondaryText: 'a dependency buried deep inside Linux systems.',
  },
  {
    id: 's01-c02',
    startFrame: 130,
    endFrame: 260,
    text: 'Organizations needed to know whether they were exposed—',
    secondaryText: 'upstream releases 5.6.0 and 5.6.1 were compromised.',
  },
  {
    id: 's01-c03',
    startFrame: 265,
    endFrame: 410,
    text: 'but reporting an exact software inventory',
    secondaryText: 'could reveal valuable targeting information.',
  },
  {
    id: 's01-c04',
    startFrame: 415,
    endFrame: 515,
    text: 'Silence protected privacy.',
    secondaryText: 'Disclosure improved coordination.',
  },
  {
    id: 's01-c05',
    startFrame: 520,
    endFrame: 595,
    text: 'Neither choice was good enough.',
  },
];
