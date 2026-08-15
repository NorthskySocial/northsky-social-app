import {plural} from '@lingui/core/macro'
import {useLingui} from '@lingui/react/macro'

import {usePostNaming} from './state'

/**
 * Every user-facing word the "They're called" setting changes.
 *
 * A Lingui macro compiles to a fixed message at build time, so a running app
 * cannot re-point one. Both wordings therefore have to be authored, and this is
 * the single place that authors them. A call site reads one named field, which
 * keeps each upstream edit down to a token swap.
 *
 * The skeet wording is taken verbatim from commit 24c2ff3ff, which introduced
 * it. The post wording is the upstream wording that commit replaced.
 */
export function usePostVocabulary() {
  const {t: l} = useLingui()
  const skeet = usePostNaming() === 'skeet'

  return {
    newPost: skeet
      ? l({message: 'New skeet', context: 'action'})
      : l({message: 'New post', context: 'action'}),
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

    repost: skeet
      ? l({message: 'Reskeet', context: 'action'})
      : l({message: 'Repost', context: 'action'}),
    removeRepost: skeet ? l`Remove reskeet` : l`Remove repost`,
    undoRepost: skeet ? l`Undo reskeet` : l`Undo repost`,
    repostOrQuotePost: skeet
      ? l`Reskeet or quote post`
      : l`Repost or quote post`,
    repostsHidden: skeet ? l`Reskeets Hidden` : l`Reposts Hidden`,
    showReposts: skeet ? l`Show reskeets` : l`Show reposts`,
    showRepostsInFeeds: skeet
      ? l`Show reskeets in feeds`
      : l`Show reposts in feeds`,
    hideRepostsInFeeds: skeet
      ? l`Hide reskeets in feeds`
      : l`Hide reposts in feeds`,
    repostsShownToast: skeet
      ? l({message: 'Reskeets will be shown in feeds', context: 'toast'})
      : l({message: 'Reposts will be shown in feeds', context: 'toast'}),
    repostsHiddenToast: skeet
      ? l({message: 'Reskeets will be hidden in feeds', context: 'toast'})
      : l({message: 'Reposts will be hidden in feeds', context: 'toast'}),
    repostsOfThisPost: skeet
      ? l`Reskeets of this post`
      : l`Reposts of this post`,
    noRepostsYet: skeet ? l`No reskeets yet` : l`No reposts yet`,
    nobodyHasRepostedYet: skeet
      ? l`Nobody has reskeeted this yet. Maybe you should be the first!`
      : l`Nobody has reposted this yet. Maybe you should be the first!`,
    repostedByHeader: skeet ? l`Reskeeted By` : l`Reposted By`,
    repostedByYou: skeet ? l`Reskeeted by you` : l`Reposted by you`,
    reposts: skeet ? l`Reskeets` : l`Reposts`,
    likesOfYourReposts: skeet
      ? l`Likes of your reskeets`
      : l`Likes of your reposts`,
    repostsOfYourReposts: skeet
      ? l`Reskeets of your reskeets`
      : l`Reposts of your reposts`,
    repostNotificationSettings: skeet
      ? l`Settings for reskeet notifications`
      : l`Settings for repost notifications`,
    likesOfYourRepostsNotificationSettings: skeet
      ? l`Settings for notifications for likes of your reskeets`
      : l`Settings for notifications for likes of your reposts`,
    repostsOfYourRepostsNotificationSettings: skeet
      ? l`Settings for notifications for reskeets of your reskeets`
      : l`Settings for notifications for reposts of your reposts`,
    repostNotificationDescription: skeet
      ? l`Get notifications when people reskeet your posts.`
      : l`Get notifications when people repost your posts.`,
    likesOfYourRepostsDescription: skeet
      ? l`Get notifications when people like your reskeets.`
      : l`Get notifications when people like your reposts.`,
    repostsOfYourRepostsDescription: skeet
      ? l`Get notifications when people reskeet your reskeets.`
      : l`Get notifications when people repost your reposts.`,

    repostedBy(name: string) {
      return skeet ? l`Reskeeted by ${name}` : l`Reposted by ${name}`
    },
    /** "Reskeet (3 reskeets)" — the button label plus its running total. */
    repostA11yLabel(count: number) {
      return skeet
        ? l({
            message: `Reskeet (${plural(count, {
              one: '# reskeet',
              other: '# reskeets',
            })})`,
            comment:
              'Accessibility label for the reskeet button when the post has not been reskeeted, verb form followed by number of reskeets and noun form',
          })
        : l({
            message: `Repost (${plural(count, {
              one: '# repost',
              other: '# reposts',
            })})`,
            comment:
              'Accessibility label for the repost button when the post has not been reposted, verb form followed by number of reposts and noun form',
          })
    },
    undoRepostA11yLabel(count: number) {
      return skeet
        ? l({
            message: `Undo reskeet (${plural(count, {
              one: '# reskeet',
              other: '# reskeets',
            })})`,
            comment:
              'Accessibility label for the reskeet button when the post has been reskeeted, verb followed by number of reskeets and noun',
          })
        : l({
            message: `Undo repost (${plural(count, {
              one: '# repost',
              other: '# reposts',
            })})`,
            comment:
              'Accessibility label for the repost button when the post has been reposted, verb followed by number of reposts and noun',
          })
    },
    /** "3 reskeets" — a count and its noun. */
    repostCount(count: number) {
      return skeet
        ? plural(count, {one: '# reskeet', other: '# reskeets'})
        : plural(count, {one: '# repost', other: '# reposts'})
    },
    /** "reskeets" — the bare noun, for when the count is displayed apart. */
    repostNoun(count: number) {
      return skeet
        ? plural(count, {one: 'reskeet', other: 'reskeets'})
        : plural(count, {one: 'repost', other: 'reposts'})
    },
  }
}
