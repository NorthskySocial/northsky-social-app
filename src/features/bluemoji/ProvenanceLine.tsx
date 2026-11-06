import {Trans, useLingui} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {InlineLinkText} from '#/components/Link'
import {Text} from '#/components/Typography'
import {
  licenseUrl,
  normalizeLicense,
  sourceHost,
  viewProvenance,
} from './provenance'
import {LICENSE_DESCRIPTIONS} from './provenanceMessages'

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
  const {i18n} = useLingui()
  const view = viewProvenance(license, source)
  if (!view.license && !view.source) return null

  const spdx = view.license ? licenseUrl(view.license) : null
  // Known licenses read as words in the user's language; anything else shows as typed.
  const known = view.license
    ? LICENSE_DESCRIPTIONS[normalizeLicense(view.license)]
    : undefined
  const licenseText = known ? i18n._(known) : view.license

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
              {licenseText}
            </InlineLinkText>
          ) : (
            licenseText
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
