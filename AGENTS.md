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
| Profile fields from Microcosm                                  | `src/lib/slingshot/hydrate.ts`, `src/state/queries/slingshot.ts` | `src/state/queries/profile.ts`                                                                                                  |
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
<<<<<<< HEAD
=======
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
  )
}
```

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
`TextField.Root`, `TextField.Icon`, `TextField.Input`). Controlled inputs
(`value` + `onChangeText`) are fine and are usually what you want - the old
advice to reach for `defaultValue` was a New Architecture migration concern and
no longer applies. Reach for `defaultValue` only when nothing outside the input
needs to read the text.

### Typography

`import {Text, H1, H2, P} from '#/components/Typography'`. The `Text` default style
is `[a.text_sm, a.leading_snug, t.atoms.text]`. Pass the `emoji` prop to any `Text`
that may contain emoji - user-generated text (display names etc.) almost always
does, so only omit it for static, emoji-free strings: `<Text emoji>Hello!</Text>`.

### Haptics

`const haptics = useHaptics()` from `#/lib/haptics`. Call the method that
describes what happened, not how strong it should feel. Each method maps to the
matching haptic on each platform: iOS feedback generators, and Android
`performHapticFeedback` constants with fallbacks for older API levels. Haptics
do nothing on web or when the user has disabled them.

- `tap()` - light acknowledgement of a tap (like, reply, opening a card)
- `confirm()` - the user committed a change (follow, pin, send a message)
- `longPress()` - a long-press did something (opened a menu or share sheet)
- `toggle(on)` - a switch, checkbox or radio changed; pass the new value
- `selection()` - the highlighted option changed (segmented control, drag slot)
- `threshold()` - a gesture crossed its activation point (swipe-to-reply)
- `dragStart()` - an item was picked up to be dragged
- `success()` / `error()` - something the user was waiting on finished

Only reach for `haptics.platform({ios, android})` when no intent fits, and never
import `expo-haptics` directly. In worklets, destructure the method you need
(`const {threshold} = useHaptics()`) and pass it to `scheduleOnRN`; don't
capture the whole object. The emulator/simulator can't play haptics, so test on
a physical device via the haptics section of the Storybook.

## Internationalization (i18n)

All user-facing strings must be wrapped for translation using Lingui. Include `comment` and/or `context` props when necessary to avoid ambiguity, e.g., “Post” as a noun vs a verb.

Prefer using `t` via `import {useLingui} '@lingui/react/macro'` vs `_` via `import {useLingui} from '@lingui/react'`. Alias `t` to `l` to avoid collisions with `const t = useTheme()`. Refactor existing uses of ``_(msg`foo`)`` to use `` l`foo` ``.

Prefer Unicode punctuation over keyboard punctuation, e.g., `“quote”` over `"quote"`. Prefer en dashes preceded by a non-breaking space over em dashes, e.g., `one – two` over `one—two`.

```tsx
import {plural} from '@lingui/core/macro'
>>>>>>> upstream/main
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

<<<<<<< HEAD
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
