# AGENTS.md – Northsky Development Guide

This is the canonical guide for working in the Northsky app. It is a fork of
Bluesky's [social-app](https://github.com/bluesky-social/social-app), customized
for Northsky while staying close enough to upstream that pulling in upstream
changes stays cheap.

`CLAUDE.md` is a short pointer to this file so Claude Code and other tools still
load guidance from a single source of truth.

---

## 1. Fork model (read this first)

As Northsky is a fork of `social-app` that needs to be kept in sync, the overriding goal is to
keep upstream merges cheap. That shapes every decision:

> **Every line we change in an upstream file is a future merge conflict.**

So we follow four rules, in priority order:

1. **Isolate.** Put custom code in directories upstream never touches:
   - `src/brand/` – all Northsky branding/config (the one place to re-brand)
   - `src/lib/slingshot/` + `src/state/queries/slingshot.ts` – Slingshot/Constellation fallback
   - `src/features/*` – self-contained features (e.g. `src/features/customRecords/`)

   Additive files never conflict.
2. **Replace assets in place.** Brand images are swapped at the exact paths
   upstream already imports (`assets/splash/*`, `assets/app-icons/*`,
   `assets/favicon.png`, `bskyweb/static/*`). Same path + new bytes = no code
   diff = no conflict.
3. **Mark unavoidable upstream edits.** When an upstream file genuinely must
   change, keep the edit small and add a `// northsky:` comment so it is easy to
   find and re-apply. `grep -rn "northsky:" .` lists the entire custom surface.
4. **Prefer extension points over edits.** Use props/registries upstream already
   exposes (e.g. `ThemeProvider`'s `themesOverride`, the embed router's `unknown`
   branch) instead of editing internals.

### Where to put new customizations

- A new brand value → `src/brand/brand.json` (+ read it where needed).
- A new self-contained feature → `src/features/<name>/`.
- A new custom AT Protocol lexicon renderer → register it in
  `src/features/customRecords/` (see that directory's README). No edit to the
  embed pipeline is required.
- Only edit an upstream file when there is no extension point. Keep it minimal
  and mark it `// northsky:`.

---

## 2. Upstream sync strategy (without breaking open PRs)

Remotes: `upstream` → `bluesky-social/social-app`, `origin` → our Northsky fork.

Never merge upstream straight onto `main` — that yanks the base out from under
every open PR at once. Instead:

**Rule 1 — Sync through a branch + PR, never directly on `main`.**

```bash
git fetch upstream
git switch main && git pull --ff-only origin main
git switch -c sync/upstream-YYYY-MM-DD     # dated sync branch
git merge upstream/main                      # resolve conflicts here, not on main
pnpm install && pnpm typecheck && pnpm lint && pnpm test
git push -u origin sync/upstream-YYYY-MM-DD
# open a PR: "Sync upstream <date> (<upstream short-sha>)" -> review -> merge
```

Conflicts are confined to our `// northsky:`-marked files, so each sync PR is
small.

**Rule 2 — Merge, don't rebase; sync small + often.** Always `git merge`
upstream into the sync branch (never rebase `main` onto upstream — it rewrites
shared history). Sync on a regular cadence so each merge stays small.

**Rule 3 — After a sync lands, open PRs rebase onto the new `main`.**

```bash
git fetch origin
git switch my-feature
git rebase origin/main   # branches touching only owned dirs rebase conflict-free
```

**Rule 4 — Time big syncs around the PR queue.** For large upstream changes
(major version bumps, broad refactors), announce a short freeze, land/close
in-flight PRs, then sync, then have remaining branches rebase.

---

## 3. Commit format & test policy

**Fork vs upstream commits** are distinguished by **git ancestry**, not by a
message convention — the fork's own commits are exactly those in `main` but not
in `upstream/main`:

```bash
git log upstream/main..main          # every fork-only commit
git log upstream/main..main -- path  # fork commits touching a file
```

This is exact and zero-maintenance, and it's what the sync workflow relies on.
(To locate the customization *surface* inside files, use the `// northsky:`
**code** marker — that's separate from commit messages.)

**Commit format** — plain Conventional Commits:

```
<type>: <imperative, lower-case summary>

<body: the WHY — what this customizes and how it stays upstream-mergeable>
```

- `type` ∈ `feat | fix | refactor | chore | docs | test | build`.
- A `(northsky)` scope is an optional nicety for readability, not required — do
  not force a `northsky:` marker into messages (it's redundant with ancestry
  and makes contributing upstream harder).
- **Credit authors.** When porting work from the old fork, credit the original
  authors with `Co-Authored-By:` trailers.
- Open PRs against the `.github/pull_request_template.md` checklist.

**Before every commit, in order:**

1. **Add or adjust tests for the step's logic.** Code-bearing changes land with
   tests; pure asset/branding swaps are verified visually.
2. **Format:** `npx prettier --write .` (or the changed files).
3. **Gates green:** `pnpm typecheck && pnpm lint && pnpm prettier && pnpm test`
   (note `pnpm prettier` is `prettier --check .`). Never commit on red. A husky
   `lint-staged` pre-commit hook also runs eslint + prettier on staged files.

---

## 4. Northsky customizations (current)

| Area | Lives in | Upstream touch points (marked `// northsky:`) |
| --- | --- | --- |
| Brand identity/config | `src/brand/{brand.json,config.ts,index.ts}` | `src/lib/constants.ts`, `app.config.js` |
| Brand theme | `src/brand/theme.ts` | root `ThemeProvider` in `src/App.tsx`, `src/App.web.tsx` |
| Logo / web assets | `src/brand/assets/Logo.tsx`, `bskyembed/assets/logo.svg`, other in-place assets | `src/view/icons/Logo.tsx`, `web/index.html` |
| Splash logomark | (brand logo) | `src/Splash.tsx`, `src/Splash.web.tsx` |
| Pronouns | `src/screens/Profile/Header/pronouns.ts` | `EditProfileDialog.tsx`, `profile.ts`, `Handle.tsx`, `ThreadItemAnchor.tsx` |
| Slingshot/Constellation | `src/lib/slingshot/*`, `src/state/queries/slingshot.ts` | `Post/Embed/index.tsx`, `UserAvatar.tsx` |
| Custom lexicon rendering | `src/features/customRecords/*` | `Post/Embed/index.tsx` (`unknown` branch) |

### Anti-patterns (deliberately NOT done)

- No generic multi-brand `IndieAppSettings` abstraction — branding is direct and
  Northsky-specific.
- No dynamic logo/splash loaders (`logoLoader.ts`, `splashAssets.ts`) and no
  `*.png?url` import scheme. Brand the splash via the static `assets/splash/*` + `BrandLogo`.
- Full-bleed native splash backgrounds and full app-icon sets still need design
  assets; they are left as upstream until provided (do not fabricate).

---

## 5. Project overview

Cross-platform (iOS, Android, Web) social app built on React Native + Expo,
connecting to the AT Protocol.

**Tech stack:** React 19.1, React Native 0.81 + Expo 54, TypeScript 6, React
Navigation 7, TanStack Query, Lingui 5 for i18n, and the ALF design system.
Prefer the latest features of each library (exact versions in `package.json`),
e.g. `@lingui/react/macro` over `@lingui/react`.

### Essential commands

```bash
# Development
pnpm start              # Expo dev server
pnpm web                # web
pnpm android / pnpm ios # native

# Quality (always use these scripts, never the underlying tools)
pnpm test               # Jest
pnpm lint               # ESLint
pnpm typecheck          # TypeScript
pnpm prettier           # prettier --check .

# DO NOT run intl:extract / intl:compile — handled by a nightly CI job
```

Note: this repo pins pnpm 11.9.0 and node >=24.15.0 via `packageManager` /
`engines`. Use `corepack pnpm@11.9.0 ...` if the system pnpm is older, and
install with `--frozen-lockfile`.

### Project structure

```
src/
├── brand/        # Northsky branding/config (owned)
├── features/     # self-contained features (owned + upstream)
├── alf/          # ALF design system (themes, atoms, tokens)
├── components/   # shared UI components
├── screens/      # full-page screens (newer pattern; prefer here)
├── view/         # legacy screens/components (avoid adding new files)
├── state/        # queries, preferences, session, persisted
├── lib/          # utilities, constants, helpers (incl. slingshot/)
└── Navigation.tsx
```

New screens go in `/screens`, shared UI in `/components`, larger modules in
`/features`. Avoid adding to `/view`. Components are PascalCase; files and
directories are camelCase. Group platform-specific files in a directory
(`Component/index.tsx`, `index.web.tsx`, `index.native.tsx`) rather than
scattering `Component.web.tsx` siblings.

---

## 6. Styling (ALF)

Tailwind-inspired naming with underscores. Order styles: flex → spacing → text →
theme atoms → raw styles.

```tsx
import {atoms as a, useTheme} from '#/alf'

function MyComponent() {
  const t = useTheme()
  return (
    <View style={[a.flex_row, a.gap_md, a.p_lg, t.atoms.bg]}>
      <Text style={[a.text_md, a.font_bold, t.atoms.text_contrast_high]}>Hi</Text>
    </View>
  )
}
```

- Static atoms from `atoms` (theme-independent): `a.flex_row`, `a.p_md`, …
- Theme atoms from `useTheme()`: `t.atoms.bg`, `t.palette.primary_500`, …
- Platform utilities: `web()`, `native()`, `ios()`, `android()`, `platform()`.
- Breakpoints via `useBreakpoints()` (`gtPhone`, `gtMobile`, `gtTablet`).
- Sizes use t-shirt scale: `2xs xs sm md lg xl 2xl`.

Brand theme overrides live in `src/brand/theme.ts` and are injected via the ALF
`ThemeProvider` `themesOverride` prop — do not edit ALF internals to re-brand.

---

## 7. Component patterns

- Prefer fragment shorthand over `Fragment` unless a `key` is needed.
- Prefer `function` declarations for components; destructure props in params;
  prefer inline prop types; set sensible defaults.
- `Dialog`, `Menu`, `Button`, `Typography`, `TextField` live in `#/components`.
  Check `#/components` before creating a new component.
- Provide `label` for interactive elements and `testID` for E2E.
- Add the `emoji` prop to `<Text>` rendering user-generated content.

See `CLAUDE.md` history / upstream docs for the full component cookbook
(Dialog/Menu/Button/TextField examples) — those upstream conventions still
apply.

---

## 8. Internationalization

Wrap all user-facing strings with Lingui. Prefer `t` from
`@lingui/react/macro` (alias to `l` to avoid clashing with `const t = useTheme()`),
and `<Trans>` for JSX. Use `plural()` for counts. Prefer `i18n.date` over
`Intl.DateTimeFormat`. Add `comment`/`context` when a string is ambiguous.

```tsx
import {Trans, useLingui} from '@lingui/react/macro'
const {t: l} = useLingui()
const title = l`Settings`
```

---

## 9. State management

- **Server state:** TanStack Query. Co-locate query/mutation hooks; name keys
  with `createQueryKey`; use `STALE.*` constants; `useInfiniteQuery` for
  cursor-paginated APIs.
- **UI preferences:** React Context (`#/state/preferences`).
- **Session:** `useSession()` / `useAgent()` from `#/state/session`.

---

## 10. Platform-specific code & footguns

- Platform files resolve automatically — import normally (no `require()` /
  conditional imports). Runtime checks via `IS_WEB`/`IS_NATIVE`/`IS_IOS`/`IS_ANDROID`
  from `#/env`.
- **Dialog close callback (critical):** always use `control.close(() => …)` when
  navigating, opening another dialog/menu, or doing state updates after closing.
- Prefer `defaultValue` over `value` for `TextInput` (old architecture perf).
- **React Compiler is enabled** — do NOT add `useMemo`/`useCallback`
  proactively; only when a value feeds an effect dep array or a non-React lib
  needs referential stability.
- Some components are platform-split: `Dialog.Handle`/`Menu.ContainerItem`
  (native only), `Dialog.Close`/`Menu.Divider` (web only).
- Always use the `#/` import alias for absolute imports.

---

## 11. Comments & docs

Explain the "why," not the "what." Use docblock (`/** */`) for documented
declarations and `/* */` for multiline comments; reserve `//` for short
single-line notes. Avoid Unicode in comments (use `-`, not `—`). Larger
features/components may include a `README.md` and co-located tests
(`Component.test.tsx` or `__tests__/`).

---

## 12. Key files

| Purpose | Location |
| --- | --- |
| Brand config (source of truth) | `src/brand/brand.json`, `src/brand/config.ts` |
| Brand theme | `src/brand/theme.ts` |
| Upstream sync surface | anything containing `// northsky:` |
| Theme definitions | `src/alf/themes.ts` |
| Static atoms / tokens | `src/alf/atoms.ts`, `src/alf/tokens.ts` |
| Constants (service/feed URLs) | `src/lib/constants.ts` |
| Navigation / routes | `src/Navigation.tsx`, `src/routes.ts`, `src/lib/routes/types.ts` |
| Query hooks | `src/state/queries/*.ts` |
| Session state | `src/state/session/index.tsx` |
| i18n setup | `src/locale/i18n.ts` |
