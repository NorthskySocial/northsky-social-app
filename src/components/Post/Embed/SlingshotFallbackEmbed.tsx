import {type $Typed, type AppBskyEmbedRecord} from '@atproto/api'
import {Trans} from '@lingui/react/macro'

import {useSlingshotRecordQuery} from '#/state/queries/slingshot'
import {type EmbedType} from '#/types/bsky/post'
import {QuoteEmbed} from './index'
import {PostPlaceholder as PostPlaceholderText} from './PostPlaceholder'
import {type CommonProps} from './types'

/** Renders a quoted post that the appview returned as "not found". */
export function SlingshotFallbackEmbed({
  embed,
  ...rest
}: CommonProps & {
  embed: EmbedType<'post_not_found'>
}) {
  const uri = embed.view.uri

  const {data: viewRecord, isLoading} = useSlingshotRecordQuery({
    atUri: uri,
    enabled: true,
  })

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
