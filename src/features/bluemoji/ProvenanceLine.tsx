import {Trans} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {InlineLinkText} from '#/components/Link'
import {Text} from '#/components/Typography'
import {
  licenseLabel,
  licenseUrl,
  sourceHost,
  viewProvenance,
} from './provenance'

/**
 * License and source for an emoji or pack, as a line of small text. Both come
 * from a record anyone can write, so they are re-validated here rather than
 * trusted from the AppView: a junk license is dropped, and the source is shown
 * as a link only if it is a plain http(s) URL.
 */
export function ProvenanceLine({
  license,
  source,
}: {
  license?: string
  source?: string
}) {
  const t = useTheme()
  const view = viewProvenance(license, source)
  if (!view.license && !view.source) return null

  const spdx = view.license ? licenseUrl(view.license) : null

  return (
    <Text style={[a.text_xs, a.leading_snug, t.atoms.text_contrast_medium]}>
      {view.license ? (
        <>
          <Trans>License:</Trans>{' '}
          {spdx ? (
            <InlineLinkText
              to={spdx}
              label={view.license}
              style={[a.text_xs, t.atoms.text_link]}>
              {licenseLabel(view.license)}
            </InlineLinkText>
          ) : (
            licenseLabel(view.license)
          )}
        </>
      ) : null}
      {view.license && view.source ? ' · ' : null}
      {view.source ? (
        <>
          <Trans>Source:</Trans>{' '}
          <InlineLinkText
            to={view.source}
            label={view.source}
            style={[a.text_xs, t.atoms.text_link]}>
            {sourceHost(view.source)}
          </InlineLinkText>
        </>
      ) : null}
    </Text>
  )
}
