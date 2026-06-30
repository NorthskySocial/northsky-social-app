# Northsky brand module

This directory is the **owned, contained surface** for Northsky's customization
of `bluesky-social/social-app`. The goal is to keep brand-specific values here
(in files upstream never touches) so that pulling in upstream changes stays
cheap. See the root `AGENTS.md` for the full fork model and sync strategy.

## What lives here

- `brand.json` - the single source of truth for primitive brand values (app
  name, service/feed/embed URLs, colors, web meta). Plain JSON so it can be
  consumed by both `app.config.js` (CommonJS `require`) and the TypeScript
  runtime without an interop step.
- `config.ts` - typed re-export of `brand.json` as `BRAND`. Import from
  `#/brand/config` in very-early modules (e.g. `src/lib/constants.ts`) and from
  `#/brand` elsewhere.
- `theme.ts` - Northsky palette/atoms merged onto the ALF themes (added in the
  theme step).
- `index.ts` - the `#/brand` import surface.
- `assets/` - brand SVG components and brand-only images.

## How branding reaches the app

1. **Values** - `src/lib/constants.ts` reads brand URLs/feeds from `BRAND`, and
   `app.config.js` reads identity (`name`, `primaryColor`) from `brand.json`.
   Every such edit to an upstream file is marked with a `// northsky:` comment.
2. **Assets** - branding images are swapped **in place** at the paths upstream
   already imports (`assets/splash/*`, `assets/app-icons/*`,
   `assets/favicon.png`, `bskyweb/static/*`). No loader indirection.
3. **Theme** - injected through the existing `ThemeProvider` `themesOverride`
   prop, not by editing ALF internals.

## Re-applying after an upstream merge

Brand values are isolated here, so merges rarely conflict. If a merge does
conflict, the only affected upstream lines are the `// northsky:`-marked ones -
`grep -rn "northsky:" .` lists them all.

## Asset status

Branded and in place: the SVG logomark (`assets/Logo.tsx`, rendered by
`#/view/icons/Logo`), the web pre-React splash (`web/index.html`), the favicon
(`assets/favicon.png`), and the `bskyweb/static/*` web set (favicons,
apple-touch-icon, safari-pinned-tab, social cards).

Still needs design assets (left as upstream until provided - do NOT fabricate):

- Full-bleed native splash backgrounds `assets/splash/splash.png` and
  `splash-dark.png` (distinct light/dark - the original fork reused one icon for
  both, which is the bug we are avoiding).
- Native app-icon sets under `assets/app-icons/`.
- A Northsky wordmark to replace `#/view/icons/Logotype` (only a logomark
  exists today).

## Deliberately NOT done

We do not recreate indieapp's generic multi-brand abstraction
(`IndieAppSettings`), the dynamic logo/splash loaders (`logoLoader.ts`,
`splashAssets.ts`), or the `*.png?url` import scheme. Those spread brand
awareness across the codebase and carried a splash bug. Branding is direct and
asset-in-place instead.
