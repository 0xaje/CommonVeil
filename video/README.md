# CommonVeil Midnight Buildathon Demonstration Video

This directory contains the isolated Remotion production workspace for the official Midnight Buildathon demonstration video for **CommonVeil** — Confidential Software Supply Chain Vulnerability Coordination.

## Composition Specifications

- **Composition ID**: `CommonVeilBuildathonFilm`
- **Resolution**: 1920 × 1080 (Full HD, 16:9)
- **Frame Rate**: 30 fps
- **Target Final Duration**: 180 seconds (5400 frames)
- **Current Milestone**: Scene 01 — The Opening Problem Story (600 frames / 20.0 seconds)
- **Visual Aesthetic**: Serious cybersecurity documentary, technically credible, restrained, near-black Midnight blue palette (`#040814`), with violet (`#7952f5`), cyan (`#00e5ff`), and restrained vulnerability warning accents.

---

## Directory Structure

```text
video/
├── package.json               # Isolated dependencies (Remotion + React)
├── tsconfig.json              # TypeScript config
├── remotion.config.ts         # Remotion engine configuration
├── README.md                  # Production documentation
├── public/                    # Static assets (no secrets or unverified data)
│   ├── audio/                 # Narration, ambient music, and sound design
│   ├── evidence/              # Public cryptographic and supply chain evidence
│   ├── fonts/                 # Embedded documentary typefaces
│   └── screenshots/           # Real UI and CLI verification captures
├── src/
│   ├── index.ts               # Remotion root registration
│   ├── Root.tsx               # Composition registry
│   ├── compositions/
│   │   └── CommonVeilFilm.tsx # Sequenced film composition
│   ├── scenes/
│   │   └── Scene01Problem.tsx # Scene 01: 0:00–0:20 problem disclosure
│   ├── components/
│   │   ├── BrandMark.tsx      # Restrained CommonVeil brand identity
│   │   ├── Caption.tsx        # High-contrast, title-safe subtitles
│   │   ├── FilmGrain.tsx      # Deterministic documentary texture
│   │   ├── SourceLabel.tsx    # Monospace attribution footers
│   │   └── TimelineGuide.tsx  # Production timecode & phase indicator
│   ├── design/
│   │   ├── colors.ts          # Midnight color palette & tokens
│   │   ├── typography.ts      # Typography tokens & styles
│   │   └── timing.ts          # FPS and phase timing constants
│   └── narration/
│       └── script.ts          # Locked narration transcript and timing
└── out/                       # Render output directory (ignored in git)
```

---

## Commands & Workflows

Run all commands from the `video/` directory:

```bash
cd video
```

### 1. Installation

To install dependencies with IPv4-first DNS resolution:

```bash
NODE_OPTIONS="--dns-result-order=ipv4first" npm install
```

### 2. Remotion Studio (Interactive Preview)

Launch Remotion Studio in your browser to inspect animations, inspect frames, and test composition timings:

```bash
npm run studio
# or: npm run preview
```

### 3. Scene 01 Standalone Preview / Render

To render only Scene 01 (frames 0 to 599):

```bash
npm run render:scene01
```

### 4. Draft Render (Low Resolution / Fast Turnaround)

Render a 50% scale draft for rapid review and team feedback:

```bash
npm run render:draft
```

Outputs to: `video/out/commonveil-draft.mp4`

### 5. Final Full HD Render

Render the full 1080p master video at 30 fps:

```bash
npm run render:final
```

Outputs to: `video/out/commonveil-final.mp4`

### 6. TypeScript Type-Checking

Validate all types without emitting files:

```bash
npm run typecheck
```

---

## Scene 01 Storyline (0:00–0:20)

1. **0:00–0:03 (Frames 0–90) — Hidden Dependency**:
   - Fade from black revealing a clean Linux dependency tree (`OpenSSH`, `systemd`, `package-mgmt`, `libsystemd`, `glibc`, `libarchive`).
   - Deep inside the stack sits `XZ Utils (liblzma)`.
   - On-screen text: *"A critical dependency can sit deep inside the stack."*

2. **0:03–0:08 (Frames 90–240) — Affected Releases**:
   - The XZ Utils node transitions into a restrained warning state.
   - Displays `CVE-2024-3094` and `Affected upstream releases: 5.6.0 and 5.6.1`.
   - Source footer: *Source: XZ Utils upstream advisory and Red Hat CVE-2024-3094 advisory*.

3. **0:08–0:14 (Frames 240–420) — Coordination Problem**:
   - Vulnerability signal propagates towards anonymous organization nodes.
   - Questions: *"Which organizations are exposed?"* followed by *"Can they answer without publishing their software inventory?"*
   - Organizations remain abstract institutional silhouettes.

4. **0:14–0:20 (Frames 420–600) — Privacy Dilemma**:
   - Split-screen comparison between:
     - Left: *Disclose the inventory* (Improve coordination — reveal targeting information)
     - Right: *Stay silent* (Preserve privacy — weaken collective response)
   - Concluding statement: *"Vulnerability coordination should not require this choice."*

---

## Asset Origin & Confidentiality Rules

To maintain absolute production security and integrity:

1. **No Secrets or Credentials**: Under no circumstances should private keys, mnemonic seeds, Blockfrost API keys, wallet files, or environment secrets be placed in `video/public` or anywhere in this repository.
2. **No Private Role Artifacts**: Sensitive inventory evidence or private proof packages must not be committed.
3. **No Copyrighted Media**: Do not include copyrighted news broadcasts, stock video, or commercial music tracks.
4. **No Fabricated Data**: All transaction IDs, CVE details, and protocol operations must correspond strictly to verified upstream facts or real Midnight testnet contract operations.
5. **Ignore Rendered Files**: All MP4 outputs in `out/` and temporary cache files in `.remotion/` are strictly ignored by `.gitignore` and must never be tracked by git.
