import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { Caption } from '../components/Caption';
import { FilmGrain } from '../components/FilmGrain';
import { colors } from '../design/colors';
import { timing } from '../design/timing';
import { typography } from '../design/typography';
import { scene01Captions } from '../narration/script';

export const Scene01Problem: React.FC = () => {
  const frame = useCurrentFrame();

  // Slow, deliberate documentary camera drift (1.000 -> 1.018 across 790 frames)
  const cameraZoom = interpolate(frame, [0, 790], [1.0, 1.018], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // -------------------------------------------------------------
  // 1. 0:00–0:02 (Frames 0–60): Black screen with "29 MARCH 2024"
  // -------------------------------------------------------------
  const dateOpacity = interpolate(
    frame,
    [0, 12, 48, 60],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const dateTracking = interpolate(
    frame,
    [0, 60],
    [0.18, 0.22],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // -------------------------------------------------------------
  // 2. 0:02–0:07.5 (Frames 60–225): Authentic primary source advisories
  // -------------------------------------------------------------
  const advisoriesOpacity = interpolate(
    frame,
    [60, 72, 219, 225],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const advisoriesDriftY = interpolate(
    frame,
    [60, 225],
    [8, -8],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // -------------------------------------------------------------
  // 3. 0:07.5–0:11.8 (Frames 225–354): Visually isolate releases "5.6.0" & "5.6.1"
  // -------------------------------------------------------------
  const releasesOpacity = interpolate(
    frame,
    [225, 231, 348, 354],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const releasesScale = interpolate(
    frame,
    [225, 354],
    [0.985, 1.015],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // -------------------------------------------------------------
  // 4. 0:11.8–0:16.2 (Frames 354–488): "Which organizations were exposed?"
  // Clean 6-frame transition immediately following releases (no double exposure, no blank gap)
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
  // Holds cleanly for ~1.06s after speech ends before transition into Scene 02
  // -------------------------------------------------------------
  const zkPivotOpacity = interpolate(
    frame,
    [645, 651, 790],
    [0, 1, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );


  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#05070d',
        color: '#f8fafc',
        overflow: 'hidden',
      }}
    >
      {/* Subtle authentic documentary vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(14, 20, 38, 0.4) 0%, rgba(4, 6, 14, 0.95) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Content Area with Slow Cinematic Camera Movement */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${cameraZoom})`,
          transformOrigin: '50% 50%',
        }}
      >
        {/* ======================================================== */}
        {/* 1. 0:00–0:02: Black screen with "29 MARCH 2024"          */}
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
                fontSize: 54,
                fontWeight: 600,
                letterSpacing: `${dateTracking}em`,
                color: '#f8fafc',
                textTransform: 'uppercase',
              }}
            >
              29 MARCH 2024
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. 0:02–0:07.3: Authentic primary source advisory montage*/}
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
              padding: '0 160px',
              opacity: advisoriesOpacity,
              transform: `translateY(${advisoriesDriftY}px)`,
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 1260,
                display: 'flex',
                flexDirection: 'column',
                gap: 22,
              }}
            >
              {/* Document 1: CISA Alert Official Header */}
              <div
                style={{
                  background: '#090d1a',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 2,
                  padding: '24px 32px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingBottom: 10,
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontFamily: typography.fontFamily.mono,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                    }}
                  >
                    CYBERSECURITY AND INFRASTRUCTURE SECURITY AGENCY // CISA
                  </span>
                  <span
                    style={{
                      fontFamily: typography.fontFamily.mono,
                      fontSize: 11,
                      color: '#64748b',
                    }}
                  >
                    ALERT AA24-089A | CVE-2024-3094
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: 27,
                    fontWeight: 600,
                    color: '#f8fafc',
                    lineHeight: 1.3,
                  }}
                >
                  Reported Supply Chain Compromise Affecting XZ Utils
                </div>
              </div>

              {/* Document 2: Upstream Maintainer Notice (tukaani.org) */}
              <div
                style={{
                  background: '#090d1a',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 2,
                  padding: '22px 32px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingBottom: 8,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontFamily: typography.fontFamily.mono,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                    }}
                  >
                    UPSTREAM ADVISORY // TUKAANI.ORG (LASSE COLLIN)
                  </span>
                  <span
                    style={{
                      fontFamily: typography.fontFamily.mono,
                      fontSize: 11,
                      color: '#64748b',
                    }}
                  >
                    PRIMARY DISCLOSURE
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: 25,
                    fontWeight: 500,
                    color: '#f8fafc',
                    lineHeight: 1.3,
                  }}
                >
                  XZ Utils backdoor: Release tarballs of 5.6.0 and 5.6.1 contain compromised liblzma
                </div>
              </div>

              {/* Document 3: Authentic Primary Source Crop from oss-security */}
              <div
                style={{
                  background: '#090d1a',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: 2,
                  padding: '16px 28px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingBottom: 8,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontFamily: typography.fontFamily.mono,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                    }}
                  >
                    AUTHENTIC PRIMARY RECORD // OSS-SECURITY (ANDRES FREUND)
                  </span>
                  <span
                    style={{
                      fontFamily: typography.fontFamily.mono,
                      fontSize: 11,
                      color: '#38bdf8',
                    }}
                  >
                    openwall.com/lists/oss-security/2024/03/29/4
                  </span>
                </div>
                <div
                  style={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    backgroundColor: '#141720',
                  }}
                >
                  <Img
                    src={staticFile('evidence/oss-security-disclosure-crop.png')}
                    style={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: 125,
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
        {/* 3. 0:07.3–0:12: Visually isolate releases "5.6.0" & "5.6.1"*/}
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
              opacity: releasesOpacity,
              transform: `scale(${releasesScale})`,
            }}
          >
            <div
              style={{
                fontFamily: typography.fontFamily.mono,
                fontSize: 13,
                color: '#94a3b8',
                letterSpacing: '0.2em',
                marginBottom: 28,
                fontWeight: 600,
                textTransform: 'uppercase',
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
                  background: '#090d1a',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 4,
                  padding: '24px 44px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: typography.fontFamily.mono,
                    fontSize: 78,
                    fontWeight: 700,
                    color: '#f8fafc',
                    letterSpacing: '-0.02em',
                  }}
                >
                  5.6.0
                </div>
                <div
                  style={{
                    fontFamily: typography.fontFamily.mono,
                    fontSize: 13,
                    color: '#94a3b8',
                    marginTop: 8,
                  }}
                >
                  xz-5.6.0.tar.gz
                </div>
              </div>

              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: 40,
                  color: '#64748b',
                  fontWeight: 300,
                }}
              >
                &
              </span>

              <div
                style={{
                  background: '#090d1a',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 4,
                  padding: '24px 44px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: typography.fontFamily.mono,
                    fontSize: 78,
                    fontWeight: 700,
                    color: '#f8fafc',
                    letterSpacing: '-0.02em',
                  }}
                >
                  5.6.1
                </div>
                <div
                  style={{
                    fontFamily: typography.fontFamily.mono,
                    fontSize: 13,
                    color: '#94a3b8',
                    marginTop: 8,
                  }}
                >
                  xz-5.6.1.tar.gz
                </div>
              </div>
            </div>

            <div
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: 22,
                color: '#cbd5e1',
                textAlign: 'center',
              }}
            >
              Both upstream releases contained hidden, multi-stage exploit code.
            </div>
            <div
              style={{
                fontFamily: typography.fontFamily.mono,
                fontSize: 14,
                color: '#ef4444',
                marginTop: 14,
                letterSpacing: '0.08em',
              }}
            >
              CRITICAL VULNERABILITY // CVE-2024-3094
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. 0:12–0:16.5: "Which organizations were exposed?"       */}
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
              padding: '0 180px',
              textAlign: 'center',
              opacity: orgExposureOpacity,
            }}
          >
            <div
              style={{
                fontFamily: typography.fontFamily.mono,
                fontSize: 13,
                color: '#94a3b8',
                letterSpacing: '0.2em',
                marginBottom: 24,
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              INCIDENT RESPONSE
            </div>

            <h1
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: 64,
                fontWeight: 700,
                letterSpacing: '-0.025em',
                color: '#f8fafc',
                lineHeight: 1.2,
                maxWidth: 1200,
                margin: 0,
              }}
            >
              Which organizations were exposed?
            </h1>

            <p
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: 24,
                color: '#94a3b8',
                lineHeight: 1.5,
                maxWidth: 960,
                marginTop: 28,
              }}
            >
              Response teams faced an urgent coordination problem across global infrastructure,
              without any private way to verify who had deployed the compromised versions.
            </p>
          </div>
        )}

        {/* ======================================================== */}
        {/* 5. 0:16.5–0:21.8: "Answering could reveal their internal.."*/}
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
              padding: '0 180px',
              textAlign: 'center',
              opacity: inventoryRiskOpacity,
            }}
          >
            <div
              style={{
                fontFamily: typography.fontFamily.mono,
                fontSize: 13,
                color: '#ef4444',
                letterSpacing: '0.2em',
                marginBottom: 24,
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              THE DISCLOSURE DILEMMA
            </div>

            <h1
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: 58,
                fontWeight: 700,
                letterSpacing: '-0.025em',
                color: '#f8fafc',
                lineHeight: 1.2,
                maxWidth: 1250,
                margin: 0,
              }}
            >
              Answering could reveal their internal software inventory.
            </h1>

            <p
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: 23,
                color: '#cbd5e1',
                lineHeight: 1.5,
                maxWidth: 980,
                marginTop: 28,
              }}
            >
              Publicly disclosing dependency manifests hands adversaries an exact map
              of vulnerable endpoints.
            </p>
          </div>
        )}

        {/* ======================================================== */}
        {/* 6. 0:21.8–0:28: "What if exposure could be proven..."     */}
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
              padding: '0 160px',
              textAlign: 'center',
              opacity: zkPivotOpacity,
            }}
          >
            <div
              style={{
                fontFamily: typography.fontFamily.mono,
                fontSize: 13,
                color: colors.midnightCyan.base,
                letterSpacing: '0.22em',
                marginBottom: 28,
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              THE ZERO-KNOWLEDGE QUESTION
            </div>

            <h1
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: 60,
                fontWeight: 700,
                letterSpacing: '-0.025em',
                color: '#f8fafc',
                lineHeight: 1.25,
                maxWidth: 1300,
                margin: 0,
              }}
            >
              What if exposure could be proven
              <br />
              <span
                style={{
                  color: colors.midnightCyan.base,
                }}
              >
                without revealing the inventory?
              </span>
            </h1>
          </div>
        )}
      </div>

      {/* Synchronized Documented Captions */}
      <Caption segments={scene01Captions} bottom={64} />

      {/* Overlay Subtle Documentary Film Grain */}
      <FilmGrain opacity={0.02} />
    </AbsoluteFill>
  );
};
