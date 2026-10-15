import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { BrandMark } from '../components/BrandMark';
import { Caption } from '../components/Caption';
import { FilmGrain } from '../components/FilmGrain';
import { SourceLabel } from '../components/SourceLabel';
import { TimelineGuide } from '../components/TimelineGuide';
import { colors } from '../design/colors';
import { timing } from '../design/timing';
import { typography } from '../design/typography';
import { scene01Captions } from '../narration/script';

export const Scene01Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Master fade-in from black at scene start (0 to 20 frames)
  const masterFadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Slow, cinematic documentary camera zoom (subtle, 1.0 to 1.035 over 600 frames)
  const cameraScale = interpolate(frame, [0, 600], [1.0, 1.035], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // -------------------------------------------------------------
  // PHASE 1 & 2: 0:00 - 0:08 (Frames 0 - 240)
  // Dependency Tree & Affected CVE Warning
  // -------------------------------------------------------------
  const phase1And2Opacity = interpolate(
    frame,
    [0, 15, 230, 245],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Phase 1 headline: "A critical dependency can sit deep inside the stack."
  const phase1TextOpacity = interpolate(
    frame,
    [15, 30, 80, 95],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Phase 2 transition at frame 90 (0:03)
  const isPhase2 = frame >= timing.scene01.phase2Start;
  const warningTransition = interpolate(
    frame,
    [timing.scene01.phase2Start, timing.scene01.phase2Start + 20],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Subtle warning border pulse (deterministic frame-based)
  const warningPulse = Math.sin((frame - 90) * 0.12) * 0.25 + 0.75;

  // -------------------------------------------------------------
  // PHASE 3: 0:08 - 0:14 (Frames 240 - 420)
  // Coordination Problem & Anonymous Organization Nodes
  // -------------------------------------------------------------
  const phase3Opacity = interpolate(
    frame,
    [240, 255, 410, 425],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Text 1: "Which organizations are exposed?"
  const q1Opacity = interpolate(
    frame,
    [250, 265, 315, 330],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Text 2: "Can they answer without publishing their software inventory?"
  const q2Opacity = interpolate(
    frame,
    [330, 345, 405, 420],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Dependency signal propagation (deterministic progress along links)
  const signalProgress = interpolate(
    (frame - 240) % 60,
    [0, 50],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // -------------------------------------------------------------
  // PHASE 4: 0:14 - 0:20 (Frames 420 - 600)
  // Privacy Dilemma Split Choice & Concluding Statement
  // -------------------------------------------------------------
  const phase4Opacity = interpolate(
    frame,
    [420, 435, 600],
    [0, 1, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Left card spring reveal
  const leftCardSpring = spring({
    frame: frame - 425,
    fps,
    config: { damping: 16, stiffness: 100 },
  });

  // Right card spring reveal
  const rightCardSpring = spring({
    frame: frame - 440,
    fps,
    config: { damping: 16, stiffness: 100 },
  });

  // Center concluding statement reveal (frame 500 to 600)
  const conclusionOpacity = interpolate(
    frame,
    [495, 515],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const conclusionY = interpolate(
    frame,
    [495, 520],
    [15, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg.primary,
        color: colors.text.primary,
        overflow: 'hidden',
        opacity: masterFadeIn,
      }}
    >
      {/* Background Engineering Grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(148, 163, 184, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          opacity: 0.8,
        }}
      />

      {/* Subtle Midnight Radial Glow */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 1200,
          height: 800,
          background:
            'radial-gradient(circle, rgba(16, 29, 66, 0.35) 0%, rgba(4, 8, 20, 0) 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Content Area with Slow Documentary Camera Drift */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${cameraScale})`,
          transformOrigin: '50% 50%',
        }}
      >
        {/* ======================================================== */}
        {/* PHASE 1 & 2: Linux Supply Chain Dependency Graph         */}
        {/* ======================================================== */}
        {phase1And2Opacity > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: phase1And2Opacity,
            }}
          >
            {/* SVG Dependency Connections */}
            <svg
              width="1920"
              height="1080"
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            >
              {/* sshd -> libsystemd */}
              <line
                x1="960"
                y1="220"
                x2="840"
                y2="370"
                stroke={colors.graph.link}
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              {/* systemd -> libsystemd */}
              <line
                x1="700"
                y1="220"
                x2="840"
                y2="370"
                stroke={colors.graph.link}
                strokeWidth="1.5"
              />
              {/* sshd -> glibc */}
              <line
                x1="960"
                y1="220"
                x2="1100"
                y2="370"
                stroke={colors.graph.link}
                strokeWidth="1.5"
              />
              {/* package-mgmt -> libarchive */}
              <line
                x1="1240"
                y1="220"
                x2="580"
                y2="370"
                stroke={colors.graph.link}
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* CRITICAL PATH: libsystemd -> XZ Utils (liblzma) */}
              <line
                x1="840"
                y1="410"
                x2="960"
                y2="540"
                stroke={
                  isPhase2
                    ? `rgba(239, 68, 68, ${0.4 + warningPulse * 0.4})`
                    : colors.midnightCyan.base
                }
                strokeWidth={isPhase2 ? '2' : '1.5'}
              />
              {/* libarchive -> XZ Utils */}
              <line
                x1="580"
                y1="410"
                x2="960"
                y2="540"
                stroke={colors.graph.link}
                strokeWidth="1.5"
              />
              {/* libsystemd -> zlib */}
              <line
                x1="840"
                y1="410"
                x2="700"
                y2="540"
                stroke={colors.graph.link}
                strokeWidth="1.5"
              />
              {/* glibc -> bzip2 */}
              <line
                x1="1100"
                y1="410"
                x2="1220"
                y2="540"
                stroke={colors.graph.link}
                strokeWidth="1.5"
              />
            </svg>

            {/* Top Tier: System Applications */}
            <div
              style={{
                position: 'absolute',
                top: 190,
                left: 640,
                transform: 'translateX(-50%)',
                ...nodeStyle,
              }}
            >
              <div style={badgeStyle}>DAEMON</div>
              <div style={labelStyle}>systemd</div>
            </div>

            <div
              style={{
                position: 'absolute',
                top: 190,
                left: 960,
                transform: 'translateX(-50%)',
                ...nodeStyle,
                borderColor: colors.border.active,
              }}
            >
              <div style={{ ...badgeStyle, color: colors.midnightCyan.base }}>
                NETWORK DAEMON
              </div>
              <div style={{ ...labelStyle, color: colors.text.primary }}>
                OpenSSH (sshd)
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                top: 190,
                left: 1260,
                transform: 'translateX(-50%)',
                ...nodeStyle,
              }}
            >
              <div style={badgeStyle}>CORE UTIL</div>
              <div style={labelStyle}>package-mgmt</div>
            </div>

            {/* Mid Tier: Intermediate Libraries */}
            <div
              style={{
                position: 'absolute',
                top: 360,
                left: 580,
                transform: 'translateX(-50%)',
                ...nodeStyle,
              }}
            >
              <div style={badgeStyle}>LIB</div>
              <div style={labelStyle}>libarchive</div>
            </div>

            <div
              style={{
                position: 'absolute',
                top: 360,
                left: 840,
                transform: 'translateX(-50%)',
                ...nodeStyle,
                borderColor: 'rgba(0, 229, 255, 0.3)',
              }}
            >
              <div style={badgeStyle}>SHARED LIB</div>
              <div style={labelStyle}>libsystemd</div>
            </div>

            <div
              style={{
                position: 'absolute',
                top: 360,
                left: 1100,
                transform: 'translateX(-50%)',
                ...nodeStyle,
              }}
            >
              <div style={badgeStyle}>SYSTEM C</div>
              <div style={labelStyle}>glibc</div>
            </div>

            {/* Bottom Tier: Deep In The Stack */}
            <div
              style={{
                position: 'absolute',
                top: 520,
                left: 700,
                transform: 'translateX(-50%)',
                ...nodeStyle,
              }}
            >
              <div style={badgeStyle}>COMPRESSION</div>
              <div style={labelStyle}>zlib</div>
            </div>

            <div
              style={{
                position: 'absolute',
                top: 520,
                left: 1220,
                transform: 'translateX(-50%)',
                ...nodeStyle,
              }}
            >
              <div style={badgeStyle}>COMPRESSION</div>
              <div style={labelStyle}>bzip2</div>
            </div>

            {/* DEEP TARGET NODE: XZ Utils */}
            <div
              style={{
                position: 'absolute',
                top: 510,
                left: 960,
                transform: 'translateX(-50%)',
                padding: '16px 28px',
                borderRadius: 8,
                backgroundColor: isPhase2
                  ? 'rgba(24, 12, 18, 0.95)'
                  : colors.bg.surface,
                border: isPhase2
                  ? `2px solid rgba(239, 68, 68, ${warningPulse})`
                  : `1.5px solid ${colors.midnightCyan.base}`,
                boxShadow: isPhase2
                  ? `0 0 30px rgba(239, 68, 68, ${0.25 * warningPulse})`
                  : `0 0 20px ${colors.midnightCyan.dim}`,
                textAlign: 'center',
                transition: 'all 0.3s ease',
                zIndex: 20,
              }}
            >
              <div
                style={{
                  ...badgeStyle,
                  color: isPhase2 ? colors.danger.alert : colors.midnightCyan.base,
                }}
              >
                {isPhase2 ? 'VULNERABILITY DETECTED' : 'LOW-LEVEL DEPENDENCY'}
              </div>
              <div
                style={{
                  ...labelStyle,
                  fontSize: 22,
                  fontWeight: 700,
                  color: colors.text.primary,
                }}
              >
                XZ Utils
              </div>
              <div
                style={{
                  ...typography.styles.sourceLabel,
                  fontSize: 11,
                  color: isPhase2 ? colors.danger.base : colors.text.dim,
                  marginTop: 4,
                }}
              >
                {isPhase2 ? 'UPSTREAM COMPROMISE' : 'liblzma.so // deep stack'}
              </div>
            </div>

            {/* Phase 1 Text: Deep inside the stack */}
            {phase1TextOpacity > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 670,
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  opacity: phase1TextOpacity,
                }}
              >
                <span
                  style={{
                    ...typography.styles.sceneTitle,
                    fontSize: 32,
                    fontWeight: 500,
                    color: colors.text.secondary,
                  }}
                >
                  A critical dependency can sit deep inside the stack.
                </span>
              </div>
            )}

            {/* Phase 2 Warning Card: CVE-2024-3094 & Affected Upstream Releases */}
            {warningTransition > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 660,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 820,
                  padding: '24px 32px',
                  borderRadius: 10,
                  background: 'rgba(18, 12, 24, 0.92)',
                  border: `1.5px solid ${colors.danger.border}`,
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7)',
                  textAlign: 'center',
                  opacity: warningTransition,
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: colors.danger.alert,
                      boxShadow: `0 0 10px ${colors.danger.glow}`,
                    }}
                  />
                  <span
                    style={{
                      ...typography.styles.codeBadge,
                      fontSize: 28,
                      color: colors.danger.alert,
                      fontWeight: 700,
                    }}
                  >
                    CVE-2024-3094
                  </span>
                </div>

                <div
                  style={{
                    ...typography.styles.sectionHeading,
                    fontSize: 24,
                    color: colors.text.primary,
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  Affected upstream releases: 5.6.0 and 5.6.1
                </div>

                <div
                  style={{
                    ...typography.styles.bodyMedium,
                    fontSize: 16,
                    color: colors.text.muted,
                  }}
                >
                  Targeted Linux distributions packaging vulnerable upstream tarballs
                </div>
              </div>
            )}
          </div>
        )}

        {/* Phase 2 Source Attribution */}
        {frame >= 90 && frame < 240 && (
          <SourceLabel
            sourceText="Source: XZ Utils upstream advisory and Red Hat CVE-2024-3094 advisory"
            opacity={interpolate(
              frame,
              [90, 105, 230, 240],
              [0, 1, 1, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )}
          />
        )}

        {/* ======================================================== */}
        {/* PHASE 3: Coordination Problem & Anonymous Org Nodes      */}
        {/* ======================================================== */}
        {phase3Opacity > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: phase3Opacity,
            }}
          >
            {/* Center Node: Affected Upstream Supply Chain */}
            <div
              style={{
                position: 'absolute',
                top: 480,
                left: 960,
                transform: 'translate(-50%, -50%)',
                padding: '20px 32px',
                borderRadius: 12,
                backgroundColor: 'rgba(20, 10, 18, 0.95)',
                border: `2px solid ${colors.danger.alert}`,
                boxShadow: `0 0 40px ${colors.danger.subtle}`,
                textAlign: 'center',
                zIndex: 20,
              }}
            >
              <div
                style={{
                  ...typography.styles.codeBadge,
                  fontSize: 13,
                  color: colors.danger.alert,
                }}
              >
                SUPPLY CHAIN VULNERABILITY
              </div>
              <div
                style={{
                  ...typography.styles.heroTitle,
                  fontSize: 26,
                  color: colors.text.primary,
                  marginTop: 4,
                }}
              >
                XZ Utils 5.6.0 / 5.6.1
              </div>
              <div
                style={{
                  ...typography.styles.sourceLabel,
                  fontSize: 12,
                  color: colors.text.dim,
                  marginTop: 4,
                }}
              >
                CVE-2024-3094 UPSTREAM SIGNAL
              </div>
            </div>

            {/* Radiating lines toward 4 anonymous organization nodes */}
            <svg
              width="1920"
              height="1080"
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            >
              {/* Center to Org 1 (Top Left) */}
              <line
                x1="860"
                y1="450"
                x2="480"
                y2="340"
                stroke={colors.border.subtle}
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
              {/* Center to Org 2 (Top Right) */}
              <line
                x1="1060"
                y1="450"
                x2="1440"
                y2="340"
                stroke={colors.border.subtle}
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
              {/* Center to Org 3 (Bottom Left) */}
              <line
                x1="880"
                y1="520"
                x2="520"
                y2="660"
                stroke={colors.border.subtle}
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
              {/* Center to Org 4 (Bottom Right) */}
              <line
                x1="1040"
                y1="520"
                x2="1400"
                y2="660"
                stroke={colors.border.subtle}
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />

              {/* Pulsing signal indicators along links */}
              <circle
                cx={interpolate(signalProgress, [0, 1], [860, 480])}
                cy={interpolate(signalProgress, [0, 1], [450, 340])}
                r="4"
                fill={colors.danger.alert}
                opacity={0.8}
              />
              <circle
                cx={interpolate(signalProgress, [0, 1], [1060, 1440])}
                cy={interpolate(signalProgress, [0, 1], [450, 340])}
                r="4"
                fill={colors.danger.alert}
                opacity={0.8}
              />
              <circle
                cx={interpolate(signalProgress, [0, 1], [880, 520])}
                cy={interpolate(signalProgress, [0, 1], [520, 660])}
                r="4"
                fill={colors.danger.alert}
                opacity={0.8}
              />
              <circle
                cx={interpolate(signalProgress, [0, 1], [1040, 1400])}
                cy={interpolate(signalProgress, [0, 1], [520, 660])}
                r="4"
                fill={colors.danger.alert}
                opacity={0.8}
              />
            </svg>

            {/* Anonymous Organization Nodes (Silhouettes / Abstract Badges) */}
            <div
              style={{
                position: 'absolute',
                top: 310,
                left: 360,
                ...orgCardStyle,
              }}
            >
              <div style={orgIconStyle}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L3 7V13C3 18 12 22 12 22C12 22 21 18 21 13V7L12 2Z"
                    stroke={colors.text.muted}
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              <div>
                <div style={orgTitleStyle}>Organization Alpha</div>
                <div style={orgStatusStyle}>Inventory: Hidden // Unknown Exposure</div>
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                top: 310,
                left: 1320,
                ...orgCardStyle,
              }}
            >
              <div style={orgIconStyle}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="16"
                    rx="2"
                    stroke={colors.text.muted}
                    strokeWidth="1.5"
                  />
                  <line
                    x1="3"
                    y1="10"
                    x2="21"
                    y2="10"
                    stroke={colors.text.muted}
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              <div>
                <div style={orgTitleStyle}>Organization Beta</div>
                <div style={orgStatusStyle}>Inventory: Hidden // Unknown Exposure</div>
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                top: 630,
                left: 400,
                ...orgCardStyle,
              }}
            >
              <div style={orgIconStyle}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <polygon
                    points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"
                    stroke={colors.text.muted}
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              <div>
                <div style={orgTitleStyle}>Organization Gamma</div>
                <div style={orgStatusStyle}>Inventory: Hidden // Unknown Exposure</div>
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                top: 630,
                left: 1280,
                ...orgCardStyle,
              }}
            >
              <div style={orgIconStyle}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke={colors.text.muted} strokeWidth="1.5" />
                </svg>
              </div>
              <div>
                <div style={orgTitleStyle}>Organization Delta</div>
                <div style={orgStatusStyle}>Inventory: Hidden // Unknown Exposure</div>
              </div>
            </div>

            {/* Questions Overlaid */}
            {q1Opacity > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 150,
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  opacity: q1Opacity,
                }}
              >
                <span
                  style={{
                    ...typography.styles.heroTitle,
                    fontSize: 42,
                    color: colors.text.primary,
                  }}
                >
                  Which organizations are exposed?
                </span>
              </div>
            )}

            {q2Opacity > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 150,
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  opacity: q2Opacity,
                }}
              >
                <span
                  style={{
                    ...typography.styles.heroTitle,
                    fontSize: 38,
                    color: colors.midnightCyan.base,
                    fontWeight: 600,
                  }}
                >
                  Can they answer without publishing their software inventory?
                </span>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* PHASE 4: Privacy Dilemma Split Choices                   */}
        {/* ======================================================== */}
        {phase4Opacity > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: phase4Opacity,
            }}
          >
            {/* Header Question */}
            <div
              style={{
                position: 'absolute',
                top: 140,
                left: 0,
                right: 0,
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  ...typography.styles.sourceLabel,
                  fontSize: 13,
                  color: colors.midnightCyan.base,
                  letterSpacing: '0.15em',
                }}
              >
                THE CLASSICAL COORDINATION TRADEOFF
              </span>
            </div>

            {/* Two Choices Container */}
            <div
              style={{
                position: 'absolute',
                top: 210,
                left: 160,
                right: 160,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 48,
              }}
            >
              {/* Left Choice: Disclose the inventory */}
              <div
                style={{
                  background: 'rgba(12, 18, 38, 0.88)',
                  border: `1.5px solid ${colors.danger.border}`,
                  borderRadius: 12,
                  padding: '48px 40px',
                  boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
                  transform: `translateY(${(1 - leftCardSpring) * 30}px)`,
                  opacity: leftCardSpring,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <span
                    style={{
                      ...typography.styles.codeBadge,
                      fontSize: 13,
                      padding: '4px 10px',
                      borderRadius: 4,
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: colors.danger.base,
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    PATH A
                  </span>
                  <span
                    style={{
                      ...typography.styles.sourceLabel,
                      fontSize: 12,
                      color: colors.text.dim,
                    }}
                  >
                    PUBLIC DISCLOSURE
                  </span>
                </div>

                <div
                  style={{
                    ...typography.styles.sceneTitle,
                    fontSize: 34,
                    color: colors.text.primary,
                    marginBottom: 16,
                  }}
                >
                  Disclose the inventory
                </div>

                <div
                  style={{
                    ...typography.styles.bodyLarge,
                    fontSize: 20,
                    color: colors.danger.base,
                    fontWeight: 500,
                    lineHeight: 1.4,
                  }}
                >
                  Improve coordination — reveal targeting information
                </div>

                <div
                  style={{
                    marginTop: 24,
                    paddingTop: 20,
                    borderTop: `1px solid ${colors.border.subtle}`,
                    ...typography.styles.bodyMedium,
                    fontSize: 15,
                    color: colors.text.muted,
                  }}
                >
                  Broadcasting detailed bills of materials tells adversaries
                  exactly which servers and endpoints run vulnerable packages.
                </div>
              </div>

              {/* Right Choice: Stay silent */}
              <div
                style={{
                  background: 'rgba(12, 18, 38, 0.88)',
                  border: `1.5px solid ${colors.border.violet}`,
                  borderRadius: 12,
                  padding: '48px 40px',
                  boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
                  transform: `translateY(${(1 - rightCardSpring) * 30}px)`,
                  opacity: rightCardSpring,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <span
                    style={{
                      ...typography.styles.codeBadge,
                      fontSize: 13,
                      padding: '4px 10px',
                      borderRadius: 4,
                      backgroundColor: 'rgba(121, 82, 245, 0.15)',
                      color: colors.midnightViolet.bright,
                      border: '1px solid rgba(121, 82, 245, 0.3)',
                    }}
                  >
                    PATH B
                  </span>
                  <span
                    style={{
                      ...typography.styles.sourceLabel,
                      fontSize: 12,
                      color: colors.text.dim,
                    }}
                  >
                    DEFENSIVE SILENCE
                  </span>
                </div>

                <div
                  style={{
                    ...typography.styles.sceneTitle,
                    fontSize: 34,
                    color: colors.text.primary,
                    marginBottom: 16,
                  }}
                >
                  Stay silent
                </div>

                <div
                  style={{
                    ...typography.styles.bodyLarge,
                    fontSize: 20,
                    color: colors.midnightViolet.bright,
                    fontWeight: 500,
                    lineHeight: 1.4,
                  }}
                >
                  Preserve privacy — weaken collective response
                </div>

                <div
                  style={{
                    marginTop: 24,
                    paddingTop: 20,
                    borderTop: `1px solid ${colors.border.subtle}`,
                    ...typography.styles.bodyMedium,
                    fontSize: 15,
                    color: colors.text.muted,
                  }}
                >
                  Keeping silent prevents adversarial reconnaissance, but leaves
                  national coordinators and ecosystem partners blind.
                </div>
              </div>
            </div>

            {/* Concluding Center Statement: Held through frame 600 */}
            {conclusionOpacity > 0 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 165,
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  opacity: conclusionOpacity,
                  transform: `translateY(${conclusionY}px)`,
                }}
              >
                <div
                  style={{
                    display: 'inline-block',
                    padding: '16px 40px',
                    borderRadius: 8,
                    background: 'rgba(6, 12, 30, 0.95)',
                    border: `1.5px solid ${colors.border.active}`,
                    boxShadow: `0 0 40px ${colors.midnightCyan.dim}`,
                  }}
                >
                  <span
                    style={{
                      ...typography.styles.heroTitle,
                      fontSize: 32,
                      fontWeight: 600,
                      color: colors.text.primary,
                    }}
                  >
                    Vulnerability coordination should not require this choice.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Synchronized Documented Captions */}
      <Caption segments={scene01Captions} bottom={75} />

      {/* Overlay Documentary Film Grain */}
      <FilmGrain opacity={0.032} />

      {/* Brand Mark and Production Guides */}
      <BrandMark />
      <TimelineGuide totalFrames={600} sceneName="SCENE 01 // PROBLEM DISCLOSURE" />
    </AbsoluteFill>
  );
};

// Reusable styling helpers
const nodeStyle: React.CSSProperties = {
  background: colors.bg.surface,
  border: `1px solid ${colors.graph.nodeBorder}`,
  borderRadius: 6,
  padding: '10px 20px',
  textAlign: 'center',
  zIndex: 10,
  minWidth: 160,
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
};

const badgeStyle: React.CSSProperties = {
  ...typography.styles.sourceLabel,
  fontSize: 10,
  color: colors.text.dim,
  letterSpacing: '0.08em',
};

const labelStyle: React.CSSProperties = {
  ...typography.styles.codeBadge,
  fontSize: 16,
  color: colors.graph.nodeText,
  marginTop: 4,
};

const orgCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '16px 24px',
  borderRadius: 8,
  background: 'rgba(10, 18, 42, 0.85)',
  border: `1px solid ${colors.border.subtle}`,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  zIndex: 15,
};

const orgIconStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 6,
  backgroundColor: 'rgba(255, 255, 255, 0.04)',
  border: `1px solid ${colors.border.subtle}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const orgTitleStyle: React.CSSProperties = {
  ...typography.styles.codeBadge,
  fontSize: 16,
  color: colors.text.primary,
};

const orgStatusStyle: React.CSSProperties = {
  ...typography.styles.sourceLabel,
  fontSize: 11,
  color: colors.text.dim,
  marginTop: 3,
};
