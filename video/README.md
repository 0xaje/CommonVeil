# CommonVeil Midnight Buildathon Demonstration Video

This directory contains the isolated Remotion production workspace for the official Midnight Buildathon demonstration video for **CommonVeil** — Confidential Software Supply Chain Vulnerability Coordination.

## Composition Specifications

- **Composition ID**: `CommonVeilBuildathonFilm`
- **Resolution**: 1920 × 1080 (Full HD, 16:9)
- **Frame Rate**: 30 fps
- **Target Final Duration**: 180 seconds (5400 frames)
- **Current Milestone**: Scene 01 — Documentary Problem Opening (840 frames / 28.0 seconds)
- **Visual Aesthetic**: Mature investigative documentary, authentic primary incident records, large editorial typography, monochrome architectural layout on dark background (`#05070d`), zero artificial glassmorphism, zero neon glows, zero AI-slop graphics.
- **Audio Profile**: Dual-stream master mix with a warm, natural male documentary voiceover (spoken at 100% natural, un-sped human cadence) over an originally synthesized sub-bass tension drone.

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

3. **oss-security Public Disclosure**:
   - **Title**: *backdoor in upstream xz/liblzma leading to ssh server compromise*
   - **Reporter**: Andres Freund
   - **Date**: Fri, 29 Mar 2024 16:51:30 CEST
   - **URL**: `https://www.openwall.com/lists/oss-security/2024/03/29/4`

4. **Red Hat Security Advisory (CVE-2024-3094)**:
   - **Title**: *Urgent security alert for Fedora 40 and Fedora Rawhide users regarding CVE-2024-3094*
   - **Publisher**: Red Hat Product Security (CVSS 10.0 Critical)
   - **Publication Date**: March 29, 2024
   - **URL**: `https://www.redhat.com/en/blog/urgent-security-alert-fedora-40-and-fedora-rawhide-users`

---

## Audio Assets, Origins & Licensing

The video output includes a dual-stream master audio mix:

1. **Narration Audio (`public/audio/narration-scene01.mp3`)**:
   - **Voice**: Natural male documentary voice (`en-US-AndrewNeural`), warm, authoritative, and conversational.
   - **Pacing**: Spoken at **100% natural, unhurried cadence with zero artificial speedup** across all four sentences.
   - **Exact Spoken Script**:
     *"On March 29, 2024, XZ Utils releases 5.6.0 and 5.6.1 were revealed to contain a backdoor. Response teams faced an urgent question: who was exposed? But answering publicly could reveal the exact software inside an organization. What if exposure could be proven without revealing the inventory?"*
   - **Licence**: Generated for demonstration and review via Microsoft Neural Voice services.

2. **Ambient Tension Music (`public/audio/ambient-tension.mp3`)**:
   - **Origin**: 100% originally synthesized 55 Hz fundamental / 110 Hz overtone sub-bass drone bed (low-pass filtered at 280 Hz to ensure narration remains prominently audible).
   - **Licence**: Dedicated to the Public Domain (CC0 / MIT). Completely free of third-party copyright restrictions.

---

## Scene 01 Sequence Breakdown (0:00–0:28 / 840 frames)

1. **0:00–0:02 (Frames 0–60) — Date Title Card**:
   - Stark black screen fading into clean, tracked editorial typography: `29 MARCH 2024` with quiet documentary tension.
2. **0:02–0:07.3 (Frames 60–220) — Primary Source Incident Records**:
   - Verbatim primary source headline cards: CISA Alert `CVE-2024-3094`, Tukaani Project upstream maintainer advisory (Lasse Collin), and oss-security mailing list disclosure by Andres Freund.
3. **0:07.3–0:12.0 (Frames 220–360) — Visually Isolate Affected Releases**:
   - Clean, architectural isolation of upstream release packages `xz-5.6.0.tar.gz` and `xz-5.6.1.tar.gz` with verified cryptographic metadata.
4. **0:12.0–0:16.5 (Frames 360–495) — The Coordination Problem**:
   - Editorial headline: `Which organizations were exposed?` with global Linux server context.
5. **0:16.5–0:21.8 (Frames 495–654) — The Inventory Disclosure Risk**:
   - Editorial headline: `Answering could reveal their internal software inventory.`
6. **0:21.8–0:28.0 (Frames 654–840) — The Zero-Knowledge Pivot**:
   - The thesis statement: `What if exposure could be proven without revealing the inventory?` (holds cleanly before cut to Scene 02).

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
