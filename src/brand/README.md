# Northsky brand module

Home for all the branding, kept out of files upstream touches so
upstream sync don't turn into a nightmare.

## Files

- `brand.json` - identity/meta values (name, colors, OG/Twitter), plain JSON
  so `app.config.js` (CommonJS) can `require` it directly.
- `config.ts` - `BRAND`: `brand.json` merged with service/feed/embed URLs,
  declared `as const` to keep literal types (e.g. for upstream's ServerInput
  dialog). Import from `#/brand/config` in early modules like
  `src/lib/constants.ts`, otherwise from `#/brand`.
- `palette.ts` - the three ALF `Palette` objects (light/dark/dim): purple
  accent in light, mint in dark, a distinct softer dim.
- `theme.ts` - builds `light`/`dark`/`dim` via ALF's `createTheme` (not
  `createThemes`, which forces `dark = invertPalette(light)`), then
  re-tints shadows to the brand shadow language. Exports `brandThemes`.
- `gradients.ts` - the Northsky gradient spectrum, same shape/keys as
  upstream so consumers need no changes.
- `fonts.ts` - Geist replaces Inter; MuseoModerno italic display opts in via
  the `NS_DISPLAY_FONT` sentinel that `src/alf/fonts.ts` resolves.
- `typography.tsx` - `DisplayText`, the brand display component.
- `index.ts` - the `#/brand` import surface.
- `assets/` - brand SVGs and brand-only images.

## How branding reaches the app

1. **Values** - `src/lib/constants.ts` reads URLs/feeds from `BRAND`;
   `app.config.js` reads identity from `brand.json`. Every upstream edit is
   marked `// northsky:`.
2. **Assets** - swapped in place at the paths upstream already imports
   (`assets/splash/*`, `assets/app-icons/*`, `assets/favicon.png`,
   `bskyweb/static/*`). No loader indirection.
3. **Theme** - `src/alf/themes.ts` re-points at `brandThemes` (one
   `// northsky:` edit), covering ALF, the legacy `usePalette` files, and the
   theme-color meta tag. Gradients are re-pointed the same way in
   `src/alf/tokens.ts`.

## Re-applying after an upstream merge

Conflicts should be rare since brand values live here. If one happens, `grep -rn
"northsky:" .` lists every affected upstream line.

## Asset status

Still needs design assets (left as upstream - do not fabricate):

- Native splash backgrounds `assets/splash/splash.png` / `splash-dark.png`
  (need distinct light/dark art).
- Native app-icon sets under `assets/app-icons/`.
- A Northsky wordmark (`#/view/icons/Logotype`) - only a logomark exists.
