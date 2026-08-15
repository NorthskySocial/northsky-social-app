import {useLingui} from '@lingui/react/macro'

import {usePostNaming} from './state'

/**
 * The wording on the two compose buttons, which the "They're called" setting
 * changes.
 *
 * The setting reaches the buttons a user presses to write, and nothing else.
 * Feed lines, headers, and notification text keep the skeet wording they
 * already had.
 *
 * A Lingui macro compiles to a fixed message at build time, so a running app
 * cannot re-point one. Both wordings therefore have to be authored, and this is
 * the single place that authors them. A call site reads one named field, which
 * keeps each upstream edit down to a token swap.
 */
export function usePostVocabulary() {
  const {t: l} = useLingui()
  const skeet = usePostNaming() === 'skeet'

  return {
    /** The left sidebar compose button. */
    newPost: skeet
      ? l({message: 'New skeet', context: 'action'})
      : l({message: 'New post', context: 'action'}),

    /** The composer publish button, and the label a screen reader reads for it. */
    post: skeet
      ? l({message: 'Skeet', context: 'action'})
      : l({message: 'Post', context: 'action'}),
    postAll: skeet
      ? l({message: 'Skeet All', context: 'action'})
      : l({message: 'Post All', context: 'action'}),
    publishPost: skeet
      ? l({
          message: 'Publish skeet',
          comment: 'Accessibility label for button to publish a single skeet',
        })
      : l({
          message: 'Publish post',
          comment: 'Accessibility label for button to publish a single post',
        }),
    publishPosts: skeet
      ? l({
          message: 'Publish skeets',
          comment:
            'Accessibility label for button to publish multiple skeets in a thread',
        })
      : l({
          message: 'Publish posts',
          comment:
            'Accessibility label for button to publish multiple posts in a thread',
        }),
  }
}
