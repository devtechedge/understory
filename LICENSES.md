# Licences and provenance

Understory is a self-contained static application. All visible artwork is generated from
code in this repository: the vitrine, soil cutaway, plants, roots and mycelium, herbarium
cards, seed packets, icons, favicon and social card. No photographs, textures, map data or
stock imagery are bundled.

## Runtime dependencies

- React and React DOM: MIT, Meta Platforms.
- Fontsource font files, self-hosted in the build:
  - Bricolage Grotesque: SIL Open Font License 1.1, Mathieu Triay.
  - Literata: SIL Open Font License 1.1, TypeTogether.
  - Martian Mono: SIL Open Font License 1.1, Evil Martians.
- No other runtime dependencies. No network requests are made after the page loads.

## Build and test tooling (development only)

Vite, TypeScript, ESLint, Vitest and Playwright are used to build and verify the project.
Their licences are MIT or Apache 2.0 as published by their maintainers. They are not part
of the shipped application.

## Original work

The deterministic growth engine, care rules, journal voice, Canvas renderer, pressed
specimen illustrations and written content are original work, released under the MIT
licence in this repository.
