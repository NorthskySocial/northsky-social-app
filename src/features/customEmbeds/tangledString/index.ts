import {type CustomEmbedHandler} from '#/features/customEmbeds/types'
import {isTangledStringUrl} from './detect'
import {TangledStringEmbed} from './TangledStringEmbed'
import {TangledStringPreview} from './TangledStringPreview'

export const tangledStringHandler: CustomEmbedHandler = {
  match: view => isTangledStringUrl(view.uri),
  Component: TangledStringEmbed,
  Preview: TangledStringPreview,
}
