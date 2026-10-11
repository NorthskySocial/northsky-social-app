import {useLingui} from '@lingui/react/macro'

import * as LabelPreference from '#/components/moderation/LabelPreference'
import {setAdultEmojiPref, useAdultEmojiPref} from './adultPref'

/**
 * Moderation row for custom emoji their authors marked adult-only. Same shape
 * as the other adult content rows; shown only when adult content is enabled.
 * Hidden emoji still appear, as their `:alias:` text.
 */
export function AdultEmojiPreference() {
  const {t: l} = useLingui()
  const pref = useAdultEmojiPref()

  return (
    <LabelPreference.Outer>
      <LabelPreference.Content
        name={l`Adult-only emoji`}
        description={l`Custom emoji (Bluemoji) that their creators marked as adult content. When hidden, they show as their :name: text.`}
      />
      <LabelPreference.Buttons
        name="adult-only emoji"
        values={[pref === 'show' ? 'ignore' : 'hide']}
        onChange={values =>
          setAdultEmojiPref(values[0] === 'ignore' ? 'show' : 'hide')
        }
        ignoreLabel={l`Show`}
        hideLabel={l`Hide`}
      />
    </LabelPreference.Outer>
  )
}
