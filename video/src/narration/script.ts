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
    startFrame: 60,  // 0:02.0
    endFrame: 355,   // 0:11.8
    text: 'On March 29, 2024, XZ Utils releases 5.6.0 and 5.6.1',
    secondaryText: 'were revealed to contain a backdoor.',
  },
  {
    id: 's01-c02',
    startFrame: 360, // 0:12.0
    endFrame: 485,   // 0:16.1
    text: 'Response teams faced an urgent question:',
    secondaryText: 'who was exposed?',
  },
  {
    id: 's01-c03',
    startFrame: 495, // 0:16.5
    endFrame: 645,   // 0:21.5
    text: 'But answering publicly could reveal',
    secondaryText: 'the exact software inside an organization.',
  },
  {
    id: 's01-c04',
    startFrame: 654, // 0:21.8
    endFrame: 810,   // 0:27.0
    text: 'What if exposure could be proven',
    secondaryText: 'without revealing the inventory?',
  },
];
