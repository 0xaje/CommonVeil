# CommonVeil Midnight Buildathon Demonstration Video

This directory contains the isolated Remotion production workspace for the official Midnight Buildathon demonstration video for **CommonVeil** — Confidential Software Supply Chain Vulnerability Coordination.

## Composition Specifications

- **Composition ID**: `CommonVeilBuildathonFilm`
- **Resolution**: 1920 × 1080 (Full HD, 16:9)
- **Frame Rate**: 30 fps
- **Target Final Duration**: 180 seconds (5400 frames)
- **Current Milestone**: Rebuilt Scene 01 — Documentary Problem Opening (600 frames / 20.0 seconds)
- **Visual Aesthetic**: Mature investigative documentary, large editorial typography, real authoritative incident evidence before abstraction, restrained Midnight navy palette (`#040814`), with violet (`#7952f5`), cyan (`#00e5ff`), and danger accents (`#ef4444`).
- **Audio Profile**: Contains mixed audio stream (spoken narration + low-frequency original documentary ambient drone).

---

## Authoritative Incident Sources

All on-screen statements and headline treatments derive strictly from official, verified primary sources:

1. **CISA Alert (AL24-089A)**:
   - **Title**: *Reported Supply Chain Compromise Affecting XZ Utils (CVE-2024-3094)*
   - **Publisher**: Cybersecurity and Infrastructure Security Agency (CISA)
   - **Publication Date**: March 29, 2024
   - **URL**: `https://www.cisa.gov/news-events/alerts/2024/03/29/reported-supply-chain-compromise-affecting-xz-utils-cve-2024-3094`

2. **Official XZ Utils Project Upstream Advisory**:
   - **Title**: *XZ Utils backdoor — Information about the backdoor in XZ Utils versions 5.6.0 and 5.6.1*
   - **Publisher**: Tukaani Project / Lasse Collin (Upstream Maintainer)
   - **Publication Date**: March 29, 2024 (Updated March 30, 2024)
   - **URL**: `https://tukaani.org/xz-backdoor/`

3. **Red Hat Security Advisory**:
   - **Title**: *Urgent security alert for Fedora 40 and Fedora Rawhide users regarding CVE-2024-3094*
   - **Publisher**: Red Hat Product Security
   - **Publication Date**: March 29, 2024
   - **Severity**: CVSS 10.0 (Critical)
   - **URL**: `https://www.redhat.com/en/blog/urgent-security-alert-fedora-40-and-fedora-rawhide-users`

4. **oss-security Public Disclosure**:
   - **Title**: *backdoor in upstream xz/liblzma leading to ssh server compromise*
   - **Reporter**: Andres Freund
   - **Date**: Fri, 29 Mar 2024 16:51:30 CEST
   - **URL**: `https://www.openwall.com/lists/oss-security/2024/03/29/4`

---

## Audio Assets, Origins & Licensing

The video output includes a dual-stream audio mix:

1. **Narration Audio (`public/audio/narration-scene01.mp3`)**:
   - **Text**: *"On March 29, 2024, XZ Utils releases 5.6.0 and 5.6.1 were revealed to contain a backdoor. Response teams faced an urgent question: who was exposed? But answering publicly could reveal the exact software inside an organization. What if exposure could be proven without revealing the inventory?"*
   - **Origin**: Synthesized using Google Text-to-Speech (`gTTS` 2.5.4, English UK dialect) and time-aligned with `ffmpeg` `atempo` processing to synchronize with each editorial phase.
   - **Licence**: Open source tool / original synthetic voice generation for demonstration and review.

2. **Ambient Tension Drone (`public/audio/ambient-tension.mp3`)**:
   - **Origin**: 100% originally synthesized mathematical drone created via FFmpeg multi-sine wave generation (55 Hz fundamental + 110 Hz overtone, low-pass filtered at 280 Hz to prevent voice clash, with subtle amplitude modulation).
   - **Licence**: Dedicated to the Public Domain (CC0 / MIT). Completely free of external copyright or commercial sample restrictions.

---

## Scene 01 Sequence Breakdown (0:00–0:20)

1. **0:00–0:02 (Frames 0–60) — Date Opening**:
   - Black screen fading in with stark, spaced editorial typography: `29 MARCH 2024`.
2. **0:02–0:07 (Frames 60–210) — Authentic Advisory Headline Montage**:
   - Real, attributed incident cards: CISA Alert `CVE-2024-3094`, Tukaani Project upstream disclosure by Lasse Collin, and Red Hat Product Security critical advisory.
3. **0:07–0:11 (Frames 210–330) — Visually Isolate Affected Releases**:
   - Massive editorial isolation of releases `5.6.0` & `5.6.1` with upstream release attribution.
4. **0:11–0:15 (Frames 330–450) — The Coordination Problem**:
   - Large editorial headline: `Which organizations were exposed?` with context on global Linux server compromise.
5. **0:15–0:18 (Frames 450–540) — The Inventory Disclosure Risk**:
   - Large editorial headline: `Answering could reveal their internal software inventory.`
6. **0:18–0:20 (Frames 540–600) — The Zero-Knowledge Pivot**:
   - Core thesis statement: `What if exposure could be proven without revealing the inventory?` (holds through frame 600 into Scene 02).

---

## Commands & Workflows

From `video/`:

```bash
# Type-check the Remotion workspace
npm run typecheck

# Launch Remotion Studio for interactive browser preview
npm run studio

# Render 540p draft (with audio stream)
npm run render:draft

# Render 1080p final master (with audio stream)
npm run render:final
```
