import {customLinkEmbeds} from '#/features/customEmbeds/definitions'
import {type CustomEmbedHandler} from '#/features/customEmbeds/types'
import {TangledStringEmbed} from './TangledStringEmbed'
import {TangledStringPreview} from './TangledStringPreview'

export const tangledStringHandler: CustomEmbedHandler = {
  match: view => customLinkEmbeds.tangledString.matches(view.uri),
  Component: TangledStringEmbed,
  Preview: TangledStringPreview,
}
