# northskyAppearance

Northsky-only appearance settings that upstream does not have.

## Accents

The setting lives under **Settings > Appearance**, is titled "Accents", and
offers **Lively** and **Calm**. It defaults to **Lively**, which is how the app
looked before the setting existed.

Some people find the bright magenta-to-mint gradient overstimulating. Calm
replaces it with one solid colour:

| Surface                                               | Lively                    | Calm                                      |
| ----------------------------------------------------- | ------------------------- | ----------------------------------------- |
| Primary buttons, compose button (FAB)                 | brand gradient fill       | solid `#9A45EC`, the style guide's button |
| Quote-post frame, "who can interact" pill             | 2px gradient ring         | hairline in `border_contrast_low`         |
| Web dropdown menus, post interaction settings dialog  | 2px gradient ring         | hairline in `border_contrast_low`         |
| Desktop left nav hover                                | gradient wash             | flat purple tint                          |

The logo and decorative art (starter-pack icons, hero images) stay gradients in
both modes. They are brand identity, not interface chrome.

The look of each mode lives in `src/brand/accents.ts`. This module only holds the
setting.

## Storage and realtime

The value is stored in device storage under `accents`. The provider reads it
once and shares it through context, for the same reason as
`#/features/postVocabulary`: every primary button reads it, and `useStorage`
would open one MMKV listener per caller.
