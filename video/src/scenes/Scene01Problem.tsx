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
import { scene01Captions } from '../narration/script';

export const Scene01Problem: React.FC = () => {
  const frame = useCurrentFrame();

  // -------------------------------------------------------------
  // One visual foundation across the film. A restrained 1.5% push adds life
  // without turning the document evidence into a floating presentation.
  // -------------------------------------------------------------
  const cameraZoom = interpolate(frame, [0, 790], [1.0, 1.015], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const currentBg = colors.midnight.bg;

  // -------------------------------------------------------------
  // 1. 0:00–0:02.1 (Frames 0–65): "29 MARCH 2024"
  // -------------------------------------------------------------
  const dateOpacity = interpolate(
    frame,
    [0, 12, 53, 65],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // -------------------------------------------------------------
  // 2. 0:02.1–0:07.5 (Frames 65–228): Authentic primary source advisories
  // -------------------------------------------------------------
  const advisoriesOpacity = interpolate(
    frame,
    [65, 76, 222, 228],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // -------------------------------------------------------------
  // 3. 0:07.5–0:11.8 (Frames 228–354): Isolated releases "5.6.0" & "5.6.1"
  // -------------------------------------------------------------
  const releasesOpacity = interpolate(
    frame,
    [228, 235, 348, 354],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // -------------------------------------------------------------
  // 4. 0:11.8–0:16.2 (Frames 354–488): "Which organizations were exposed?"
  // -------------------------------------------------------------
  const orgExposureOpacity = interpolate(
    frame,
    [354, 360, 482, 488],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // -------------------------------------------------------------
  // 5. 0:16.2–0:21.5 (Frames 488–645): "Answering could reveal their internal..."
  // -------------------------------------------------------------
  const inventoryRiskOpacity = interpolate(
    frame,
    [488, 494, 639, 645],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // -------------------------------------------------------------
  // 6. 0:21.5–0:26.33 (Frames 645–790): "What if exposure could be proven..."
  // Transition into Midnight indigo, holds cleanly before Scene 02 cut
  // -------------------------------------------------------------
  const zkPivotOpacity = interpolate(
    frame,
    [645, 652, 790],
    [0, 1, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: currentBg,
        overflow: 'hidden',
      }}
    >
      {/* Shared Midnight depth field */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: colors.midnight.bgGradient,
          pointerEvents: 'none',
        }}
      />

      {/* Main content with restrained documentary push-in */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${cameraZoom})`,
          transformOrigin: '50% 50%',
        }}
      >
        {/* ======================================================== */}
        {/* 1. 0:00–0:02.1: Editorial "29 MARCH 2024"                 */}
        {/* ======================================================== */}
        {dateOpacity > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: dateOpacity,
            }}
          >
            <div
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: 68, // Meets min 64px
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: colors.editorial.textPrimary,
                textTransform: 'uppercase',
              }}
            >
              29 MARCH 2024
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. 0:02.1–0:07.5: Authentic primary source advisory cards */}
        {/* ======================================================== */}
        {advisoriesOpacity > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '0 96px', // Title-safe margin
              opacity: advisoriesOpacity,
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 1360,
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              {/* Document 1: CISA Alert Official Header */}
              <div
                style={{
                  background: colors.editorial.surface,
                  border: `1px solid ${colors.editorial.border}`,
                  borderRadius: 8,
                  padding: '20px 32px',
                  boxShadow: colors.editorial.shadow,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: `1px solid ${colors.editorial.border}`,
                    paddingBottom: 8,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      ...typography.styles.label,
                      color: colors.editorial.textMuted,
                      fontSize: 22, // Meets min 22px
                    }}
                  >
                    CYBERSECURITY AND INFRASTRUCTURE SECURITY AGENCY // CISA
                  </span>
                  <span
                    style={{
                      ...typography.styles.label,
                      color: colors.editorial.red,
                      fontSize: 22,
                    }}
                  >
                    ALERT AA24-089A | CVE-2024-3094
                  </span>
                </div>
                <div
                  style={{
                    ...typography.styles.secondaryHeadline,
                    color: colors.editorial.textPrimary,
                    fontSize: 48, // Meets min 48px
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  Reported Supply Chain Compromise Affecting XZ Utils
                </div>
              </div>

              {/* Document 2: Upstream Maintainer Notice (tukaani.org) */}
              <div
                style={{
                  background: colors.editorial.surface,
                  border: `1px solid ${colors.editorial.border}`,
                  borderRadius: 8,
                  padding: '18px 32px',
                  boxShadow: colors.editorial.shadow,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: `1px solid ${colors.editorial.border}`,
                    paddingBottom: 8,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      ...typography.styles.label,
                      color: colors.editorial.textMuted,
                      fontSize: 22, // Meets min 22px
                    }}
                  >
                    UPSTREAM ADVISORY // TUKAANI.ORG (LASSE COLLIN)
                  </span>
                  <span
                    style={{
                      ...typography.styles.label,
                      color: colors.editorial.textSecondary,
                      fontSize: 22,
                    }}
                  >
                    PRIMARY DISCLOSURE
                  </span>
                </div>
                <div
                  style={{
                    ...typography.styles.secondaryHeadline,
                    color: colors.editorial.textPrimary,
                    fontSize: 42,
                    fontWeight: 600,
                    lineHeight: 1.2,
                  }}
                >
                  XZ Utils backdoor: Release tarballs of 5.6.0 and 5.6.1 contain compromised liblzma
                </div>
              </div>

              {/* Document 3: Authentic Primary Source Crop from oss-security */}
              <div
                style={{
                  background: colors.editorial.surface,
                  border: `1px solid ${colors.editorial.borderMedium}`,
                  borderRadius: 8,
                  padding: '16px 32px',
                  boxShadow: colors.editorial.shadow,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: `1px solid ${colors.editorial.border}`,
                    paddingBottom: 8,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      ...typography.styles.label,
                      color: colors.editorial.textMuted,
                      fontSize: 22, // Meets min 22px
                    }}
                  >
                    AUTHENTIC PRIMARY RECORD // OSS-SECURITY (ANDRES FREUND)
                  </span>
                  <span
                    style={{
                      ...typography.styles.label,
                      color: '#2563EB',
                      fontSize: 22,
                    }}
                  >
                    openwall.com/lists/oss-security/2024/03/29/4
                  </span>
                </div>
                <div
                  style={{
                    borderRadius: 4,
                    overflow: 'hidden',
                    border: `1px solid ${colors.editorial.border}`,
                    display: 'flex',
                    backgroundColor: '#1E232F',
                  }}
                >
                  <Img
                    src={staticFile('evidence/oss-security-disclosure-crop.png')}
                    style={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: 120,
                      objectFit: 'contain',
                      objectPosition: 'left center',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. 0:07.5–0:11.8: Visually isolate releases "5.6.0" & "5.6.1" */}
        {/* ======================================================== */}
        {releasesOpacity > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '0 96px',
              opacity: releasesOpacity,
            }}
          >
            <div
              style={{
                ...typography.styles.labelLarge,
                color: colors.editorial.textMuted,
                fontSize: 24, // Meets min 22px
                marginBottom: 28,
              }}
            >
              UPSTREAM RELEASE ARTIFACTS
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 48,
                marginBottom: 36,
              }}
            >
              <div
                style={{
                  background: colors.editorial.surface,
                  border: `1px solid ${colors.editorial.border}`,
                  borderRadius: 12,
                  padding: '28px 56px',
                  textAlign: 'center',
                  boxShadow: colors.editorial.shadow,
                }}
              >
                <div
                  style={{
                    fontFamily: typography.fontFamily.mono,
                    fontSize: 84, // Meets min 64px
                    fontWeight: 700,
                    color: colors.editorial.textPrimary,
                    letterSpacing: '-0.02em',
                  }}
                >
                  5.6.0
                </div>
                <div
                  style={{
                    ...typography.styles.label,
                    color: colors.editorial.textMuted,
                    fontSize: 22, // Meets min 22px
                    marginTop: 8,
                  }}
                >
                  xz-5.6.0.tar.gz
                </div>
              </div>

              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: 48,
                  color: colors.editorial.textMuted,
                  fontWeight: 300,
                }}
              >
                &
              </span>

              <div
                style={{
                  background: colors.editorial.surface,
                  border: `1px solid ${colors.editorial.border}`,
                  borderRadius: 12,
                  padding: '28px 56px',
                  textAlign: 'center',
                  boxShadow: colors.editorial.shadow,
                }}
              >
                <div
                  style={{
                    fontFamily: typography.fontFamily.mono,
                    fontSize: 84, // Meets min 64px
                    fontWeight: 700,
                    color: colors.editorial.textPrimary,
                    letterSpacing: '-0.02em',
                  }}
                >
                  5.6.1
                </div>
                <div
                  style={{
                    ...typography.styles.label,
                    color: colors.editorial.textMuted,
                    fontSize: 22, // Meets min 22px
                    marginTop: 8,
                  }}
                >
                  xz-5.6.1.tar.gz
                </div>
              </div>
            </div>

            <div
              style={{
                ...typography.styles.bodyLarge,
                fontSize: 32, // Meets min 30px
                color: colors.editorial.textSecondary,
                textAlign: 'center',
                fontWeight: 500,
              }}
            >
              Both upstream releases contained hidden, multi-stage exploit code.
            </div>
            <div
              style={{
                ...typography.styles.label,
                fontSize: 22, // Meets min 22px
                color: colors.editorial.red,
                marginTop: 16,
                letterSpacing: '0.1em',
              }}
            >
              CRITICAL VULNERABILITY // CVE-2024-3094
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. 0:11.8–0:16.2: "Which organizations were exposed?"     */}
        {/* ======================================================== */}
        {orgExposureOpacity > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '0 96px', // Title-safe margin
              textAlign: 'center',
              opacity: orgExposureOpacity,
            }}
          >
            <div
              style={{
                ...typography.styles.labelLarge,
                fontSize: 24, // Meets min 22px
                color: colors.editorial.textMuted,
                marginBottom: 24,
              }}
            >
              INCIDENT RESPONSE
            </div>

            <h1
              style={{
                ...typography.styles.primaryHeadline,
                fontSize: 68, // Meets min 64px
                color: colors.editorial.textPrimary,
                lineHeight: 1.2,
                maxWidth: 1300,
                margin: 0,
              }}
            >
              Which organizations were exposed?
            </h1>

            <p
              style={{
                ...typography.styles.bodyText,
                fontSize: 30, // Meets min 30px
                color: colors.editorial.textSecondary,
                lineHeight: 1.5,
                maxWidth: 1080,
                marginTop: 28,
              }}
            >
              Response teams faced an urgent coordination problem across global infrastructure,
              without any private way to verify who had deployed the compromised versions.
            </p>
          </div>
        )}

        {/* ======================================================== */}
        {/* 5. 0:16.2–0:21.5: "Answering could reveal their internal.."*/}
        {/* ======================================================== */}
        {inventoryRiskOpacity > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '0 96px', // Title-safe margin
              textAlign: 'center',
              opacity: inventoryRiskOpacity,
            }}
          >
            <div
              style={{
                ...typography.styles.labelLarge,
                fontSize: 24, // Meets min 22px
                color: colors.editorial.red,
                marginBottom: 24,
              }}
            >
              THE DISCLOSURE DILEMMA
            </div>

            <h1
              style={{
                ...typography.styles.primaryHeadline,
                fontSize: 64, // Meets min 64px
                color: colors.editorial.textPrimary,
                lineHeight: 1.2,
                maxWidth: 1300,
                margin: 0,
              }}
            >
              Answering could reveal their internal software inventory.
            </h1>

            <p
              style={{
                ...typography.styles.bodyText,
                fontSize: 30, // Meets min 30px
                color: colors.editorial.textSecondary,
                lineHeight: 1.5,
                maxWidth: 1080,
                marginTop: 28,
              }}
            >
              Publicly disclosing dependency manifests hands adversaries an exact map
              of vulnerable endpoints.
            </p>
          </div>
        )}

        {/* ======================================================== */}
        {/* 6. 0:21.5–0:26.33: "What if exposure could be proven..."  */}
        {/* Smooth transition into Midnight Indigo (#11152D)          */}
        {/* ======================================================== */}
        {zkPivotOpacity > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '0 96px', // Title-safe margin
              textAlign: 'center',
              opacity: zkPivotOpacity,
            }}
          >
            <div
              style={{
                ...typography.styles.labelLarge,
                fontSize: 24, // Meets min 22px
                color: colors.midnight.cyan,
                marginBottom: 28,
              }}
            >
              THE ZERO-KNOWLEDGE QUESTION
            </div>

            <h1
              style={{
                ...typography.styles.primaryHeadline,
                fontSize: 68, // Meets min 64px
                color: colors.midnight.textPrimary,
                lineHeight: 1.25,
                maxWidth: 1360,
                margin: 0,
              }}
            >
              What if exposure could be proven
              <br />
              <span
                style={{
                  color: colors.midnight.cyan,
                }}
              >
                without revealing the inventory?
              </span>
            </h1>
          </div>
        )}
      </div>

      {/* Global Synchronized Captions (42px, max 2 lines, max 60% width) */}
      <Caption segments={scene01Captions} />
    </AbsoluteFill>
  );
};

