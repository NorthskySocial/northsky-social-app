<<<<<<< HEAD
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

| Area                                                           | Lives in                                                | Upstream touch points (marked `// northsky:`)                                                                                   |
| ----------------------------------------------------------------| ---------------------------------------------------------| ---------------------------------------------------------------------------------------------------------------------------------|
| Brand identity/config                                          | `src/brand/{brand.json,config.ts,index.ts}`             | `src/lib/constants.ts`, `app.config.js`                                                                                         |
| Brand theme                                                    | `src/brand/theme.ts`                                    | root `ThemeProvider` in `src/App.tsx`, `src/App.web.tsx`                                                                        |
| Logo / web assets                                              | `src/brand/assets/Logo.tsx`, in-place assets            | `src/view/icons/Logo.tsx`, `web/index.html`                                                                                     |
| Embed service branding                                         | `bskyembed/src/brand.ts`, `bskyembed/assets/logo.svg`   | `bskyembed/{index.html,post.html,snippet/embed.ts}`, `bskyembed/src/{components/post.tsx,screens/landing.tsx,screens/post.tsx}` |
| Splash logomark                                                | (brand logo)                                            | `src/Splash.tsx`, `src/Splash.web.tsx`                                                                                          |
| Pronouns                                                       | `src/screens/Profile/Header/pronouns.ts`                | `EditProfileDialog.tsx`, `profile.ts`, `Handle.tsx`, `ThreadItemAnchor.tsx`                                                     |
| Slingshot/Constellation                                        | `src/lib/slingshot/*`, `src/state/queries/slingshot.ts` | `Post/Embed/index.tsx`, `UserAvatar.tsx`                                                                                        |
| Custom lexicon rendering                                       | `src/features/customRecords/*`                          | `Post/Embed/index.tsx` (`unknown` branch)                                                                                       |
| Host-aware takedown/appeal routing                             | `src/brand/moderation.ts`                               | `src/screens/Takendown.tsx`                                                                                                     |
| App labelers: Northsky moderation on, regional authorities off | `src/brand/moderation.ts` (`APP_LABELER_DIDS`)          | `src/state/session/moderation.ts`                                                                                               |
| Northsky label refinement in reports                           | `src/features/northskyReportLabels/*`                   | `ReportDialog/{index.tsx,action.ts}`                                                                                            |

#### App labelers grant server-side redaction

`APP_LABELER_DIDS` is not just a report-target list. The SDK emits every app
labeler in the `atproto-accept-labelers` header with a `;redact` flag, and the
appview honours that flag during hydration: `!takedown` and `!suspend` from a
redacting labeler mark content as taken down, and `needs-review` and
`impersonation` are actioned server-side. Content is removed before it reaches
the client rather than being filtered in the app.

That authority is the point — Northsky moderation is meant to be able to take
content down for every user of the app, including users on other PDS hosts.
A labeler the user merely subscribes to has no such power. So treat adding a
DID to `APP_LABELER_DIDS` as granting takedown authority over the whole app,
and keep the list to services Northsky itself operates.

App labelers are also always on: users cannot unsubscribe from them, and
`isAppLabeler` reports them as subscribed without a preference entry.

#### Report reasons are an enum; Northsky labels are not

`createReport` takes a `reasonType` from a fixed lexicon enum. Northsky's own
label values (`ableism`, `transphobia`, ...) are not valid reason types and
cannot be added as report options. `src/features/northskyReportLabels/` maps
each label onto a reason type Northsky declares, and sends the chosen label two
ways: at the head of the report comment, which Ozone shows to moderators, and as
`modTool.meta.label`, which `queryEvents` can filter but the Ozone UI does not
display. Widening report coverage is a change to the Ozone service
record, not to this app.

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

Note: this repo pins pnpm 11.21.0 and node >=24.19.0 via `devEngines` /
`engines`. Use `corepack pnpm@11.21.0 ...` if the system pnpm is older, and
install with `--frozen-lockfile`. On an older node, `npx` refuses to run at
all; call the binary in `node_modules/.bin/` instead.

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
=======
# AGENTS.md – Bluesky Social App Development Guide

This document provides guidance for working effectively in the Bluesky Social app codebase.

## Project Overview

Bluesky Social is a cross-platform social media application built with React Native and Expo. It runs on iOS, Android, and Web, connecting to the AT Protocol (atproto) decentralized social network.

**Tech Stack:**

- React 19.2
- React Native 0.86 with Expo 57
- TypeScript 7
- React Navigation 7 for routing
- TanStack Query (React Query) for data fetching
- Lingui 5 for internationalization
- Custom design system called ALF (Application Layout Framework)

Prefer using the latest features available for each of these libraries (exact versions are found in `package.json`). For example, prefer `@lingui/react/macro` over `@lingui/react`. Suggest refactoring legacy or deprecated uses.

## Essential Commands

```bash
# Development
pnpm start              # Start Expo dev server
pnpm web                # Start web version
pnpm android            # Run on Android
pnpm ios                # Run on iOS

# Testing & Quality
# IMPORTANT: Always use these pnpm scripts, never call the underlying tools directly
pnpm test               # Run Jest tests
pnpm lint               # Run Oxlint
pnpm typecheck          # Run TypeScript type checking
pnpm prettier           # Run Prettier for code formatting

# Internationalization
# DO NOT run these commands - extraction and compilation are handled by CI
pnpm intl:extract       # Extract translation strings (nightly CI job)
pnpm intl:compile       # Compile translations for runtime (nightly CI job)

# Build
pnpm build-web          # Build web version
pnpm prebuild           # Generate native projects
```

## Project Structure

```
src/
├── alf/                    # Design system (ALF) - themes, atoms, tokens
├── components/             # Shared UI components (Button, Dialog, Menu, etc.)
├── screens/                # Full-page screen components (newer pattern)
├── features/               # Macro-features that bridge components/screens
├── view/
│   ├── screens/            # Full-page screens (legacy location)
│   ├── com/                # Reusable view components
│   └── shell/              # App shell (navigation bars, tabs)
├── state/
│   ├── queries/            # TanStack Query hooks
│   ├── preferences/        # User preferences (React Context)
│   ├── session/            # Authentication state
│   └── persisted/          # Persistent storage layer
├── lib/                    # Utilities, constants, helpers
├── locale/                 # i18n configuration and language files
└── Navigation.tsx          # Main navigation configuration
```

### Project Structure in Depth

When building new things, follow these guidelines for where to put code.

#### Components vs Screens vs Features

**Components** are reusable UI elements that are not full screens. Should be
platform-agnostic when possible. Examples: Button, Dialog, Menu, TextField. Put
these in `/components` if they are shared across screens.

**Screens** are full-page components that represent a route in the app. They
often contain multiple components and handle layout for a page. New screens
should go in `/screens` (not `/view/screens`) to encourage better organization
and separation from legacy code.

For complex screens that have specific components or data needs that _are not
shared by other screens_, we encourage subdirectories within `/screens/<name>`
e.g. `/screens/ProfileScreen/ProfileScreen.tsx` and
`/screens/ProfileScreen/components/`.

**Features** are higher-level modules that may include context, data fetching,
components, and utilities related to a specific feature e.g.
`/features/liveNow`. They don't neatly fit into components or screens and often
span multiple screens. This is an optional pattern for organizing complex
features.

#### Legacy Directories

For the most part, avoid writing new files into the `/view` directory and
subdirectories. This is the older pattern for organizing screens and components,
and it has become a bit disorganized over time. New development should go into
`/screens`, `/components`, and `/features`.

#### State

The `/state` directory is where we've historically put all our data fetching and
state management logic. This is perfectly fine, but for new features, consider
organizing state logic closer to the components that use it, either within a
feature directory or co-located with a screen. The key is to keep related code
together and avoid having "god files" with too much unrelated logic.

#### Lib

The `/lib` directory is for utilities and helpers that don't fit into other
categories. This can include things like API clients, formatting functions,
constants, and other shared logic.

#### Top Level Directories

Avoid writing new top-level subdirectories within `/src`. We've done this for a
few things in the past that, but we have stronger patterns now. Examples:
`/logger` should probably have been written into `/lib`. And `ageAssurance` is
better classified within `/features`. We will probably migrate these things
eventually.

### File and Directory Naming Conventions

Typically JS style for variables, functions, etc. We use ProudCamelCase for
components, and camelCase directories and files.

For "macro" cases in `/features`, `/screens`, or `/components`, co-locate related
code in a directory with an `index.tsx` main component plus sibling
components/hooks/utils (e.g. `screens/ProfileScreen/index.tsx` +
`screens/ProfileScreen/components/`). Keep related code together so it lives where
someone would look for it. Don't overdo it: a component that fits in one file
should just be `Component.tsx`, not `Component/index.tsx`.

Platform-specific files are covered under "Platform-Specific Code" below.

### Comments

Comment code when necessary to explain the “why” behind something; avoid
comments that simply describe the code. Avoid Unicode characters in comments,
e.g., use `-` not `—`.

Always use docblock (`/** */`) syntax for comments that document a type, type
member, method, function, or variable. These are the comments a reader expects
to find attached to a named declaration, and the docblock form makes that intent
clear and surfaces nicely in editor tooltips.

```tsx
type DateFieldProps = {
  /**
   * An empty string renders the placeholder and opens the picker at today (or
   * maximumDate, if earlier).
   */
  value: string | Date
}

/**
 * Date-only input. Accepts a string in the format YYYY-MM-DD, or a Date object.
 */
export function DateField() {}
```

More generally, any multiline comment should use the `/* */` block syntax rather
than stacked `//` lines. Reserve `//` for short, single-line comments.

```tsx
/*
 * The picker requires a valid date, so when value is empty we fall back to
 * maximumDate (if set) or today.
 */
const fallbackDate = maximumDate ? toSimpleDateString(maximumDate) : today
```

### Documentation and Tests Within Features

For larger features or components, co-locate documentation and tests with the
code. A `README.md` in the directory (the `/Component/index.tsx` pattern lends
itself well to this) can document the whole feature, and feature-specific tests
belong alongside it as `Component.test.tsx` or in a `__tests__/` subdirectory.
Both are optional.

## Styling System (ALF)

ALF is the custom design system. Tailwind-inspired naming with underscores
instead of hyphens. Static atoms (`atoms as a`) are theme-independent; theme
atoms/palette come from `useTheme()` (`t.atoms.bg`, `t.palette.primary_500`).
Style props take an array of atoms + theme atoms + raw styles.

Order atoms by: flexbox (`a.flex_row`), spacing (`a.px_md`), text (`a.font_bold`),
themes (`t.atoms.text`), then raw styles (`{backgroundColor: t.palette.primary_500}`).
>>>>>>> upstream/main

```tsx
import {atoms as a, useTheme} from '#/alf'

<<<<<<< HEAD
function MyComponent() {
  const t = useTheme()
  return (
    <View style={[a.flex_row, a.gap_md, a.p_lg, t.atoms.bg]}>
      <Text style={[a.text_md, a.font_bold, t.atoms.text_contrast_high]}>Hi</Text>
    </View>
=======
const t = useTheme()
<View style={[a.flex_row, a.gap_md, a.p_lg, t.atoms.bg]} />
```

### Key Concepts

Static atoms live in `a.*` (e.g. `a.flex_row`, `a.p_md`, `a.rounded_md`,
`a.text_lg`). Theme atoms/palette come from `useTheme()` (`t.atoms.bg`,
`t.atoms.text`, `t.atoms.border_contrast_low`, `t.palette.primary_500`).

**Platform utilities** (`import {web, native, ios, android, platform} from '#/alf'`)
return conditional styles inline in a style array: `web({cursor: 'pointer'})`,
`native({paddingBottom: 20})`, `platform({ios: {...}, android: {...}, web: {...}})`.

**Breakpoints:** `const {gtPhone, gtMobile, gtTablet} = useBreakpoints()` from `#/alf`.

### Naming Conventions

- Spacing: `2xs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl` (t-shirt sizes)
- Text: `text_xs`, `text_sm`, `text_md`, `text_lg`, `text_xl`
- Gaps/Padding: `gap_sm`, `p_md`, `px_lg`, `py_xl`
- Flex: `flex_row`, `flex_1`, `align_center`, `justify_between`
- Borders: `border`, `border_t`, `rounded_md`, `rounded_full`

## Component Patterns

- Prefer fragment shorthand over `Fragment` unless a `key` is needed.
- Prefer functions over arrow functions for component declarations.
- Prefer prop destructuring via parameters over a const within the component.
- Prefer inline types over `Props` types or interfaces.
- Set reasonable defaults for optional props.
- Prefer the implicit global `React` for types over `type` imports.

```tsx
import {Fragment} from 'react'
import {View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {Text} from '#/components/Typography'

function MyComponent({
  items = [],
  children,
}: {
  items?: string[]
  children: React.ReactNode
}) {
  return (
    <>
      <View>
        <Text>
          <Trans>Example</Trans>
        </Text>
      </View>
      <View>
        {items.map((item, index) => (
          <Fragment key={item}>
            <Text>{index}</Text>
            <Text>{item}</Text>
          </Fragment>
        ))}
        {children}
      </View>
    </>
>>>>>>> upstream/main
  )
}
```

<<<<<<< HEAD
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
=======
### Dialog Component

Lives in `#/components/Dialog`. Bottom sheet on native, modal on web. Manage
state with `useDialogControl()`. `Dialog.Handle` renders native-only, `Dialog.Close`
web-only. CRITICAL: run any post-close action inside the `control.close(() => ...)`
callback (see Footguns). Compound-component usage; canonical example in any dialog
under `#/components`.

### Menu Component

Lives in `#/components/Menu`. Dropdown on web, bottom sheet dialog on native.
`Menu.Divider` is web-only, `Menu.ContainerItem` native-only. Compound API
(`Menu.Root` / `Menu.Trigger` / `Menu.Outer` / `Menu.Group` / `Menu.Item`); grep
existing usages across the app for a canonical example.

### Button Component

`import {Button, ButtonText, ButtonIcon} from '#/components/Button'`. Props:

- `color`: `'primary'` | `'secondary'` | `'negative'` | `'primary_subtle'` | `'negative_subtle'` | `'secondary_inverted'`
- `size`: `'tiny'` | `'small'` | `'large'`
- `shape`: `'default'` (pill) | `'round'` | `'square'` | `'rectangular'`
- `variant`: `'solid'` | `'outline'` | `'ghost'` (deprecated, prefer `color`)

### TextField

Compound component at `#/components/forms/TextField` (`TextField.LabelText`,
`TextField.Root`, `TextField.Icon`, `TextField.Input`). Prefer `defaultValue` over
`value` (see Footguns).

### Typography

`import {Text, H1, H2, P} from '#/components/Typography'`. The `Text` default style
is `[a.text_sm, a.leading_snug, t.atoms.text]`. Pass the `emoji` prop to any `Text`
that may contain emoji - user-generated text (display names etc.) almost always
does, so only omit it for static, emoji-free strings: `<Text emoji>Hello!</Text>`.

## Internationalization (i18n)

All user-facing strings must be wrapped for translation using Lingui. Include `comment` and/or `context` props when necessary to avoid ambiguity, e.g., “Post” as a noun vs a verb.

Prefer using `t` via `import {useLingui} '@lingui/react/macro'` vs `_` via `import {useLingui} from '@lingui/react'`. Alias `t` to `l` to avoid collisions with `const t = useTheme()`. Refactor existing uses of ``_(msg`foo`)`` to use `` l`foo` ``.

Prefer Unicode punctuation over keyboard punctuation, e.g., `“quote”` over `"quote"`. Prefer en dashes preceded by a non-breaking space over em dashes, e.g., `one – two` over `one—two`.

```tsx
import {plural} from '@lingui/core/macro'
import {Trans, useLingui} from '@lingui/react/macro'

function MyComponent() {
  const {t: l} = useLingui()

  // Simple strings - use the l macro
  const title = l`Settings`
  const errorMessage = l({
    message: 'Something went wrong',
    comment: 'Generic error message for unknown/unhandled errors.',
    context: 'Toast',
  })

  // Strings with variables
  const greeting = l`Hello, ${name}!`

  // Pluralization
  const countLabel = plural(count, {
    one: '# item',
    other: '# items',
  })

  // JSX content - use Trans component
  return (
    <Text>
      <Trans>
        Welcome to <Text style={a.font_bold}>Bluesky</Text>, {name}!
      </Trans>
    </Text>
  )
}
```

Prefer `i18n.date` for date and time formatting. This ensures formatting is re-applied when the language changes at runtime. Refactor existing uses of `Intl.DateTimeFormat` to use `i18n.date`.

```tsx
import {useLingui} from '@lingui/react/macro'

function MyComponent() {
  const {i18n} = useLingui()

  const createdAt = new Date()

  return i18n.date(createdAt, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
}
```

**Commands:**

```bash
# DO NOT run these commands - extraction and compilation are handled by a nightly CI job
pnpm intl:extract    # Extract new strings to locale files
pnpm intl:compile    # Compile translations for runtime
```

## State Management

### TanStack Query (Data Fetching)

Follow the established pattern in `src/state/queries/`; `src/state/queries/feed.ts`
is a good canonical reference (it uses `createQueryKey`, matching key roots,
`useInfiniteQuery`, and `persistedVersion`).

- Build query keys with `createQueryKey(root, args)` (from `#/state/queries/util`)
  using an object for `args`. The key root variable should match the hook name.
- Naming conventions: `use[Name]Query` for queries, `use[Name]Mutation` for
  mutations, `use[Name]CacheMutation` for helpers that mutate cached data directly.
- Stale times come from `STALE` in `src/state/queries/index.ts`: `STALE.SECONDS.FIFTEEN`,
  `STALE.MINUTES.ONE`, `STALE.MINUTES.FIVE`, `STALE.HOURS.ONE`, `STALE.INFINITY`.
- Paginated atproto APIs (those returning a `cursor`) use `useInfiniteQuery` with
  `getNextPageParam: page => page.cursor`; flatten results with
  `data?.pages.flatMap(page => page.items) ?? []`.
- Persist a query across restarts by passing options:
  `createQueryKey(root, args, {persistedVersion: n})`. Bumping `n` clears the old
  persisted data and refetches - do this whenever the data shape changes.
- Error handling in mutations: don't log network errors (just inform the user),
  handle typed XRPC errors specifically (e.g. `err instanceof SomeNsid.SomeError`),
  and send unexpected errors to `logger.error('...', {safeMessage: error})`.

### Preferences (React Context)

Boolean/simple UI preferences are exposed as paired hooks from `#/state/preferences`,
e.g. `useAutoplayDisabled()` / `useSetAutoplayDisabled()`.

### Session State

`import {useSession, useAgent} from '#/state/session'`. `useSession()` gives
`hasSession` and `currentAccount`; `useAgent()` gives the atproto agent for API calls.

## Navigation

React Navigation with type-safe route params. Type a screen with
`NativeStackScreenProps<CommonNavigatorParams, 'X'>` (`route`/`navigation` come
from props; params via `route.params`). Navigate programmatically with
`useNavigation()`, or the `navigate` helper from `#/Navigation`. Config lives in
`src/Navigation.tsx`, routes in `src/routes.ts`, types in `src/lib/routes/types.ts`.

## Platform-Specific Code

Use file extensions for platform-specific implementations. The bundler resolves
them automatically - just import the base path normally, never a conditional
`require()`.

```
Component.tsx          # Shared/default
Component.web.tsx      # Web-only
Component.native.tsx   # iOS + Android
Component.ios.tsx      # iOS-only
Component.android.tsx  # Android-only
```

Prefer grouping variants into a `Component/` directory (`index.tsx`,
`index.web.tsx`, `index.native.tsx`) rather than sibling `Component.web.tsx` files,
so the shared surface reads as one "macro" module (e.g. `src/components/Dialog/index.tsx`
native vs `index.web.tsx` web). The app has both patterns; the directory form is
preferred for new code.

```tsx
// CORRECT - bundler picks storage.ts or storage.web.ts automatically
import * as storage from '#/state/drafts/storage'

// WRONG - don't use require() or conditional imports for platform files
const storage = IS_NATIVE
  ? require('#/state/drafts/storage')
  : require('#/state/drafts/storage.web')
```

Runtime platform detection (not for imports): `import {IS_WEB, IS_NATIVE, IS_IOS, IS_ANDROID} from '#/env'`.

## Import Aliases

Always use the `#/` alias for absolute imports:

```tsx
// Good
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button} from '#/components/Button'

// Avoid
import {useSession} from '../../../state/session'
```

## Footguns

Common pitfalls to avoid in this codebase:

### Dialog Close Callback (Critical)

**Always use `control.close(() => ...)` when performing actions after closing a dialog.** The callback ensures the action runs after the dialog's close animation completes. Failing to do this causes race conditions with React state updates.

```tsx
// WRONG - causes bugs with state updates, navigation, opening other dialogs
const onConfirm = () => {
  control.close()
  navigation.navigate('Home') // May race with dialog animation
}

// WRONG - same problem
const onConfirm = () => {
  control.close()
  otherDialogControl.open() // Will likely fail or cause visual glitches
}

// CORRECT - action runs after dialog fully closes
const onConfirm = () => {
  control.close(() => {
    navigation.navigate('Home')
  })
}

// CORRECT - opening another dialog after close
const onConfirm = () => {
  control.close(() => {
    otherDialogControl.open()
  })
}

// CORRECT - state updates after close
const onConfirm = () => {
  control.close(() => {
    setSomeState(newValue)
    onCallback?.()
  })
}
```

This applies to:

- Navigation (`navigation.navigate()`, `navigation.push()`)
- Opening other dialogs or menus
- State updates that affect UI (`setState`, `queryClient.invalidateQueries`)
- Callbacks passed from parent components

The Menu component on iOS specifically uses this pattern – see `src/components/Menu/index.tsx:151`.

### Controlled vs Uncontrolled Inputs

Prefer `defaultValue` over `value` for TextInput on the old architecture:

```tsx
// Preferred - uncontrolled
<TextField.Input
  defaultValue={initialEmail}
  onChangeText={setEmail}
/>

// Avoid when possible - controlled (can cause performance issues)
<TextField.Input
  value={email}
  onChangeText={setEmail}
/>
```

### Platform-Specific Behavior

Some components behave differently across platforms:

- `Dialog.Handle` – Only renders on native (drag handle for bottom sheet)
- `Dialog.Close` – Only renders on web (X button)
- `Menu.Divider` – Only renders on web
- `Menu.ContainerItem` – Only works on native

Always test on multiple platforms when using these components.

### React Compiler is Enabled

This codebase uses React Compiler, so **don't proactively add `useMemo` or `useCallback`**. The compiler handles memoization automatically.

```tsx
// UNNECESSARY - React Compiler handles this
const handlePress = useCallback(() => {
  doSomething()
}, [doSomething])

// JUST WRITE THIS
const handlePress = () => {
  doSomething()
}
```

Only use `useMemo`/`useCallback` when you have a specific reason, such as:

- The value is immediately used in an effect's dependency array
- You're passing a callback to a non-React library that needs referential stability

## Best Practices

1. **Accessibility**: Always provide `label` prop for interactive elements, use `accessibilityHint` where helpful

2. **Translations**: Wrap ALL user-facing strings with the `` l`…` `` macro or the `<Trans>` component

3. **Styling**: Combine static atoms with theme atoms, use platform utilities for platform-specific styles

4. **State**: Use TanStack Query for server state, React Context for UI preferences

5. **Components**: Check if a component exists in `#/components/` before creating new ones

6. **Types**: Define explicit types for props, use `NativeStackScreenProps` for screens

7. **Testing**: Components should have `testID` props for E2E testing

## Key Files Reference

| Purpose           | Location                                     |
| ----------------- | -------------------------------------------- |
| Theme definitions | `src/alf/themes.ts`                          |
| Design tokens     | `src/alf/tokens.ts`                          |
| Static atoms      | `src/alf/atoms.ts` (extends `@bsky.app/alf`) |
| Navigation config | `src/Navigation.tsx`                         |
| Route definitions | `src/routes.ts`                              |
| Route types       | `src/lib/routes/types.ts`                    |
| Query hooks       | `src/state/queries/*.ts`                     |
| Session state     | `src/state/session/index.tsx`                |
| i18n setup        | `src/locale/i18n.ts`                         |
>>>>>>> upstream/main
