import { CaptionSegment, scene01Captions, scene02Captions } from './script';

export interface ValidationIssue {
  scene: string;
  cueId: string;
  type: 'OVERLAP' | 'DUPLICATE' | 'INVALID_RANGE' | 'EMPTY_TEXT' | 'EXCESSIVE_LINES';
  message: string;
}

export function validateSceneCaptions(
  sceneName: string,
  captions: CaptionSegment[],
  maxSceneFrames?: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (let i = 0; i < captions.length; i++) {
    const current = captions[i];

    // 1. Check valid start and end frames
    if (current.startFrame >= current.endFrame) {
      issues.push({
        scene: sceneName,
        cueId: current.id,
        type: 'INVALID_RANGE',
        message: `Cue ${current.id} has invalid frame range: startFrame (${current.startFrame}) >= endFrame (${current.endFrame})`,
      });
    }

    if (maxSceneFrames && current.endFrame > maxSceneFrames) {
      issues.push({
        scene: sceneName,
        cueId: current.id,
        type: 'INVALID_RANGE',
        message: `Cue ${current.id} extends beyond scene bounds: ${current.endFrame} > ${maxSceneFrames}`,
      });
    }

    // 2. Check for empty text
    if (!current.text || current.text.trim().length === 0) {
      issues.push({
        scene: sceneName,
        cueId: current.id,
        type: 'EMPTY_TEXT',
        message: `Cue ${current.id} has empty text`,
      });
    }

    // 3. Check for overlaps with subsequent cue
    if (i < captions.length - 1) {
      const next = captions[i + 1];

      if (current.endFrame > next.startFrame) {
        issues.push({
          scene: sceneName,
          cueId: current.id,
          type: 'OVERLAP',
          message: `Cue ${current.id} (ends ${current.endFrame}) overlaps with next cue ${next.id} (starts ${next.startFrame})`,
        });
      }

      // 4. Check for duplicate adjacent cues
      const currentFullText = `${current.text} ${current.secondaryText || ''}`.trim();
      const nextFullText = `${next.text} ${next.secondaryText || ''}`.trim();

      if (currentFullText === nextFullText) {
        issues.push({
          scene: sceneName,
          cueId: current.id,
          type: 'DUPLICATE',
          message: `Cue ${current.id} and ${next.id} have identical duplicate text: "${currentFullText}"`,
        });
      }
    }
  }

  return issues;
}

export function runGlobalCaptionValidation(): { passed: boolean; issues: ValidationIssue[] } {
  const s01Issues = validateSceneCaptions('Scene01', scene01Captions, 790);
  const s02Issues = validateSceneCaptions('Scene02', scene02Captions, 955);
  const allIssues = [...s01Issues, ...s02Issues];

  return {
    passed: allIssues.length === 0,
    issues: allIssues,
  };
}

// Standalone execution
if (require.main === module) {
  const result = runGlobalCaptionValidation();
  console.log('=== Caption Validation Report ===');
  console.log(`Total cues: ${scene01Captions.length + scene02Captions.length}`);
  if (result.passed) {
    console.log('✅ ALL CAPTIONS VALIDATED: Zero overlaps, zero duplicate cues, all frame ranges strictly chronological.');
    process.exit(0);
  } else {
    console.error(`❌ Validation failed with ${result.issues.length} issue(s):`);
    result.issues.forEach((iss) => console.error(` - [${iss.scene}] (${iss.type}) ${iss.message}`));
    process.exit(1);
  }
}
