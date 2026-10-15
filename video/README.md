# CommonVeil Midnight Buildathon Demonstration Video

This directory contains the isolated Remotion production workspace for the official Midnight Buildathon demonstration video for **CommonVeil** — Confidential Software Supply Chain Vulnerability Coordination.

## Composition Specifications

- **Composition ID**: `CommonVeilBuildathonFilm`
- **Resolution**: 1920 × 1080 (Full HD, 16:9)
- **Frame Rate**: 30 fps
- **Target Final Duration**: 180 seconds (5400 frames)
- **Current Milestone**: Scene 01 — Polished Documentary Problem Opening (790 frames / 26.33 seconds; speech ends at 25.27s, ~1.06s final silent hold)
- **Visual Aesthetic**: Mature investigative documentary, authentic primary incident records including readable high-resolution crop from the original `oss-security` mailing list archive, large editorial typography, monochrome architectural layout on dark background (`#05070d`), zero artificial glassmorphism, zero neon glows, zero AI-slop graphics.
- **Audio Profile**: Mastered stereo broadcast mix adhering to EBU R128 / ITU BS.1770 standards: **−15.71 LUFS integrated** with **−1.51 dBTP maximum true peak**. Natural, un-sped male documentary narrator voice (`en-US-AndrewNeural`) over an originally synthesized sub-bass tension drone.

---

## Authoritative Incident Sources

All on-screen statements and headline treatments derive strictly from official, verified primary sources:

1. **CISA Alert (AA24-089A)**:
   - **Title**: *Reported Supply Chain Compromise Affecting XZ Utils (CVE-2024-3094)*
   - **Publisher**: Cybersecurity and Infrastructure Security Agency (CISA)
   - **Publication Date**: March 29, 2024
   - **URL**: `https://www.cisa.gov/news-events/alerts/2024/03/29/reported-supply-chain-compromise-affecting-xz-utils-cve-2024-3094`

2. **Official XZ Utils Project Upstream Advisory**:
   - **Title**: *XZ Utils backdoor — Information about the backdoor in XZ Utils versions 5.6.0 and 5.6.1*
   - **Publisher**: Tukaani Project / Lasse Collin (Upstream Maintainer)
   - **Publication Date**: March 29, 2024 (Updated March 30, 2024)
   - **URL**: `https://tukaani.org/xz-backdoor/`

3. **oss-security Public Disclosure (Authentic Primary Record Crop)**:
   - **Title**: *backdoor in upstream xz/liblzma leading to ssh server compromise*
   - **Reporter**: Andres Freund
   - **Date**: Fri, 29 Mar 2024 16:51:30 CEST
   - **Asset**: `public/evidence/oss-security-disclosure-crop.png` (authentic readable crop from archive)
   - **URL**: `https://www.openwall.com/lists/oss-security/2024/03/29/4`

4. **Red Hat Security Advisory (CVE-2024-3094)**:
   - **Title**: *Urgent security alert for Fedora 40 and Fedora Rawhide users regarding CVE-2024-3094*
   - **Publisher**: Red Hat Product Security (CVSS 10.0 Critical)
   - **Publication Date**: March 29, 2024
   - **URL**: `https://www.redhat.com/en/blog/urgent-security-alert-fedora-40-and-fedora-rawhide-users`

---

## Audio Mastering & Standards Compliance

The master video mix (`public/audio/master-mix-scene01.mp3`) is processed through a two-pass EBU R128 loudness normalizer:
- **Integrated Loudness**: −15.71 LUFS (target: −16.0 LUFS ±0.5 LU)
- **Maximum True Peak**: −1.51 dBTP (target: ≤ −1.5 dBTP)
- **Loudness Range (LRA)**: 5.8 LU
- **Sample Rate & Encoding**: 48,000 Hz, 320 kbps Stereo MP3 / AAC in container

---

## Scene 01 Sequence Breakdown (0:00–0:26.33 / 790 frames)

1. **0:00–0:02.0 (Frames 0–60) — Date Title Card**:
   - Stark black screen fading into clean, tracked editorial typography: `29 MARCH 2024` with quiet documentary tension.
2. **0:02.0–0:07.5 (Frames 60–225) — Primary Source Incident Records**:
   - Reconstructed CISA Alert `AA24-089A` and Tukaani Project maintainer notices alongside an authentic readable high-resolution crop of Andres Freund's `oss-security` mailing list archive.
3. **0:07.5–0:11.8 (Frames 225–354) — Visually Isolate Affected Releases**:
   - Clean isolation of upstream release packages `xz-5.6.0.tar.gz` and `xz-5.6.1.tar.gz`.
   - Caption synchronized to narration: *"were revealed to contain a backdoor."*
4. **0:11.8–0:16.2 (Frames 354–488) — The Coordination Problem**:
   - Editorial headline: `Which organizations were exposed?` with zero blank interval between sections.
5. **0:16.2–0:21.5 (Frames 488–645) — The Inventory Disclosure Risk**:
   - Editorial headline: `Answering could reveal their internal software inventory.`
6. **0:21.5–0:26.33 (Frames 645–790) — The Zero-Knowledge Pivot**:
   - The thesis statement: `What if exposure could be proven without revealing the inventory?` (holds cleanly for ~1.06s after narration finishes before cutting to Scene 02).

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
