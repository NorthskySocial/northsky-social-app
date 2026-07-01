# Northsky brand module

This directory is the **owned, contained surface** for Northsky branding. 
The goal is to keep brand-specific values here
(in files upstream never touches) so that pulling in upstream changes stays
cheap. See the root `AGENTS.md` for the full fork model and sync strategy.

## What lives here

- `brand.json` - identity/meta values (app name, colors, OG/Twitter) as plain
  JSON, so `app.config.js` (CommonJS `require`) can read them without an interop
  step.
- `config.ts` - the `BRAND` object. It merges the `brand.json` identity with the
  runtime service/feed/embed URLs, which are declared here `as const` so their
  literal types are preserved (e.g. `typeof BSKY_SERVICE` stays narrow for
  upstream's ServerInput dialog). Import from `#/brand/config` in very-early
  modules (e.g. `src/lib/constants.ts`) and from `#/brand` elsewhere.
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
- A fully tokenized brand background ramp. The theme overrides the accent
  (`primary_500`) and the base background (`atoms.bg`), and on web the document
  background is synced to it (see App.web.tsx) so nothing flashes white below
  the fold. Secondary surfaces (`atoms.bg_contrast_25/50/...`, borders) still
  use the base ALF ramp; a fully brand-tinted ramp would redefine
  `palette.contrast_*` together and is a future design refinement.

## Deliberately NOT done

We do not recreate generic multi-brand abstraction. Those spread brand
awareness across the codebase and increase risk of bugs. Branding is direct and
asset-in-place instead.
