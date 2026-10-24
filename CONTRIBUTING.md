# Contributing

Understory is a small, deliberately local product. Contributions are welcome
when they preserve that character.

## Setup

```sh
nvm use
npm ci
npm run dev
```

The dev server runs at http://127.0.0.1:5220. The production preview runs at
http://127.0.0.1:4187 with `npm run build && npm run preview`.

## Checks

Run the same gates as CI before opening a pull request:

```sh
npm run typecheck
npm run lint
npm test
npm run e2e
npm audit --omit=dev --audit-level=high
```

`npm run e2e` builds the production bundle and drives Chromium at desktop and
mobile widths. Accessibility checks use axe-core and must report no serious or
critical findings.

## Principles

- No runtime network requests, accounts, analytics, or backend.
- No external images or audio. Artwork is drawn in Canvas 2D.
- The simulation stays deterministic for a given seed and care history.
- Seed packets remain version 1 compatible. New fields need a migration plan.
- Public copy avoids em dashes, exclamation marks, AI disclosure, and claims
  that cannot be verified.
- Keep the visual identity: dark walnut, warm lamp, editorial paper, glass
  vitrine, moss, fern, ghost fungus.
- Accessibility and mobile behaviour are release blockers.

## Commits

Use conventional prefixes: `feat:`, `fix:`, `perf:`, `test:`, `docs:`,
`ci:`, `chore:`. Keep each commit coherent and buildable.

## Reporting

Security issues go through the private route in [SECURITY.md](SECURITY.md).
Product bugs and careful feature ideas use the issue templates.
