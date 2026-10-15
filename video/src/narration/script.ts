export interface CaptionSegment {
  id: string;
  startFrame: number;
  endFrame: number;
  text: string;
  secondaryText?: string;
}

export const LOCKED_NARRATION_TEXT =
  "On March 29, 2024, XZ Utils releases 5.6.0 and 5.6.1 were revealed to contain a backdoor. Response teams faced an urgent question: who was exposed? But answering publicly could reveal the exact software inside an organization. What if exposure could be proven without revealing the inventory?";

export const scene01Captions: CaptionSegment[] = [
  {
    id: 's01-c01',
    startFrame: 65,  // 0:02.17
    endFrame: 232,   // 0:07.73
    text: 'On March 29, 2024, XZ Utils releases 5.6.0 and 5.6.1',
  },
  {
    id: 's01-c02',
    startFrame: 238, // 0:07.93
    endFrame: 348,   // 0:11.60
    text: 'were revealed to contain a backdoor.',
  },
  {
    id: 's01-c03',
    startFrame: 355, // 0:11.83
    endFrame: 478,   // 0:15.93
    text: 'Response teams faced an urgent question: who was exposed?',
  },
  {
    id: 's01-c04',
    startFrame: 488, // 0:16.27
    endFrame: 635,   // 0:21.17
    text: 'But answering publicly could reveal the exact software inside an organization.',
  },
  {
    id: 's01-c05',
    startFrame: 648, // 0:21.60
    endFrame: 765,   // 0:25.50
    text: 'What if exposure could be proven without revealing the inventory?',
  },
];

export const LOCKED_NARRATION_SCENE02 =
  "This is CommonVeil: confidential vulnerability coordination built natively on Midnight. CommonVeil allows an organization to prove that a pre-certified software inventory contains an affected release—without publishing its identity, full package list, or internal endpoints. Zero-knowledge Compact circuits enforce policy matching on-chain, derive advisory-scoped nullifiers to prevent duplicate counting, and update public ecosystem counts while keeping private inventory strictly confidential.";

export const scene02Captions: CaptionSegment[] = [
  {
    id: 's02-c01',
    startFrame: 0,
    endFrame: 175, // 0:00 - 0:05.8
    text: 'This is CommonVeil: confidential vulnerability coordination',
    secondaryText: 'built natively on Midnight.',
  },
  {
    id: 's02-c02',
    startFrame: 180,
    endFrame: 380, // 0:06.0 - 0:12.6
    text: 'CommonVeil allows an organization to prove that a pre-certified',
    secondaryText: 'software inventory contains an affected release—',
  },
  {
    id: 's02-c03',
    startFrame: 385,
    endFrame: 525, // 0:12.8 - 0:17.5
    text: 'without publishing its identity, full package list, or internal endpoints.',
  },
  {
    id: 's02-c04',
    startFrame: 530,
    endFrame: 765, // 0:17.6 - 0:25.5
    text: 'Zero-knowledge Compact circuits enforce policy matching on-chain,',
    secondaryText: 'and derive advisory-scoped nullifiers to prevent duplicate counting,',
  },
  {
    id: 's02-c05',
    startFrame: 770,
    endFrame: 935, // 0:25.6 - 0:31.1
    text: 'and update public ecosystem counts',
    secondaryText: 'while keeping private inventory strictly confidential.',
  },
];

