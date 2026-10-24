# Security policy

Understory runs entirely in the browser. It has no server, no accounts, no
analytics, and no runtime network requests. The live site is a static Vite
build on Vercel.

## Supported versions

Security fixes land on `main` and in the latest release. Older snapshots are
not maintained.

| Version | Supported |
| --- | --- |
| 1.x | Yes |
| Earlier | No |

## Reporting a vulnerability

Use GitHub private vulnerability reporting on this repository: open the
Security tab, choose Advisories, then Report a vulnerability. Do not open a
public issue for a suspected vulnerability. Include the affected version,
reproduction steps, impact, and any proof of concept.

You can expect an acknowledgement within seven days. Confirmed issues are
fixed on `main`, released, and credited in the advisory unless you ask to stay
anonymous.

## Threat model

The product stores a world in IndexedDB, falls back to localStorage, and
accepts a JSON seed packet through a file input. The relevant threats are:

- Untrusted seed-packet JSON. Parsing is bounded and validated: size limits,
  schema checks, numeric clamping, identifier sanitising, control-character
  stripping, collection caps, and a version check. It never evaluates code and
  never writes to the DOM as HTML. A rejected packet must produce a visible
  error, not a crash.
- Cross-site scripting through imported text. Journal notes, specimen notes,
  and imported strings are rendered as React text nodes. They are never
  injected with `innerHTML` or `eval`.
- Storage tampering. A user can edit IndexedDB or localStorage. This can only
  corrupt that user's own vitrine. Invalid data is rejected or clamped during
  boot.
- Dependency compromise. Runtime dependencies are limited to React and three
  self-hosted font families. Dependabot, dependency review, CodeQL, and
  `npm audit` watch the supply chain.
- Deployment drift. The production build is generated from `main` and served
  with restrictive headers. Source maps are not published.

## Non-goals

- Accounts, cloud sync, or cross-device transfer.
- Server-side data processing or telemetry.
- Protecting a user from someone who already controls their browser profile.
- Preventing a user from exporting their own world.

## Safe defaults

No secrets belong in this repository. Local `.env` files and Vercel metadata
are ignored. The app does not read environment variables at runtime.
