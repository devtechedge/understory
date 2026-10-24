<h1 align="center">Understory</h1>

<p align="center">A living browser terrarium: a slow micro-forest of moss, fern and ghost fungus that you plant, tend and return to.</p>

<p align="center">
  <a href="https://understory-vert.vercel.app"><img src="https://img.shields.io/badge/Live%20Demo-Vercel-black?logo=vercel" alt="Live demo"></a>
  <a href="https://github.com/devtechedge/understory/actions/workflows/ci.yml"><img src="https://github.com/devtechedge/understory/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="https://vite.dev"><img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite 7"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.9"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green" alt="MIT license"></a>
</p>

---

## Live Demo

**https://understory-vert.vercel.app**

> **Status:** Runs entirely in your browser. No account, no server and no network requests after load. The vitrine is stored in this browser profile and catches up when you return.

![The grown vitrine: a glass case holding moss, a maidenhair fern and ghost fungus under a warm lamp, with the specimen shelf on the left and the field journal on the right.](docs/screenshots/02-vitrine-grown.webp)

---

## Screenshots

| Specimen card | Herbarium |
| --- | --- |
| <img src="docs/screenshots/03-specimen-card.webp" width="100%" alt="A herbarium card for a maidenhair fern laid over the vitrine."> | <img src="docs/screenshots/05-herbarium.webp" width="100%" alt="The herbarium dialog showing three seed packets."> |
| **Field journal** | **Mobile vitrine** |
| <img src="docs/screenshots/04-journal.webp" width="100%" alt="The field journal on a phone, with dated entries and pressed thumbnails."> | <img src="docs/screenshots/08-mobile-vitrine.webp" width="100%" alt="The vitrine on a 390 pixel phone, with the climate strip and bottom toolbar."> |

Captured at 1440x900 on desktop and 390x844 on mobile.

---

## Features

- Three species with distinct growth, light, moisture and temperature needs.
- Deterministic simulation with dormancy, recovery, moss spread, fern cuttings and ghost fungus spores.
- Care through light, moisture, a seven-day season cycle, pause and a six-hour time-lapse preview.
- A layered Canvas 2D diorama with a warm lamp room, daylight room, loupe, specimen cards and soil card.
- An automatic field journal and a herbarium that presses mature specimens.
- Seed-packet JSON export and import with bounded validation.
- IndexedDB persistence with a localStorage fallback and two-hour offline catch-up.
- Keyboard controls, focus-trapped dialogs, reduced motion, Still mode and mobile planting.

### The three species

| Species | Latin name | Habit | Care |
| --- | --- | --- | --- |
| Cushion Moss | *Leucobryum glaucum* | A slow green mound that widens into a carpet and can divide into a second patch. | Tolerates dry spells and low light. Keep the surface damp to encourage spread. |
| Maidenhair Fern | *Adiantum raddianum* | Wiry black stems and pale fan leaves. New croziers take longer as the plant matures. | Wants steady moisture and indirect light. A cut frond becomes a cutting. |
| Ghost Fungus | *Omphalotus nidiformis* | Pale caps with a mint glow. The mycelium spreads in the dark and fruits after damp nights. | Wants damp, shaded soil. Mature fruiting bodies release spores. |

### How care works

- Light follows the hour and the season. The room lamp is warm; the daylight theme changes the room, not the light inside the case.
- Moisture falls over time and rises when you mist. Dry soil slows growth and can push a specimen into dormancy. Care brings it back.
- Seasons turn every seven days and change daylight length, temperature and the palette. Winter is slow and dim. Summer is long and bright.
- Pruning a mature fern can leave a cutting in the vial. Plant it in a free spot to grow a new specimen.
- Returning after time away triggers catch-up, capped at two hours, followed by a journal entry that says what changed.

### Controls

| Action | Keyboard | Pointer |
| --- | --- | --- |
| Inspect, snip or mist | `1`, `2`, `3` | Choose a tool in the shelf |
| Read a specimen or the soil | `ArrowRight`, `ArrowLeft`, `Enter` on the vitrine | Click a plant or the soil |
| Plant a packet | Tab to the packet, then press its plant button | Drag a packet onto the case |
| Pause or resume | `Space` | Pause in the climate strip |
| Open the journal | `J` | Scroll to the journal |
| Immerse | `I` | Immerse in the masthead |
| Help | `?` | Help in the masthead |
| Close a dialog or leave immersion | `Escape` | Close button |

Still mode removes ambient motion. It turns on automatically when the browser asks for reduced motion.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Simulation | TypeScript 5.9, seeded PRNG, deterministic 10 second ticks |
| Interface | React 19, Vite 7, custom CSS |
| Rendering | Canvas 2D with cached backdrop, soil and layout |
| Persistence | IndexedDB primary, localStorage fallback, validated seed packets |
| Type | Bricolage Grotesque, Literata and Martian Mono, self-hosted through Fontsource |
| Hosting | Vercel production deployment with git auto-deploy |
| CI | GitHub Actions: quality, browser and audit jobs |

### Architecture

The simulation is a pure module. Care actions return a new world, and the same seed and care history produce the same result. Persistence reads and validates a saved world before React boots, then catches up offline time in bounded ticks. The interface renders the shell, dialogs and cards; Canvas 2D draws the vitrine from a cached backdrop and cached soil layer. Public copy lives in one content layer.

---

## Quick Start

You need Node 22.

```sh
nvm use
npm ci
npm run dev
```

The development server runs at http://127.0.0.1:5220. For the production bundle:

```sh
npm run build
npm run preview
```

The preview runs at http://127.0.0.1:4187.

---

## Testing

```sh
npm run typecheck
npm run lint
npm test
npm run e2e
npm audit --omit=dev --audit-level=high
```

`npm test` runs 52 Vitest checks across simulation, serialisation, time, species and preferences. `npm run e2e` builds the production bundle and runs 16 Chromium journeys at 1440x900, 390x844 and 320px, including axe-core accessibility checks on the vitrine, help, herbarium and mobile plant sheet.

The workflow splits quality, browser and audit jobs. CodeQL and dependency review guard changes. A daily production smoke job opens the live site and fails on console errors, external requests or missing security headers.

---

## Persistence and privacy

The vitrine lives in this browser profile. IndexedDB is used first, with a localStorage fallback when IndexedDB is unavailable. A seed packet is the only way to move a world between browsers, and you choose when to export or import it.

Seed packets contain the world, specimens, cuttings, pressed records, journal entries and simulation counters. They do not contain account details or personal data. Import is local: no upload, no server, no third party. Read [SECURITY.md](SECURITY.md) for the threat model.

---

## Verification

Measured on 24 October 2026 against the live deployment.

- Production Lighthouse desktop: 100 performance, 100 accessibility, 100 best practices, 100 SEO. LCP 0.4s, TBT 0ms, CLS 0.001.
- Production Lighthouse mobile, three runs: 98 performance on every run, 100 accessibility, 100 best practices, 100 SEO. LCP 2.0-2.1s, TBT 20-50ms, CLS 0-0.001.
- 52 unit tests and 16 browser journeys passing. Axe reports zero serious or critical findings on the four checked surfaces.
- `npm audit --omit=dev`: zero vulnerabilities.
- Production build: 100.85 KB JavaScript gzipped, 9.28 KB CSS gzipped, with three self-hosted Latin variable font subsets.
- Security headers live on Vercel: CSP, HSTS, nosniff, frame denial, referrer policy, permissions policy and cross-origin isolation headers.
- Vercel auto-deploy is git-connected. Every push to `main` creates a production deployment, and the live alias serves the latest commit.

CI status is the badge above. Workflow runs are public.

---

## Limits

- One vitrine per browser profile. There is no cloud sync.
- Seed packets use schema version 1. Older or unknown versions are rejected.
- The renderer targets 55fps on desktop and caps compact screens at 30fps. It uses Canvas 2D, not WebGL.
- There is no audio, no accounts and no social layer.
- The herbarium and journal are local. Clearing site data clears them.

---

## License

MIT. See [LICENSE](LICENSE) and [LICENSES.md](LICENSES.md) for asset provenance.

Bricolage Grotesque, Literata and Martian Mono are self-hosted through Fontsource under the SIL Open Font License. React is MIT licensed. Build tools are development dependencies only.

Bug reports and careful ideas are welcome through the issue templates. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.
