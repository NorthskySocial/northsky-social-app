import {composerReducer, createComposerState} from './composer'

jest.mock('#/state/gallery', () => ({
  createInitialImages: jest.fn(),
}))
jest.mock('#/logger', () => ({
  logger: {
    warn: jest.fn(),
  },
}))
jest.mock('#/state/queries/postgate/util', () => ({
  createPostgateRecord: jest.fn(() => ({})),
}))
jest.mock('#/state/queries/threadgate', () => ({
  threadgateRecordToAllowUISetting: jest.fn(() => []),
}))

function createState() {
  return createComposerState({
    initText: undefined,
    initMention: undefined,
    initImageUris: undefined,
    initQuoteUri: undefined,
    initInteractionSettings: undefined,
  })
}

describe('composerReducer', () => {
  describe('add_post', () => {
    it('selects the appended post and requests focus', () => {
      const state = createState()

      const nextState = composerReducer(state, {type: 'add_post'})

      expect(nextState.thread.posts).toHaveLength(2)
      expect(nextState.activePostIndex).toBe(1)
      expect(nextState.mutableNeedsFocusActive).toBe(true)
    })

    it('selects a post inserted in the middle of a thread', () => {
      let state = createState()
      state = composerReducer(state, {type: 'add_post'})
      state = composerReducer(state, {type: 'add_post'})

      const lastPostId = state.thread.posts[2].id
      state = composerReducer(state, {
        type: 'focus_post',
        postId: state.thread.posts[0].id,
      })

      const nextState = composerReducer(state, {type: 'add_post'})

      expect(nextState.thread.posts).toHaveLength(4)
      expect(nextState.activePostIndex).toBe(1)
      expect(nextState.thread.posts[2].id).not.toBe(lastPostId)
      expect(nextState.thread.posts[3].id).toBe(lastPostId)
      expect(nextState.mutableNeedsFocusActive).toBe(true)
    })
  })
})

// northsky: Bluemoji sticker
describe('sticker embed', () => {
  const item = {
    uri: 'at://did:plc:abc/blue.moji.collection.item/blobcat',
    did: 'did:plc:abc',
    name: ':blobcat:',
    formats: {},
  }

  function apply(
    state: ReturnType<typeof createState>,
    postAction: Parameters<typeof composerReducer>[1] extends infer A
      ? A extends {type: 'update_post'; postAction: infer P}
        ? P
        : never
      : never,
  ) {
    return composerReducer(state, {
      type: 'update_post',
      postId: state.thread.posts[0].id,
      postAction,
    })
  }

  it('does not accept a quote while a sticker is attached', () => {
    let state = apply(createState(), {type: 'embed_add_sticker', item})
    expect(state.thread.posts[0].embed.media?.type).toBe('sticker')

    state = apply(state, {
      type: 'embed_add_uri',
      uri: 'https://bsky.app/profile/alice.test/post/3kabc',
    })
    expect(state.thread.posts[0].embed.quote).toBeUndefined()
  })

  it('does not attach a sticker over existing media', () => {
    const state = apply(createState(), {type: 'embed_add_sticker', item})
    const again = apply(state, {
      type: 'embed_add_sticker',
      item: {...item, name: ':other:'},
    })
    expect(again.thread.posts[0].embed.media).toMatchObject({
      item: {name: ':blobcat:'},
    })
  })
})
