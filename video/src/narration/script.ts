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
    startFrame: 60, // 0:02
    endFrame: 210, // 0:07
    text: 'On March 29, 2024, XZ Utils releases 5.6.0 and 5.6.1',
    secondaryText: 'were revealed to contain a backdoor.',
  },
  {
    id: 's01-c02',
    startFrame: 215, // 0:07.1
    endFrame: 325, // 0:10.8
    text: 'Response teams faced an urgent question:',
    secondaryText: 'who was exposed?',
  },
  {
    id: 's01-c03',
    startFrame: 330, // 0:11.0
    endFrame: 445, // 0:14.8
    text: 'Which organizations were exposed?',
  },
  {
    id: 's01-c04',
    startFrame: 450, // 0:15.0
    endFrame: 535, // 0:17.8
    text: 'But answering publicly could reveal',
    secondaryText: 'the exact software inside an organization.',
  },
  {
    id: 's01-c05',
    startFrame: 540, // 0:18.0
    endFrame: 598, // 0:20.0
    text: 'What if exposure could be proven',
    secondaryText: 'without revealing the inventory?',
  },
];
