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
- `palette.ts` - the three complete ALF `Palette` objects (light/dark/dim) that
  define the full Northsky color system: purple (`#9A45EC`) accent in light,
  mint (`#2AFFBA`) in dark, a distinct softer dim, ink-purple (`#1F0B35`) darks,
  and periwinkle-tinted light grays.
- `theme.ts` - builds the `light`/`dark`/`dim` themes from those palettes with
  ALF's `createTheme` (not upstream's `createThemes`, which would force
  `dark = invertPalette(light)` and so could not express purple-light /
  mint-dark), post-processes the shadow atoms to the brand shadow language
  (ink-tinted in light, deeper black in dark/dim), and exports `brandThemes`.
- `gradients.ts` - the Northsky gradient spectrum (signature magenta->mint plus
  brand-tinted variants), same shape/keys as upstream so gradient consumers are
  unchanged.
- `fonts.ts` - the brand font wiring. Geist body (variable woff2 for iOS/web,
  static TTF cuts for Android via `GEIST_ANDROID_MAP`) replaces Inter, and
  MuseoModerno italic display opts in through the `NS_DISPLAY_FONT` sentinel that
  `src/alf/fonts.ts` intercepts and resolves via `applyDisplayFont` (so the
  display family survives theme-mode `fontFamily` normalization).
- `typography.tsx` - `DisplayText`, the brand display component (MuseoModerno
  italic 600, `a.text_3xl` default) for hero surfaces (onboarding titles,
  splash/sign-in headlines). A thin wrapper over upstream's `Text` that stamps
  the `NS_DISPLAY_FONT` sentinel; exported from `index.ts`.
- `index.ts` - the `#/brand` import surface.
- `assets/` - brand SVG components and brand-only images.

## How branding reaches the app

1. **Values** - `src/lib/constants.ts` reads brand URLs/feeds from `BRAND`, and
   `app.config.js` reads identity (`name`, `primaryColor`) from `brand.json`.
   Every such edit to an upstream file is marked with a `// northsky:` comment.
2. **Assets** - branding images are swapped **in place** at the paths upstream
   already imports (`assets/splash/*`, `assets/app-icons/*`,
   `assets/favicon.png`, `bskyweb/static/*`). No loader indirection.
3. **Theme** - `src/alf/themes.ts` is re-pointed (one `// northsky:` edit) at
   `brandThemes`, so every consumer of `#/alf/themes` - ALF, the legacy
   `usePalette` files (`src/lib/themes.ts`), and the theme-color meta tag - picks
   up the brand palettes, not just the ALF provider. `App.web.tsx` also syncs the
   web document background by reading `brandThemes` directly (so a non-white brand
   background does not show through below the fold). Gradients are re-pointed the
   same way in `src/alf/tokens.ts`.

## Re-applying after an upstream merge

Brand values are isolated here, so merges rarely conflict. If a merge does
conflict, the only affected upstream lines are the `// northsky:`-marked ones -
`grep -rn "northsky:" .` lists them all.

## Asset status

Branded and in place: the full three-mode color system (`palette.ts` ->
`theme.ts`, re-pointed in `src/alf/themes.ts`) covering the entire
`contrast_*`/`primary_*` ramps, the brand gradients (`gradients.ts`), the brand
fonts (Geist body + MuseoModerno italic display replacing Inter, wired in
`fonts.ts`/`typography.tsx` with the web `@font-face` blocks in `web/index.html`
and `bskyweb/templates/base.html`), the SVG logomark (`assets/Logo.tsx`,
rendered by `#/view/icons/Logo`), the web pre-React splash (`web/index.html` and
`bskyweb/templates/base.html`), the favicon (`assets/favicon.png`), and the
`bskyweb/static/*` web set (favicons, apple-touch-icon, safari-pinned-tab,
social cards).

Still needs design assets (left as upstream until provided - do NOT fabricate):

- Full-bleed native splash backgrounds `assets/splash/splash.png` and
  `splash-dark.png` (distinct light/dark - the original fork reused one icon for
  both, which is the bug we are avoiding).
- Native app-icon sets under `assets/app-icons/`.
- A Northsky wordmark to replace `#/view/icons/Logotype` (only a logomark
  exists today).

## Deliberately NOT done

We do not recreate generic multi-brand abstraction. Those spread brand
awareness across the codebase and increase risk of bugs. Branding is direct and
asset-in-place instead.
