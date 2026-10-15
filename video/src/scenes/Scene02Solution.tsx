import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { Caption } from '../components/Caption';
import { colors } from '../design/colors';
import { typography } from '../design/typography';
import { scene02Captions } from '../narration/script';

export const Scene02Solution: React.FC = () => {
  const frame = useCurrentFrame();

  // Controlled 5% camera push-in across the scene
  const cameraZoom = interpolate(frame, [0, 955], [1.0, 1.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // =============================================================
  // Phase 1: 0:00 - 0:06.0 (Frames 0 - 180) — The Direct Answer & Brand
  // =============================================================
  const heroOpacity = interpolate(
    frame,
    [0, 12, 174, 180],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // =============================================================
  // Phase 2: 0:06.0 - 0:17.5 (Frames 180 - 525) — Sequential Role Explanation
  // =============================================================
  const archOpacity = interpolate(
    frame,
    [180, 190, 518, 525],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Role 1 (Registrar) Focus: Frames 200–280
  const isRegistrarFocused = frame >= 200 && frame < 280;
  // Role 2 (Certifier) Focus: Frames 280–360
  const isCertifierFocused = frame >= 280 && frame < 360;
  // Role 3 (Member) Focus: Frames 360–440
  const isMemberFocused = frame >= 360 && frame < 440;
  // Step 4 (Overview together): Frames 440–525
  const isOverview = frame >= 440;

  const card1Scale = interpolate(
    frame,
    [195, 205, 275, 285, 435, 445],
    [1.0, 1.06, 1.06, 0.96, 0.96, 1.0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const card1Opacity = interpolate(
    frame,
    [195, 205, 275, 285, 435, 445],
    [1.0, 1.0, 1.0, 0.45, 0.45, 1.0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const card2Scale = interpolate(
    frame,
    [275, 285, 355, 365, 435, 445],
    [0.96, 1.06, 1.06, 0.96, 0.96, 1.0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const card2Opacity = interpolate(
    frame,
    [195, 205, 275, 285, 355, 365, 435, 445],
    [1.0, 0.45, 0.45, 1.0, 1.0, 0.45, 0.45, 1.0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const card3Scale = interpolate(
    frame,
    [355, 365, 435, 445],
    [0.96, 1.06, 1.06, 1.0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const card3Opacity = interpolate(
    frame,
    [195, 205, 355, 365, 435, 445],
    [1.0, 0.45, 0.45, 1.0, 1.0, 1.0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // =============================================================
  // Phase 3: 0:17.5 - 0:31.83 (Frames 525 - 955) — Compact Circuits & Preprod Evidence
  // Deliberate screenshot camera choreography:
  // 1. Establish complete screenshot (Frames 535–620)
  // 2. Zoom into verified result (Frames 620–720)
  // 3. Add concise callout (Frames 640–740)
  // 4. Pan to policy receipt import (Frames 720–820)
  // 5. Zoom back out to full screenshot (Frames 820–930)
  // =============================================================
  const circuitsOpacity = interpolate(
    frame,
    [525, 535, 955],
    [0, 1, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Camera scale within screenshot window
  const shotScale = interpolate(
    frame,
    [535, 620, 640, 720, 740, 820, 840],
    [1.0, 1.0, 1.65, 1.65, 1.55, 1.55, 1.0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Camera translation (focus on bottom evaluation, then pan up to receipt import)
  const shotTranslateY = interpolate(
    frame,
    [535, 620, 640, 720, 740, 820, 840],
    [0, 0, -180, -180, -60, -60, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Callout overlay opacity (active during focused zoom)
  const calloutOpacity = interpolate(
    frame,
    [640, 652, 720, 730],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.midnight.bg,
        color: colors.midnight.textPrimary,
        overflow: 'hidden',
      }}
    >
      {/* Subtle depth gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: colors.midnight.bgGradient,
          pointerEvents: 'none',
        }}
      />

      {/* Main Content Area with 5% Camera Push-in */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${cameraZoom})`,
          transformOrigin: '50% 50%',
        }}
      >
        {/* ======================================================== */}
        {/* Phase 1: 0:00 - 0:06.0 — The Direct Answer               */}
        {/* ======================================================== */}
        {heroOpacity > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              padding: '0 96px', // Title-safe margin
              opacity: heroOpacity,
            }}
          >
            <div
              style={{
                ...typography.styles.labelLarge,
                fontSize: 24, // Meets min 22px
                color: colors.midnight.cyan,
                marginBottom: 20,
                whiteSpace: 'nowrap',
              }}
            >
              THE SOLUTION // ZERO-KNOWLEDGE COORDINATION
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 24,
                marginBottom: 24,
              }}
            >
              {/* CommonVeil Brand Shield Icon */}
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 16,
                  background: 'rgba(0, 229, 255, 0.12)',
                  border: `2px solid ${colors.midnight.cyan}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 28px rgba(0, 229, 255, 0.35)',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    border: '3px solid #FFFFFF',
                    transform: 'rotate(45deg)',
                  }}
                />
              </div>

              <h1
                style={{
                  ...typography.styles.heroTitle,
                  fontSize: 80, // Meets min 64px
                  color: colors.midnight.textPrimary,
                  margin: 0,
                  letterSpacing: '0.04em',
                }}
              >
                COMMONVEIL
              </h1>
            </div>

            <p
              style={{
                ...typography.styles.bodyLarge,
                fontSize: 34, // Meets min 30px
                color: colors.midnight.textSecondary,
                maxWidth: 1100,
                lineHeight: 1.4,
                margin: '0 0 32px 0',
              }}
            >
              Confidential vulnerability coordination built natively on Midnight.
            </p>

            <div
              style={{
                display: 'flex',
                gap: 20,
              }}
            >
              <div
                style={{
                  background: colors.midnight.surface,
                  border: `1px solid ${colors.midnight.border}`,
                  borderRadius: 8,
                  padding: '10px 24px',
                  ...typography.styles.label,
                  fontSize: 22, // Meets min 22px
                  color: colors.midnight.textMuted,
                  whiteSpace: 'nowrap',
                }}
              >
                COMPACT CIRCUITS ON PREPROD
              </div>
              <div
                style={{
                  background: colors.midnight.surface,
                  border: `1px solid ${colors.midnight.borderActive}`,
                  borderRadius: 8,
                  padding: '10px 24px',
                  ...typography.styles.label,
                  fontSize: 22, // Meets min 22px
                  color: colors.midnight.cyan,
                  whiteSpace: 'nowrap',
                }}
              >
                PRE-POLICY SNAPSHOT VERIFICATION
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* Phase 2: 0:06.0 - 0:17.5 — Sequential Role Explanation    */}
        {/* ======================================================== */}
        {archOpacity > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '0 96px', // Title-safe margin
              opacity: archOpacity,
            }}
          >
            {/* Stable Section Label: No truncation, no letter dropping */}
            <div
              style={{
                ...typography.styles.labelLarge,
                fontSize: 24, // Meets min 22px
                color: colors.midnight.textMuted,
                marginBottom: 16,
                whiteSpace: 'nowrap', // Prevents MULTI-ROLE from breaking or slicing
              }}
            >
              PROTOCOL ARCHITECTURE // MULTI-ROLE DISCLOSURE SEPARATION
            </div>

            <h2
              style={{
                ...typography.styles.primaryHeadline,
                fontSize: 64, // Meets min 64px
                color: colors.midnight.textPrimary,
                margin: '0 0 36px 0',
                textAlign: 'center',
              }}
            >
              Separating Private Evidence from Public Proof
            </h2>

            {/* 3 Sequential Focused Role Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 28,
                width: '100%',
                maxWidth: 1400,
                marginBottom: 28,
              }}
            >
              {/* Role 1: Registrar */}
              <div
                style={{
                  background: isRegistrarFocused ? colors.midnight.surfaceElevated : colors.midnight.surface,
                  border: `2px solid ${isRegistrarFocused ? colors.midnight.cyan : colors.midnight.border}`,
                  borderRadius: 12,
                  padding: '28px 32px',
                  transform: `scale(${card1Scale})`,
                  opacity: card1Opacity,
                  boxShadow: isRegistrarFocused
                    ? '0 0 36px rgba(0, 229, 255, 0.25), 0 16px 40px rgba(0,0,0,0.5)'
                    : colors.midnight.shadow,
                  transition: 'background 0.2s, border 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    ...typography.styles.label,
                    fontSize: 22, // Meets min 22px
                    color: colors.midnight.cyan,
                    marginBottom: 10,
                  }}
                >
                  01 // REGISTRAR
                </div>
                <div
                  style={{
                    ...typography.styles.secondaryHeadline,
                    fontSize: 36,
                    fontWeight: 700,
                    color: colors.midnight.textPrimary,
                    marginBottom: 14,
                  }}
                >
                  Registrar
                </div>
                <div
                  style={{
                    ...typography.styles.bodyText,
                    fontSize: 30, // Meets min 30px
                    color: colors.midnight.textSecondary,
                    lineHeight: 1.4,
                  }}
                >
                  Admits members and registers affected releases.
                </div>
              </div>

              {/* Role 2: Certifier */}
              <div
                style={{
                  background: isCertifierFocused ? colors.midnight.surfaceElevated : colors.midnight.surface,
                  border: `2px solid ${isCertifierFocused ? colors.midnight.violet : colors.midnight.border}`,
                  borderRadius: 12,
                  padding: '28px 32px',
                  transform: `scale(${card2Scale})`,
                  opacity: card2Opacity,
                  boxShadow: isCertifierFocused
                    ? '0 0 36px rgba(121, 82, 245, 0.3), 0 16px 40px rgba(0,0,0,0.5)'
                    : colors.midnight.shadow,
                  transition: 'background 0.2s, border 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    ...typography.styles.label,
                    fontSize: 22, // Meets min 22px
                    color: colors.midnight.violet,
                    marginBottom: 10,
                  }}
                >
                  02 // CERTIFIER
                </div>
                <div
                  style={{
                    ...typography.styles.secondaryHeadline,
                    fontSize: 36,
                    fontWeight: 700,
                    color: colors.midnight.textPrimary,
                    marginBottom: 14,
                  }}
                >
                  Certifier
                </div>
                <div
                  style={{
                    ...typography.styles.bodyText,
                    fontSize: 30, // Meets min 30px
                    color: colors.midnight.textSecondary,
                    lineHeight: 1.4,
                  }}
                >
                  Commits inventory evidence before policy activation.
                </div>
              </div>

              {/* Role 3: Member */}
              <div
                style={{
                  background: isMemberFocused ? colors.midnight.surfaceElevated : colors.midnight.surface,
                  border: `2px solid ${isMemberFocused ? colors.midnight.green : colors.midnight.border}`,
                  borderRadius: 12,
                  padding: '28px 32px',
                  transform: `scale(${card3Scale})`,
                  opacity: card3Opacity,
                  boxShadow: isMemberFocused
                    ? '0 0 36px rgba(16, 185, 129, 0.3), 0 16px 40px rgba(0,0,0,0.5)'
                    : colors.midnight.shadow,
                  transition: 'background 0.2s, border 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    ...typography.styles.label,
                    fontSize: 22, // Meets min 22px
                    color: colors.midnight.green,
                    marginBottom: 10,
                  }}
                >
                  03 // MEMBER
                </div>
                <div
                  style={{
                    ...typography.styles.secondaryHeadline,
                    fontSize: 36,
                    fontWeight: 700,
                    color: colors.midnight.textPrimary,
                    marginBottom: 14,
                  }}
                >
                  Member
                </div>
                <div
                  style={{
                    ...typography.styles.bodyText,
                    fontSize: 30, // Meets min 30px
                    color: colors.midnight.textSecondary,
                    lineHeight: 1.4,
                  }}
                >
                  Proves affected status without revealing its inventory.
                </div>
              </div>
            </div>

            {/* Overarching Workflow Summary Bar */}
            {isOverview && (
              <div
                style={{
                  background: colors.midnight.surface,
                  border: `1px solid ${colors.midnight.border}`,
                  borderRadius: 8,
                  padding: '12px 32px',
                  ...typography.styles.bodyText,
                  fontSize: 30, // Meets min 30px
                  color: colors.midnight.textSecondary,
                  textAlign: 'center',
                  maxWidth: 1200,
                }}
              >
                Three distinct roles ensure no single party can forge exposure or deanonymize participants.
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* Phase 3: 0:17.5 - 0:31.83 — Compact Verification & Evidence */}
        {/* Deliberate screenshot camera sequence:                     */}
        {/* Establish -> Zoom in -> Callout -> Pan -> Zoom out         */}
        {/* ======================================================== */}
        {circuitsOpacity > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '0 96px', // Title-safe margin
              opacity: circuitsOpacity,
            }}
          >
            <div
              style={{
                ...typography.styles.labelLarge,
                fontSize: 24, // Meets min 22px
                color: colors.midnight.cyan,
                marginBottom: 12,
                whiteSpace: 'nowrap',
              }}
            >
              ZERO-KNOWLEDGE VERIFICATION // MIDNIGHT PREPROD
            </div>

            {/* Corrected Technical Headline (Requirement 6) */}
            <h2
              style={{
                ...typography.styles.primaryHeadline,
                fontSize: 64, // Meets min 64px
                color: colors.midnight.textPrimary,
                margin: '0 0 28px 0',
                textAlign: 'center',
              }}
            >
              Compact verifies affected-release attestations on-chain
            </h2>

            {/* Two-Column Layout: Deliberate Evidence Camera on Left, Clear Panels on Right */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.05fr 1.15fr',
                gap: 36,
                width: '100%',
                maxWidth: 1440,
                alignItems: 'center',
              }}
            >
              {/* Left Column: Deliberate Authentic Screenshot Camera Window */}
              <div
                style={{
                  background: colors.midnight.surface,
                  border: `1px solid ${colors.midnight.border}`,
                  borderRadius: 12,
                  padding: '16px 20px',
                  boxShadow: colors.midnight.shadow,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: `1px solid ${colors.midnight.border}`,
                    paddingBottom: 8,
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      ...typography.styles.label,
                      fontSize: 22, // Meets min 22px
                      color: colors.midnight.textMuted,
                    }}
                  >
                    AUTHENTIC PREPROD EVIDENCE // MEMBER WORKSPACE
                  </span>
                  <span
                    style={{
                      ...typography.styles.label,
                      fontSize: 22,
                      color: colors.midnight.green,
                    }}
                  >
                    VERIFIED ON PREPROD
                  </span>
                </div>

                {/* Cropped / Dynamic Camera Container */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: 380,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: `1px solid ${colors.midnight.border}`,
                    backgroundColor: '#070C18',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      transform: `scale(${shotScale}) translateY(${shotTranslateY}px)`,
                      transformOrigin: '50% 50%',
                    }}
                  >
                    <Img
                      src={staticFile('evidence/preprod-evaluation-clean.png')}
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                      }}
                    />
                  </div>

                  {/* Concise Callout Overlay during zoom (Requirement 5) */}
                  {calloutOpacity > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 16,
                        left: 16,
                        right: 16,
                        background: 'rgba(17, 21, 45, 0.95)',
                        border: `2px solid ${colors.midnight.green}`,
                        borderRadius: 8,
                        padding: '12px 18px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                        opacity: calloutOpacity,
                      }}
                    >
                      <div
                        style={{
                          ...typography.styles.label,
                          fontSize: 22, // Meets min 22px
                          color: colors.midnight.green,
                          marginBottom: 4,
                        }}
                      >
                        VERIFIED UNAFFECTED STATUS
                      </div>
                      <div
                        style={{
                          ...typography.styles.bodyText,
                          fontSize: 30, // Meets min 30px
                          color: colors.midnight.textPrimary,
                          lineHeight: 1.3,
                        }}
                      >
                        Compact circuit verifies genuine host package state is outside affected release set.
                      </div>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    ...typography.styles.bodyText,
                    fontSize: 30, // Meets min 30px
                    color: colors.midnight.textSecondary,
                    marginTop: 14,
                    lineHeight: 1.35,
                  }}
                >
                  Real host running genuine package manager state. Compact circuits prove honest evaluation on-chain.
                </div>
              </div>

              {/* Right Column: 3 Separated Content Panels with Permanent Minimum Font Sizes */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18,
                }}
              >
                {/* Circuit Property 1 */}
                <div
                  style={{
                    background: colors.midnight.surface,
                    border: `1px solid ${colors.midnight.border}`,
                    borderRadius: 12,
                    padding: '20px 28px',
                    boxShadow: colors.midnight.shadow,
                  }}
                >
                  <div
                    style={{
                      ...typography.styles.labelLarge,
                      fontSize: 24, // Meets min 22px
                      color: colors.midnight.cyan,
                      marginBottom: 8,
                    }}
                  >
                    PRIVATE INPUTS REMAIN OFF-CHAIN
                  </div>
                  <div
                    style={{
                      ...typography.styles.bodyText,
                      fontSize: 30, // Meets min 30px
                      color: colors.midnight.textSecondary,
                      lineHeight: 1.4,
                    }}
                  >
                    Member secret, host package manifest, and exact version never enter ledger storage.
                  </div>
                </div>

                {/* Circuit Property 2 */}
                <div
                  style={{
                    background: colors.midnight.surface,
                    border: `1px solid ${colors.midnight.border}`,
                    borderRadius: 12,
                    padding: '20px 28px',
                    boxShadow: colors.midnight.shadow,
                  }}
                >
                  <div
                    style={{
                      ...typography.styles.labelLarge,
                      fontSize: 24, // Meets min 22px
                      color: colors.midnight.violet,
                      marginBottom: 8,
                    }}
                  >
                    ADVISORY-SCOPED NULLIFIERS
                  </div>
                  <div
                    style={{
                      ...typography.styles.bodyText,
                      fontSize: 30, // Meets min 30px
                      color: colors.midnight.textSecondary,
                      lineHeight: 1.4,
                    }}
                  >
                    Prevents an admitted organization from double-counting while preserving anonymity across advisories.
                  </div>
                </div>

                {/* Circuit Property 3: Corrected Technical Wording (Requirement 6) */}
                <div
                  style={{
                    background: colors.midnight.surface,
                    border: `1px solid ${colors.midnight.border}`,
                    borderRadius: 12,
                    padding: '20px 28px',
                    boxShadow: colors.midnight.shadow,
                  }}
                >
                  <div
                    style={{
                      ...typography.styles.labelLarge,
                      fontSize: 24, // Meets min 22px
                      color: colors.midnight.green,
                      marginBottom: 8,
                    }}
                  >
                    PUBLIC ECOSYSTEM ACCOUNTABILITY
                  </div>
                  <div
                    style={{
                      ...typography.styles.bodyText,
                      fontSize: 30, // Meets min 30px
                      color: colors.midnight.textSecondary,
                      lineHeight: 1.4,
                    }}
                  >
                    The Midnight ledger updates a public aggregate that coordinators can independently verify.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Synchronized Captions (42px, max 2 lines, max 60% width) */}
      <Caption segments={scene02Captions} bottom={84} />
    </AbsoluteFill>
  );
};
