// northsky: wording follows the "They're called" setting
import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {makeRecordUri} from '#/lib/strings/url-helpers'
import {usePostQuery} from '#/state/queries/post'
import {PostRepostedBy as PostRepostedByComponent} from '#/view/com/post-thread/PostRepostedBy'
import * as Layout from '#/components/Layout'
import {usePostVocabulary} from '#/features/postVocabulary'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'PostRepostedBy'>
export const PostRepostedByScreen = ({route}: Props) => {
  // northsky: wording follows the "They're called" setting
  const vocab = usePostVocabulary()
  const {name, rkey} = route.params
  const uri = makeRecordUri(name, 'app.bsky.feed.post', rkey)
  const {data: post} = usePostQuery(uri)

  let quoteCount
  if (post) {
    quoteCount = post.repostCount
  }

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          {post && (
            <>
              {/* northsky: wording follows the "They're called" setting */}
              <Layout.Header.TitleText>
                {vocab.repostedByHeader}
              </Layout.Header.TitleText>
              <Layout.Header.SubtitleText>
                {vocab.repostCount(quoteCount ?? 0)}
              </Layout.Header.SubtitleText>
            </>
          )}
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <PostRepostedByComponent uri={uri} />
    </Layout.Screen>
  )
}
