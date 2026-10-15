import React from 'react';
import {
  AbsoluteFill,
  interpolate,
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

  // Slow, cinematic documentary camera drift (1.000 -> 1.025)
  const cameraZoom = interpolate(frame, [0, 600], [1.0, 1.025], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // -------------------------------------------------------------
  // 1. 0:00–0:02 (Frames 0–60): Black screen with "29 MARCH 2024"
  // -------------------------------------------------------------
  const dateOpacity = interpolate(
    frame,
    [0, 10, 48, 60],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const dateTracking = interpolate(
    frame,
    [0, 60],
    [0.18, 0.24],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // -------------------------------------------------------------
  // 2. 0:02–0:07 (Frames 60–210): Authentic advisory headline montage
  // -------------------------------------------------------------
  const advisoriesOpacity = interpolate(
    frame,
    [60, 72, 198, 210],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const advisoriesDriftY = interpolate(
    frame,
    [60, 210],
    [10, -10],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // -------------------------------------------------------------
  // 3. 0:07–0:11 (Frames 210–330): Visually isolate releases "5.6.0" and "5.6.1"
  // -------------------------------------------------------------
  const releasesOpacity = interpolate(
    frame,
    [210, 222, 318, 330],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const releasesScale = interpolate(
    frame,
    [210, 330],
    [0.98, 1.02],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // -------------------------------------------------------------
  // 4. 0:11–0:15 (Frames 330–450): "Which organizations were exposed?"
  // -------------------------------------------------------------
  const orgExposureOpacity = interpolate(
    frame,
    [330, 342, 438, 450],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // -------------------------------------------------------------
  // 5. 0:15–0:18 (Frames 450–540): "Answering could reveal their internal software inventory."
  // -------------------------------------------------------------
  const inventoryRiskOpacity = interpolate(
    frame,
    [450, 462, 528, 540],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // -------------------------------------------------------------
  // 6. 0:18–0:20 (Frames 540–600): "What if exposure could be proven without revealing the inventory?"
  // -------------------------------------------------------------
  const zkPivotOpacity = interpolate(
    frame,
    [540, 552, 600],
    [0, 1, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#040814',
        color: colors.text.primary,
        overflow: 'hidden',
      }}
    >
      {/* Subtle background documentary vignetting */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 50%, rgba(10, 18, 42, 0.45) 0%, rgba(4, 8, 20, 0.95) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Content Container with Slow Cinematic Zoom */}
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
                fontSize: 60,
                fontWeight: 600,
                letterSpacing: `${dateTracking}em`,
                color: colors.text.primary,
                textTransform: 'uppercase',
              }}
            >
              29 MARCH 2024
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. 0:02–0:07: Authentic advisory headline montage        */}
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
                maxWidth: 1300,
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
              }}
            >
              {/* CISA Alert Card */}
              <div
                style={{
                  background: 'rgba(9, 14, 30, 0.92)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderLeft: `4px solid ${colors.danger.alert}`,
                  padding: '24px 32px',
                  borderRadius: 4,
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      ...typography.styles.sourceLabel,
                      fontSize: 12,
                      color: colors.danger.base,
                      letterSpacing: '0.12em',
                      fontWeight: 700,
                    }}
                  >
                    CYBERSECURITY & INFRASTRUCTURE SECURITY AGENCY // CISA
                  </span>
                  <span
                    style={{
                      ...typography.styles.sourceLabel,
                      fontSize: 11,
                      color: colors.text.dim,
                    }}
                  >
                    RELEASED: MARCH 29, 2024
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: 28,
                    fontWeight: 600,
                    color: colors.text.primary,
                    lineHeight: 1.3,
                  }}
                >
                  Alert: Reported Supply Chain Compromise Affecting XZ Utils (CVE-2024-3094)
                </div>
              </div>

              {/* Upstream Maintainer Disclosure Card (tukaani.org) */}
              <div
                style={{
                  background: 'rgba(9, 14, 30, 0.92)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderLeft: `4px solid ${colors.midnightViolet.bright}`,
                  padding: '22px 32px',
                  borderRadius: 4,
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      ...typography.styles.sourceLabel,
                      fontSize: 12,
                      color: colors.midnightViolet.bright,
                      letterSpacing: '0.12em',
                      fontWeight: 700,
                    }}
                  >
                    UPSTREAM MAINTAINER ADVISORY // TUKAANI.ORG (LASSE COLLIN)
                  </span>
                  <span
                    style={{
                      ...typography.styles.sourceLabel,
                      fontSize: 11,
                      color: colors.text.dim,
                    }}
                  >
                    PRIMARY DISCLOSURE
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: 26,
                    fontWeight: 500,
                    color: colors.text.primary,
                    lineHeight: 1.3,
                  }}
                >
                  XZ Utils backdoor: Release tarballs of 5.6.0 and 5.6.1 contain compromised liblzma
                </div>
              </div>

              {/* Red Hat Product Security Card */}
              <div
                style={{
                  background: 'rgba(9, 14, 30, 0.92)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderLeft: `4px solid ${colors.midnightCyan.base}`,
                  padding: '20px 32px',
                  borderRadius: 4,
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      ...typography.styles.sourceLabel,
                      fontSize: 12,
                      color: colors.midnightCyan.base,
                      letterSpacing: '0.12em',
                      fontWeight: 700,
                    }}
                  >
                    RED HAT PRODUCT SECURITY
                  </span>
                  <span
                    style={{
                      ...typography.styles.sourceLabel,
                      fontSize: 11,
                      color: colors.text.dim,
                    }}
                  >
                    CVSS 10.0 // CRITICAL
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: 24,
                    fontWeight: 500,
                    color: colors.text.primary,
                    lineHeight: 1.3,
                  }}
                >
                  Urgent security alert: Malicious code injection in upstream XZ Utils builds
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. 0:07–0:11: Visually isolate releases "5.6.0" & "5.6.1"*/}
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
                ...typography.styles.sourceLabel,
                fontSize: 14,
                color: colors.danger.base,
                letterSpacing: '0.2em',
                marginBottom: 24,
                fontWeight: 700,
              }}
            >
              COMPROMISED UPSTREAM RELEASES
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 60,
                marginBottom: 32,
              }}
            >
              <div
                style={{
                  fontFamily: typography.fontFamily.mono,
                  fontSize: 104,
                  fontWeight: 700,
                  color: colors.text.primary,
                  letterSpacing: '-0.02em',
                  padding: '12px 36px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: `1.5px solid ${colors.danger.alert}`,
                  borderRadius: 6,
                  boxShadow: '0 0 40px rgba(239, 68, 68, 0.2)',
                }}
              >
                5.6.0
              </div>

              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: 48,
                  color: colors.text.dim,
                  fontWeight: 300,
                }}
              >
                &
              </span>

              <div
                style={{
                  fontFamily: typography.fontFamily.mono,
                  fontSize: 104,
                  fontWeight: 700,
                  color: colors.text.primary,
                  letterSpacing: '-0.02em',
                  padding: '12px 36px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: `1.5px solid ${colors.danger.alert}`,
                  borderRadius: 6,
                  boxShadow: '0 0 40px rgba(239, 68, 68, 0.2)',
                }}
              >
                5.6.1
              </div>
            </div>

            <div
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: 22,
                color: colors.text.muted,
                letterSpacing: '0.04em',
                textAlign: 'center',
              }}
            >
              XZ Utils upstream source tarballs modified with hidden backdoor
            </div>
            <div
              style={{
                ...typography.styles.codeBadge,
                fontSize: 16,
                color: colors.danger.base,
                marginTop: 12,
              }}
            >
              CVE-2024-3094
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. 0:11–0:15: "Which organizations were exposed?"         */}
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
                ...typography.styles.sourceLabel,
                fontSize: 14,
                color: colors.midnightCyan.base,
                letterSpacing: '0.2em',
                marginBottom: 24,
                fontWeight: 700,
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
                color: colors.text.primary,
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
                color: colors.text.muted,
                lineHeight: 1.45,
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
        {/* 5. 0:15–0:18: "Answering could reveal their internal..."  */}
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
                ...typography.styles.sourceLabel,
                fontSize: 14,
                color: colors.danger.base,
                letterSpacing: '0.2em',
                marginBottom: 24,
                fontWeight: 700,
              }}
            >
              THE DISCLOSURE RISK
            </div>

            <h1
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: 58,
                fontWeight: 700,
                letterSpacing: '-0.025em',
                color: colors.text.primary,
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
                fontSize: 24,
                color: colors.danger.base,
                lineHeight: 1.45,
                maxWidth: 980,
                marginTop: 28,
                fontWeight: 500,
              }}
            >
              Publicly disclosing package manifests hands adversaries an exact roadmap
              of vulnerable servers and endpoints.
            </p>
          </div>
        )}

        {/* ======================================================== */}
        {/* 6. 0:18–0:20: "What if exposure could be proven..."      */}
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
                ...typography.styles.sourceLabel,
                fontSize: 14,
                color: colors.midnightCyan.base,
                letterSpacing: '0.22em',
                marginBottom: 28,
                fontWeight: 700,
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
                color: colors.text.primary,
                lineHeight: 1.2,
                maxWidth: 1300,
                margin: 0,
              }}
            >
              What if exposure could be proven
              <br />
              <span
                style={{
                  color: colors.midnightCyan.base,
                  textShadow: '0 0 35px rgba(0, 229, 255, 0.4)',
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
      <FilmGrain opacity={0.025} />
    </AbsoluteFill>
  );
};
