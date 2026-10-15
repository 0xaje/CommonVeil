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
import { scene02Captions } from '../narration/script';

export const Scene02Solution: React.FC = () => {
  const frame = useCurrentFrame();

  // Slow, deliberate documentary camera drift
  const cameraZoom = interpolate(frame, [0, timing.scene02DurationFrames], [1.0, 1.018], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // -------------------------------------------------------------
  // Phase 1: 0:00 - 0:06.0 (Frames 0 - 180) — The Direct Answer & Brand
  // -------------------------------------------------------------
  const heroOpacity = interpolate(
    frame,
    [0, 12, 174, 180],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const heroScale = interpolate(
    frame,
    [0, 180],
    [0.985, 1.01],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // -------------------------------------------------------------
  // Phase 2: 0:06.0 - 0:17.5 (Frames 180 - 525) — The Separation Architecture
  // -------------------------------------------------------------
  const archOpacity = interpolate(
    frame,
    [180, 190, 518, 525],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // -------------------------------------------------------------
  // Phase 3: 0:17.5 - 0:31.83 (Frames 525 - 955) — Compact Circuits & Preprod Evidence
  // -------------------------------------------------------------
  const circuitsOpacity = interpolate(
    frame,
    [525, 535, 955],
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
            'radial-gradient(ellipse at 50% 50%, rgba(14, 20, 38, 0.45) 0%, rgba(4, 6, 14, 0.96) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Content Area with Cinematic Camera Movement */}
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
              padding: '0 160px',
              opacity: heroOpacity,
              transform: `scale(${heroScale})`,
            }}
          >
            <div
              style={{
                fontFamily: typography.fontFamily.mono,
                fontSize: 13,
                fontWeight: 600,
                color: colors.midnightCyan.base,
                letterSpacing: '0.22em',
                marginBottom: 20,
                textTransform: 'uppercase',
              }}
            >
              THE SOLUTION // ZERO-KNOWLEDGE COORDINATION
            </div>

            {/* Brand Logo & Title */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                marginBottom: 16,
              }}
            >
              <svg width="44" height="44" viewBox="0 0 32 32" fill="none">
                <rect
                  x="2"
                  y="2"
                  width="28"
                  height="28"
                  rx="6"
                  stroke={colors.border.subtle}
                  strokeWidth="1.5"
                  fill="rgba(4, 8, 20, 0.6)"
                />
                <path
                  d="M8 11L16 6L24 11V18C24 22.5 16 26 16 26C16 26 8 22.5 8 18V11Z"
                  stroke={colors.midnightCyan.base}
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <circle cx="16" cy="15" r="2.5" fill={colors.midnightCyan.bright} />
              </svg>

              <h1
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: 72,
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  color: '#f8fafc',
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                COMMONVEIL
              </h1>
            </div>

            <p
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: 27,
                fontWeight: 500,
                color: '#94a3b8',
                lineHeight: 1.4,
                maxWidth: 980,
                margin: '0 0 32px 0',
              }}
            >
              Confidential vulnerability coordination built natively on Midnight.
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div
                style={{
                  fontFamily: typography.fontFamily.mono,
                  fontSize: 12,
                  color: '#cbd5e1',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 3,
                  padding: '8px 18px',
                  letterSpacing: '0.08em',
                }}
              >
                COMPACT CIRCUITS ON PREPROD
              </div>
              <div
                style={{
                  fontFamily: typography.fontFamily.mono,
                  fontSize: 12,
                  color: colors.midnightCyan.base,
                  background: 'rgba(0, 229, 255, 0.06)',
                  border: `1px solid rgba(0, 229, 255, 0.25)`,
                  borderRadius: 3,
                  padding: '8px 18px',
                  letterSpacing: '0.08em',
                }}
              >
                PRE-POLICY SNAPSHOT VERIFICATION
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* Phase 2: 0:06.0 - 0:17.5 — The Separation Architecture   */}
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
              padding: '0 140px',
              opacity: archOpacity,
            }}
          >
            <div
              style={{
                fontFamily: typography.fontFamily.mono,
                fontSize: 13,
                fontWeight: 600,
                color: '#94a3b8',
                letterSpacing: '0.2em',
                marginBottom: 20,
                textTransform: 'uppercase',
              }}
            >
              PROTOCOL ARCHITECTURE // MULTI-ROLE DISCLOSURE SEPARATION
            </div>

            <h2
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: 42,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#f8fafc',
                margin: '0 0 32px 0',
                textAlign: 'center',
              }}
            >
              Separating Private Evidence from Public Proof
            </h2>

            {/* 3-Role Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 20,
                width: '100%',
                maxWidth: 1300,
                marginBottom: 24,
              }}
            >
              {/* Role 1: Registrar */}
              <div
                style={{
                  background: '#090d1a',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 4,
                  padding: '24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontFamily: typography.fontFamily.mono,
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#94a3b8',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  01 // REGISTRAR
                </div>
                <div
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: 20,
                    fontWeight: 600,
                    color: '#f8fafc',
                  }}
                >
                  Admit Credentials & Policy
                </div>
                <p
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: 15,
                    color: '#94a3b8',
                    lineHeight: 1.45,
                    margin: 0,
                  }}
                >
                  Admits opaque Member credentials and registers exact affected release tuples without viewing local inventories.
                </p>
              </div>

              {/* Role 2: Certifier */}
              <div
                style={{
                  background: '#090d1a',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 4,
                  padding: '24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontFamily: typography.fontFamily.mono,
                    fontSize: 12,
                    fontWeight: 700,
                    color: colors.midnightCyan.base,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  02 // CERTIFIER
                </div>
                <div
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: 20,
                    fontWeight: 600,
                    color: '#f8fafc',
                  }}
                >
                  Commit Pre-Policy Snapshot
                </div>
                <p
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: 15,
                    color: '#94a3b8',
                    lineHeight: 1.45,
                    margin: 0,
                  }}
                >
                  Reviews evidence and posts a salted inventory commitment to Midnight before disclosure policy is activated.
                </p>
              </div>

              {/* Role 3: Member */}
              <div
                style={{
                  background: '#090d1a',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 4,
                  padding: '24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontFamily: typography.fontFamily.mono,
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#a78bfa',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  03 // MEMBER
                </div>
                <div
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: 20,
                    fontWeight: 600,
                    color: '#f8fafc',
                  }}
                >
                  Private ZK Attestation
                </div>
                <p
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: 15,
                    color: '#94a3b8',
                    lineHeight: 1.45,
                    margin: 0,
                  }}
                >
                  Generates a zero-knowledge proof that their certified snapshot contains the affected release, without revealing inventory.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* Phase 3: 0:17.5 - 0:31.83 — Circuits & Preprod Evidence  */}
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
              padding: '0 120px',
              opacity: circuitsOpacity,
            }}
          >
            <div
              style={{
                fontFamily: typography.fontFamily.mono,
                fontSize: 13,
                fontWeight: 600,
                color: colors.midnightCyan.base,
                letterSpacing: '0.2em',
                marginBottom: 16,
                textTransform: 'uppercase',
              }}
            >
              ZERO-KNOWLEDGE VERIFICATION // MIDNIGHT PREPROD
            </div>

            <h2
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: 38,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#f8fafc',
                margin: '0 0 28px 0',
                textAlign: 'center',
              }}
            >
              Compact Smart Contract Enforces Exposure On-Chain
            </h2>

            {/* Side-by-side Evidence Card + Circuit Guarantees */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: 28,
                width: '100%',
                maxWidth: 1340,
                alignItems: 'stretch',
              }}
            >
              {/* Left: Authentic Preprod Evidence Snapshot */}
              <div
                style={{
                  background: '#090d1a',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: 4,
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: typography.fontFamily.mono,
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#94a3b8',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    AUTHENTIC PREPROD EVIDENCE // MEMBER WORKSPACE
                  </span>
                  <span
                    style={{
                      fontFamily: typography.fontFamily.mono,
                      fontSize: 11,
                      color: '#10b981',
                    }}
                  >
                    VERIFIED ON PREPROD
                  </span>
                </div>

                <div
                  style={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Img
                    src={staticFile('evidence/preprod-evaluation-clean.png')}
                    style={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: 250,
                      objectFit: 'contain',
                      objectPosition: 'top center',
                    }}
                  />
                </div>

                <div
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: 13,
                    color: '#94a3b8',
                    lineHeight: 1.4,
                  }}
                >
                  Real host running genuine package manager state. Compact circuits prove unaffected status honestly without on-chain attestation.
                </div>
              </div>

              {/* Right: Compact Circuit Guarantees */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    background: '#090d1a',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 4,
                    padding: '16px 20px',
                  }}
                >
                  <div
                    style={{
                      fontFamily: typography.fontFamily.mono,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#38bdf8',
                      marginBottom: 6,
                    }}
                  >
                    PRIVATE INPUTS REMAIN OFF-CHAIN
                  </div>
                  <div
                    style={{
                      fontFamily: typography.fontFamily.sans,
                      fontSize: 14,
                      color: '#cbd5e1',
                      lineHeight: 1.4,
                    }}
                  >
                    Member secret, host package manifest, and exact version never enter ledger storage.
                  </div>
                </div>

                <div
                  style={{
                    background: '#090d1a',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 4,
                    padding: '16px 20px',
                  }}
                >
                  <div
                    style={{
                      fontFamily: typography.fontFamily.mono,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#a78bfa',
                      marginBottom: 6,
                    }}
                  >
                    ADVISORY-SCOPED NULLIFIERS
                  </div>
                  <div
                    style={{
                      fontFamily: typography.fontFamily.sans,
                      fontSize: 14,
                      color: '#cbd5e1',
                      lineHeight: 1.4,
                    }}
                  >
                    Prevents an admitted organization from double-counting while preserving anonymity across advisories.
                  </div>
                </div>

                <div
                  style={{
                    background: '#090d1a',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 4,
                    padding: '16px 20px',
                  }}
                >
                  <div
                    style={{
                      fontFamily: typography.fontFamily.mono,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#34d399',
                      marginBottom: 6,
                    }}
                  >
                    PUBLIC ECOSYSTEM ACCOUNTABILITY
                  </div>
                  <div
                    style={{
                      fontFamily: typography.fontFamily.sans,
                      fontSize: 14,
                      color: '#cbd5e1',
                      lineHeight: 1.4,
                    }}
                  >
                    The Midnight ledger increments an aggregate accepted counter that coordinators and regulators can trust.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Synchronized Captions */}
      <Caption segments={scene02Captions} bottom={64} />

      {/* Overlay Subtle Documentary Film Grain */}
      <FilmGrain opacity={0.02} />
    </AbsoluteFill>
  );
};
