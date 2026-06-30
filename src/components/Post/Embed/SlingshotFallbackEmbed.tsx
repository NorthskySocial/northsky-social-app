import {useMemo} from 'react'
import {type $Typed, type AppBskyEmbedRecord} from '@atproto/api'
import {Trans} from '@lingui/react/macro'

import {isRecentTid, useSlingshotRecordQuery} from '#/state/queries/slingshot'
import {type EmbedType} from '#/types/bsky/post'
import {QuoteEmbed} from './index'
import {PostPlaceholder as PostPlaceholderText} from './PostPlaceholder'
import {type CommonProps} from './types'

/**
 * Renders a quoted post that the appview returned as "not found".
 * If the post's TID is recent (< 7 days), attempts to fetch it
 * from Slingshot. Otherwise falls back to the "Deleted" placeholder.
 */
export function SlingshotFallbackEmbed({
  embed,
  ...rest
}: CommonProps & {
  embed: EmbedType<'post_not_found'>
}) {
  const uri = embed.view.uri

  // Extract rkey from at-uri to check recency
  const rkey = useMemo(() => {
    const parts = uri.split('/')
    return parts.length >= 5 ? parts[4] : undefined
  }, [uri])

  const isRecent = rkey ? isRecentTid(rkey) : false

  const {data: viewRecord, isLoading} = useSlingshotRecordQuery({
    atUri: uri,
    enabled: isRecent,
  })

  // Not recent enough - show "Deleted" immediately
  if (!isRecent) {
    return (
      <PostPlaceholderText>
        <Trans>Deleted</Trans>
      </PostPlaceholderText>
    )
  }

  // Still loading from Slingshot
  if (isLoading) {
    return (
      <PostPlaceholderText>
        <Trans>Loading...</Trans>
      </PostPlaceholderText>
    )
  }

  // Slingshot returned the record - render as a quote embed
  if (viewRecord) {
    const quoteEmbed: EmbedType<'post'> = {
      type: 'post',
      view: viewRecord as $Typed<AppBskyEmbedRecord.ViewRecord>,
    }

    return (
      <QuoteEmbed
        {...rest}
        embed={quoteEmbed}
        viewContext={undefined}
        isWithinQuote={rest.isWithinQuote}
        allowNestedQuotes={rest.allowNestedQuotes}
      />
    )
  }

  // Slingshot couldn't find it either - genuinely deleted
  return (
    <PostPlaceholderText>
      <Trans>Deleted</Trans>
    </PostPlaceholderText>
  )
}
