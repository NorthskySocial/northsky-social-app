import {useState} from 'react'
import {type GestureResponderEvent, View} from 'react-native'
import {moderatePost} from '@bsky/sdk/moderation'
import {RichText as RichTextAPI} from '@bsky/sdk/richtext'
import {Trans, useLingui} from '@lingui/react/macro'

import {MAX_POST_LINES} from '#/lib/constants'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {makeProfileLink} from '#/lib/routes/links'
import {forceLTR} from '#/lib/strings/bidi'
import {NON_BREAKING_SPACE} from '#/lib/strings/constants'
import {sanitizeHandle} from '#/lib/strings/handles'
import {countLines} from '#/lib/strings/helpers'
import {
  POST_TOMBSTONE,
  type Shadow,
  usePostShadow,
} from '#/state/cache/post-shadow'
import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {type ParentPost} from '#/state/queries/notifications/grouped/types'
import {useSlingshotRecordQuery} from '#/state/queries/slingshot'
import {useSession} from '#/state/session'
import {atoms as a, tokens, useTheme, web} from '#/alf'
import {ArrowCornerDownRight_Stroke2_Corner2_Rounded as ArrowCornerDownRight} from '#/components/icons/Arrow'
import {type Props as SVGIconProps} from '#/components/icons/common'
import {WebOnlyInlineLinkText} from '#/components/Link'
import {ContentHider} from '#/components/moderation/ContentHider'
import {PostAlerts} from '#/components/moderation/PostAlerts'
<<<<<<< HEAD
// northsky: notifications share custom embeds, moderation and quote recovery.
import {Embed, PostEmbedViewContext} from '#/components/Post/Embed'
=======
import {Embed} from '#/components/Post/Embed'
>>>>>>> upstream/main
import {ShowMoreTextButton} from '#/components/Post/ShowMoreTextButton'
import {PostControls} from '#/components/PostControls'
import {ProfileBadges} from '#/components/ProfileBadges'
import {ProfileHoverCard} from '#/components/ProfileHoverCard'
import {RichText} from '#/components/RichText'
import {Text} from '#/components/Typography'
import {app} from '#/lexicons'
import * as bsky from '#/types/bsky'
<<<<<<< HEAD
import {makePostLink} from '../links'
import {Card, InlineImages} from './media'
=======
>>>>>>> upstream/main
import {Strong, useDisplayName} from './text'

type PostView = app.bsky.feed.defs.PostView

/**
 * Post controls pad their top, and each button pads its hit area, which put
 * the icons well below the timestamp. Cancelling both leaves the icons the
 * row's usual gap below it. 5 is `PostControlButton`'s padding.
 */
const CONTROLS_STYLE = {paddingTop: 0, marginTop: -5}

/**
 * Collapses a post's text onto one line for single-line previews, so that
 * native ellipsis isn't cut short by a newline.
 */
function toOneLine(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Puts text on one line without changing its length, so rich text facets,
 * which are byte offsets, still line up.
 */
function flattenLines(text: string) {
  return text.replace(/[\r\n\t]/g, ' ')
}

/**
 * The author of a post-based notification on a single line, e.g. "**rafael**
 * @rafael.my". The name shrinks before the handle disappears entirely.
 */
export function Author({profile}: {profile: bsky.profile.AnyProfileView}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const name = useDisplayName(profile)
  const href = makeProfileLink(profile)
  const label = l`Go to ${name}’s profile`

  return (
    <ProfileHoverCard did={profile.did}>
      <View style={[a.flex_row, a.align_center, a.self_start, a.max_w_full]}>
        <WebOnlyInlineLinkText
          emoji
          numberOfLines={1}
          to={href}
          label={label}
          disableMismatchWarning
          style={[
            a.flex_shrink,
            a.text_md,
            a.leading_snug,
            a.font_semi_bold,
            t.atoms.text,
            web({direction: 'ltr', unicodeBidi: 'isolate'}),
          ]}>
          {forceLTR(name)}
        </WebOnlyInlineLinkText>
        <ProfileBadges profile={profile} size="sm" style={[a.pl_2xs]} />
        <WebOnlyInlineLinkText
          emoji
          numberOfLines={1}
          to={href}
          label={label}
          disableMismatchWarning
          disableUnderline
          style={[
            a.text_md,
            a.leading_snug,
            t.atoms.text_contrast_medium,
            {flexShrink: 10},
          ]}>
          {NON_BREAKING_SPACE + sanitizeHandle(profile.handle, '@')}
        </WebOnlyInlineLinkText>
      </View>
    </ProfileHoverCard>
  )
}

/**
 * A single line of context under the author, with a small leading icon, e.g.
 * "replied to you: ...". Children are text spans, truncated with an
 * ellipsis.
 */
export function ContextLine({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<SVGIconProps>
  children: React.ReactNode
}) {
  const t = useTheme()

  return (
    <View style={[a.flex_row, a.align_center, a.gap_xs]}>
      <Icon size="xs" fill={t.atoms.text.color} style={[a.flex_shrink_0]} />
      <Text
        emoji
        numberOfLines={1}
        style={[a.flex_1, a.text_sm, a.leading_snug, t.atoms.text]}>
        {children}
      </Text>
    </View>
  )
}

/**
 * Which post a notification's post is responding to, e.g. "replied to you:
 * <your post>" or "replied to **bob**: <bob's post>".
 */
export function ReplyContext({
  parent,
  variant = 'reply',
}: {
  parent: ParentPost
  /**
   * `reply` for reply notifications ("replied to ..."). `inReply` for mentions
   * and quotes that happen to be replies ("in reply to ..."), where the headline
   * action is something else.
   */
  variant?: 'reply' | 'inReply'
}) {
  return (
    <ContextLine icon={ArrowCornerDownRight}>
      {parent.type === 'post' ? (
        <ReplyContextPost post={parent.post} variant={variant} />
      ) : (
        <Text>
          {parent.type === 'blocked' ? (
            variant === 'reply' ? (
              <Trans>replied to a blocked post</Trans>
            ) : (
              <Trans>in reply to a blocked post</Trans>
            )
          ) : variant === 'reply' ? (
            <Trans>replied to a deleted post</Trans>
          ) : (
            <Trans>in reply to a deleted post</Trans>
          )}
        </Text>
      )}
    </ContextLine>
  )
}

function ReplyContextPost({
  post,
  variant,
}: {
  post: PostView
  variant: 'reply' | 'inReply'
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const {currentAccount} = useSession()
  const moderationOpts = useModerationOpts()
  /*
   * Who was replied to, when it isn't the viewer. The sentences name their
   * placeholder after this, so it stays `subject` to keep their translations
   */
  const subject = forceLTR(useDisplayName(post.author))
  const isViewer = post.author.did === currentAccount?.did

  const isHidden = moderationOpts
    ? moderatePost(post, moderationOpts).ui('contentList').blur
    : false

  const record = bsky.isType(app.bsky.feed.post, post.record)
    ? post.record
    : undefined
  let preview = record ? toOneLine(record.text) : ''
  if (isHidden) {
    preview = l({
      message: 'Hidden post',
      comment:
        'Shown in place of the text of a post that is hidden by the viewer’s moderation settings',
    })
  } else if (!preview && post.embed) {
    preview = l({
      message: 'Post with media',
      comment:
        'Shown in place of the text of a post that has no text, only images, video, a link or a quoted post',
    })
  }
  // Nested text keeps its own size, so each part matches `ContextLine`'s
  const previewStyle = [a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]
  const previewNode =
    record && preview && !isHidden ? (
      <RichText
        enableCode
        enableEmphasis
        value={
          new RichTextAPI({
            text: flattenLines(record.text),
            facets: record.facets,
          })
        }
        authorHandle={post.author.handle}
        disableLinks
        // Text with only emoji is scaled up, which the one-line preview clips
        emojiMultiplier={1}
        style={previewStyle}
      />
    ) : (
      <Text emoji style={previewStyle}>
        {preview}
      </Text>
    )

  /*
   * The viewer gets sentences of their own, rather than "you" filled in for
   * `subject`, since some languages word the rest differently for "you"
   */
  if (variant === 'reply') {
    return isViewer ? (
      <Trans comment="In a notification, someone replied to the viewer’s own post. Followed by a preview of that post">
        replied to you: {previewNode}
      </Trans>
    ) : (
      <Trans comment="In a notification, someone replied to another person’s post. {subject} is that person’s name, followed by a preview of their post">
        replied to <Strong style={a.text_sm}>{subject}</Strong>: {previewNode}
      </Trans>
    )
  }

  return isViewer ? (
    <Trans comment="In a notification about a mention or quote, the post is a reply to the viewer’s own post. Followed by a preview of that post">
      in reply to you: {previewNode}
    </Trans>
  ) : (
    <Trans comment="In a notification about a mention or quote, the post is a reply to another person’s post. {subject} is that person’s name, followed by a preview of their post">
      in reply to <Strong style={a.text_sm}>{subject}</Strong>: {previewNode}
    </Trans>
  )
}

/**
 * A post's text and its embed, behind the usual moderation hider. The embed
 * renders as it does in a feed. Long text is cut short with a "Show more"
 * button, as in feeds.
 */
export function PostBody({post}: {post: PostView}) {
  const moderationOpts = useModerationOpts()
  const record = bsky.isType(app.bsky.feed.post, post.record)
    ? post.record
    : undefined
  const richText =
    record && record.text.trim()
      ? new RichTextAPI({text: record.text, facets: record.facets})
      : undefined
  /*
   * The same rule as posts in feeds: text with `MAX_POST_LINES` or more line
   * breaks stops at that many lines until the viewer asks for the rest. Only
   * line breaks count, not wrapping.
   */
  const [limitLines, setLimitLines] = useState(
    () => countLines(richText?.text) >= MAX_POST_LINES,
  )
  const moderation = moderationOpts
    ? moderatePost(post, moderationOpts)
    : undefined
<<<<<<< HEAD
=======
  const hasEmbed = post.embed ? rendersEmbed(post.embed) : false
>>>>>>> upstream/main

  const onPressShowMore = (event: GestureResponderEvent) => {
    // Keep the press from reaching the row, which on web would follow its link
    event.preventDefault()
    event.stopPropagation()
    setLimitLines(false)
  }

  return (
    <ContentHider
      modui={moderation?.ui('contentView')}
      style={[a.gap_sm]}
      childContainerStyle={[a.gap_sm]}>
      {moderation && (
        <PostAlerts post={post} modui={moderation.ui('contentView')} />
      )}
      {richText && (
        // Keeps "Show more" right under the text, without the hider's gap
        <View>
          <RichText
            enableCode
            enableEmphasis
            enableTags
            value={richText}
            authorHandle={post.author.handle}
            shouldProxyLinks
            numberOfLines={limitLines ? MAX_POST_LINES : undefined}
            // No colour here: it would override the links' and mentions'
            style={[a.text_md, a.leading_snug]}
          />
          {limitLines && (
            <ShowMoreTextButton style={[a.text_md]} onPress={onPressShowMore} />
          )}
        </View>
      )}
<<<<<<< HEAD
      {post.embed && (
        <Embed
          embed={post.embed}
          post={post}
          moderation={moderation}
          viewContext={PostEmbedViewContext.Feed}
        />
=======
      {hasEmbed && (
        /*
         * Embeds bring their own top margin, for the text above them in a
         * post, which the hider's gap already gives. Without text they sit
         * 8px from the header rather than the row's usual 4px, and they get
         * 4px more before the timestamp, as a feed post's embed does.
         */
        <View
          style={[
            a.mb_xs,
            {
              marginTop: richText
                ? -tokens.space.sm
                : -tokens.space.sm + tokens.space.xs,
            },
          ]}>
          <Embed embed={post.embed} moderation={moderation} post={post} />
        </View>
>>>>>>> upstream/main
      )}
    </ContentHider>
  )
}

/**
<<<<<<< HEAD
 * Compact preview of a quoted post: author, time and the start of its text.
 * Pressing it opens the quoted post. Blocked, deleted and detached quotes
 * collapse to a short muted line, and other record embeds render nothing.
 */
export function QuoteCard({
  embed,
  numberOfLines = 2,
  isMuted = false,
}: {
  embed: app.bsky.embed.record.View
  /**
   * How many lines of the quoted post's text to show.
   */
  numberOfLines?: number
  /**
   * Mutes the quoted post's text, as for a preview of the post.
   */
  isMuted?: boolean
}) {
  const t = useTheme()
  const {currentAccount} = useSession()
  const parsed = bsky.post.parseEmbedRecordView(embed)

  let placeholder: React.ReactNode = null
  switch (parsed.type) {
    case 'post':
      return (
        <QuoteCardPost
          view={parsed.view}
          numberOfLines={numberOfLines}
          isMuted={isMuted}
        />
      )
    case 'post_blocked':
      placeholder = <Trans>Blocked post</Trans>
      break
    case 'post_not_found':
      // northsky: recover only missing quotes, never blocked or detached ones.
      return (
        <RecoveredQuoteCard
          uri={parsed.view.uri}
          numberOfLines={numberOfLines}
          isMuted={isMuted}
        />
      )
    case 'post_detached': {
      const isViewerOwner = currentAccount?.did
        ? parsed.view.uri.includes(currentAccount.did)
        : false
      placeholder = isViewerOwner ? (
        <Trans>Removed by you</Trans>
      ) : (
        <Trans>Removed by author</Trans>
      )
      break
    }
    default:
      return null
  }

  return (
    <Card>
      <Text style={[a.text_md, a.leading_snug, t.atoms.text_contrast_medium]}>
        {placeholder}
      </Text>
    </Card>
  )
}

// northsky: recovery uses the same compact rendering and moderation as found quotes.
function RecoveredQuoteCard({
  uri,
  numberOfLines,
  isMuted,
}: {
  uri: string
  numberOfLines: number
  isMuted: boolean
}) {
  const t = useTheme()
  const {data: view, isLoading} = useSlingshotRecordQuery({
    atUri: uri,
    enabled: true,
  })
  if (view)
    return (
      <QuoteCardPost
        view={view}
        numberOfLines={numberOfLines}
        isMuted={isMuted}
      />
    )
  return (
    <Card>
      <Text style={[a.text_md, a.leading_snug, t.atoms.text_contrast_medium]}>
        {isLoading ? <Trans>Loading...</Trans> : <Trans>Deleted</Trans>}
      </Text>
    </Card>
  )
}

function QuoteCardPost({
  view,
  numberOfLines,
  isMuted,
}: {
  view: app.bsky.embed.record.ViewRecord
  numberOfLines: number
  isMuted: boolean
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const moderationOpts = useModerationOpts()
  const name = useDisplayName(view.author)
  const quote: PostView = {
    ...view,
    $type: 'app.bsky.feed.defs#postView',
    record: view.value,
    embed: view.embeds?.[0],
  }
  const moderation = moderationOpts
    ? moderatePost(quote, moderationOpts)
    : undefined
  const href = makePostLink(view)
  const quotedRecord = bsky.isType(app.bsky.feed.post, view.value)
    ? view.value
    : undefined

  return (
    <ContentHider modui={moderation?.ui('contentList')}>
      <Link
        to={href}
        label={l`Post by ${name}`}
        style={[a.flex_col, a.align_stretch, a.rounded_md]}>
        {({hovered, pressed}) => (
          <Card style={[a.gap_xs]}>
            <SubtleHover
              hover={hovered || pressed}
              native
              style={[a.rounded_md, a.curve_continuous]}
            />
            <View style={[a.flex_row, a.align_center, a.gap_xs, {height: 20}]}>
              <UserAvatar
                size={20}
                avatar={view.author.avatar}
                moderation={moderation?.ui('avatar')}
                type={view.author.associated?.labeler ? 'labeler' : 'user'}
              />
              <Text
                emoji
                numberOfLines={1}
                style={[
                  a.flex_shrink,
                  a.text_md,
                  a.leading_snug,
                  a.font_semi_bold,
                  t.atoms.text,
                ]}>
                {forceLTR(name)}
              </Text>
              <Text
                emoji
                numberOfLines={1}
                style={[
                  a.text_md,
                  a.leading_snug,
                  t.atoms.text_contrast_medium,
                  {flexShrink: 10},
                ]}>
                {sanitizeHandle(view.author.handle, '@')}
              </Text>
              <Text
                accessible={false}
                style={[
                  a.text_md,
                  a.leading_snug,
                  t.atoms.text_contrast_medium,
                ]}>
                &middot;
              </Text>
              <TimeElapsed timestamp={view.indexedAt}>
                {({timeElapsed}) => (
                  <Text
                    style={[
                      a.flex_shrink_0,
                      a.text_md,
                      a.leading_snug,
                      t.atoms.text_contrast_medium,
                    ]}>
                    {timeElapsed}
                  </Text>
                )}
              </TimeElapsed>
            </View>
            {quotedRecord?.text.trim() ? (
              <RichText
                enableCode
                enableEmphasis
                value={
                  new RichTextAPI({
                    text: quotedRecord.text,
                    facets: quotedRecord.facets,
                  })
                }
                authorHandle={view.author.handle}
                // The whole card is already a link
                disableLinks
                numberOfLines={numberOfLines}
                style={[
                  a.text_md,
                  a.leading_snug,
                  isMuted ? t.atoms.text_contrast_medium : t.atoms.text,
                ]}
              />
            ) : (
              <InlineImages
                embed={quote.embed}
                size={60}
                blurred={moderation?.ui('contentMedia').blur ?? false}
              />
            )}
          </Card>
        )}
      </Link>
    </ContentHider>
=======
 * Whether `Embed` renders anything for an embed. Labelers and unknown embeds
 * render nothing, so they shouldn't take up space in the row.
 */
function rendersEmbed(embed: NonNullable<PostView['embed']>) {
  const {type} = bsky.post.parseEmbed(embed)
  return type !== 'labeler' && type !== 'unknown'
}

/**
 * A record embed on its own, rendered by the same `Embed` that feeds use: a
 * quoted post (or its blocked, deleted or detached placeholder), or a shared
 * feed, list or starter pack. Labelers and unknown records render nothing.
 */
export function RecordCard({embed}: {embed: app.bsky.embed.record.View}) {
  const {type} = bsky.post.parseEmbedRecordView(embed)
  if (type === 'labeler' || type === 'unknown') return null

  return (
    /*
     * `Embed` gives records a top margin, for the post text above them, which
     * the row's own spacing already covers.
     */
    <View style={{marginTop: -tokens.space.sm}}>
      <Embed
        // Inside `recordWithMedia` the record view isn't typed
        embed={{...embed, $type: 'app.bsky.embed.record#view'}}
      />
    </View>
>>>>>>> upstream/main
  )
}

/**
 * The usual post controls for the notification's post, as a post in a feed
 * has them. Renders nothing once the post has been deleted.
 */
export function PostActions({post}: {post: PostView}) {
  const shadow = usePostShadow(post)

  if (shadow === POST_TOMBSTONE) return null
  if (!bsky.isType(app.bsky.feed.post, shadow.record)) return null

  return <PostActionsInner post={shadow} record={shadow.record} />
}

function PostActionsInner({
  post,
  record,
}: {
  post: Shadow<PostView>
  record: app.bsky.feed.post.Main
}) {
  const {openComposer} = useOpenComposer()
  const moderationOpts = useModerationOpts()
  const richText = new RichTextAPI({text: record.text, facets: record.facets})

  const onPressReply = () => {
    openComposer({
      replyTo: {
        uri: post.uri,
        cid: post.cid,
        text: record.text,
        author: post.author,
        embed: post.embed,
        moderation: moderationOpts
          ? moderatePost(post, moderationOpts)
          : undefined,
        langs: record.langs,
      },
      logContext: 'PostReply',
    })
  }

  return (
    <PostControls
      post={post}
      record={record}
      richText={richText}
      onPressReply={onPressReply}
      logContext="Post"
      style={CONTROLS_STYLE}
    />
  )
}
