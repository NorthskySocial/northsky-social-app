import {render} from '@testing-library/react-native'

import {type EmbedType} from '#/types/bsky/post'
import {SlingshotFallbackEmbed} from './SlingshotFallbackEmbed'

const mockUseSlingshotRecordQuery = jest.fn()

jest.mock('#/state/queries/slingshot', () => ({
  useSlingshotRecordQuery: (args: unknown) => mockUseSlingshotRecordQuery(args),
}))
jest.mock('./index', () => ({
  QuoteEmbed: () => null,
}))
jest.mock('./PostPlaceholder', () => ({
  PostPlaceholder: () => null,
}))

const embed: EmbedType<'post_not_found'> = {
  type: 'post_not_found',
  view: {
    $type: 'app.bsky.embed.record#viewNotFound',
    uri: 'at://did:plc:author/app.bsky.feed.post/quoted',
    notFound: true,
  },
}

describe('SlingshotFallbackEmbed', () => {
  beforeEach(() => {
    mockUseSlingshotRecordQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    })
  })

  it('does not fetch or render a nested quote when nesting is disabled', () => {
    const view = render(<SlingshotFallbackEmbed embed={embed} isWithinQuote />)

    expect(mockUseSlingshotRecordQuery).toHaveBeenCalledWith({
      atUri: embed.view.uri,
      enabled: false,
    })
    expect(view.toJSON()).toBeNull()
  })
})
