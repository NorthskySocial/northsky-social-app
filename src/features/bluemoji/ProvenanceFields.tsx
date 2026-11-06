import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as TextField from '#/components/forms/TextField'
import {Text} from '#/components/Typography'
import {
  ALL_RIGHTS_RESERVED,
  COMMON_LICENSES,
  isCopyable,
  normalizeLicense,
} from './provenance'
import {
  ALL_RIGHTS_RESERVED_CHIP,
  LICENSE_DESCRIPTIONS,
  licenseProblem,
  sourceProblem,
} from './provenanceMessages'

/** Short chip text for the common licenses; the full label is the a11y label. */
const CHIP: Record<string, string> = {
  'CC0-1.0': 'CC0',
  'CC-BY-4.0': 'CC BY',
  'CC-BY-SA-4.0': 'CC BY-SA',
  'CC-BY-NC-4.0': 'CC BY-NC',
  'CC-BY-NC-SA-4.0': 'CC BY-NC-SA',
  'CC-BY-ND-4.0': 'CC BY-ND',
  'CC-BY-NC-ND-4.0': 'CC BY-NC-ND',
  MIT: 'MIT',
  'Apache-2.0': 'Apache 2.0',
  Unlicense: 'Unlicense',
  [ALL_RIGHTS_RESERVED]: 'All rights reserved',
}

/**
 * Whether these two values can be saved. Both are optional, so empty is fine;
 * what is typed must be well formed.
 */
export function provenanceProblem(license: string, source: string) {
  return licenseProblem(license) ?? sourceProblem(source)
}

/**
 * License (an SPDX expression) and source URL for an emoji or pack. Both are
 * optional and are the creator's own claim; the Bluemoji standard (RFC 0006)
 * does not verify them. Common licenses are one tap, and anything else can be
 * typed as an SPDX expression.
 */
export function ProvenanceFields({
  license,
  source,
  onLicenseChange,
  onSourceChange,
}: {
  license: string
  source: string
  onLicenseChange: (value: string) => void
  onSourceChange: (value: string) => void
}) {
  const t = useTheme()
  const {t: l, i18n} = useLingui()
  const licenseMessage = licenseProblem(license)
  const sourceMessage = sourceProblem(source)
  const current = license.trim() ? normalizeLicense(license.trim()) : ''
  const blocksCopying = !!current && !licenseMessage && !isCopyable(current)

  return (
    <View style={[a.gap_md]}>
      <View>
        <TextField.LabelText>
          <Trans>License (optional)</Trans>
        </TextField.LabelText>
        <View style={[a.flex_row, a.flex_wrap, a.gap_xs, a.mb_sm]}>
          {COMMON_LICENSES.map(({id}) => (
            <Button
              key={id}
              label={i18n._(LICENSE_DESCRIPTIONS[id])}
              size="tiny"
              color={current === id ? 'primary' : 'secondary'}
              variant="solid"
              onPress={() => onLicenseChange(current === id ? '' : id)}>
              <ButtonText>
                {id === ALL_RIGHTS_RESERVED
                  ? i18n._(ALL_RIGHTS_RESERVED_CHIP)
                  : (CHIP[id] ?? id)}
              </ButtonText>
            </Button>
          ))}
        </View>
        <TextField.Root isInvalid={!!licenseMessage}>
          <TextField.Input
            label={l`License as an SPDX expression`}
            placeholder={l`CC-BY-4.0, or MIT OR Apache-2.0`}
            value={license}
            onChangeText={onLicenseChange}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={128}
          />
        </TextField.Root>
        {licenseMessage ? (
          <Text style={[a.text_sm, a.mt_xs, {color: t.palette.negative_500}]}>
            {i18n._(licenseMessage)}
          </Text>
        ) : (
          <Text style={[a.text_xs, a.mt_xs, t.atoms.text_contrast_medium]}>
            {!current ? (
              <Trans>
                With no license, other people cannot copy this to their own
                collection. That is not the same as public domain.
              </Trans>
            ) : blocksCopying ? (
              <Trans>Other people will not be able to copy this.</Trans>
            ) : (
              <Trans>Other people can copy this under this license.</Trans>
            )}
          </Text>
        )}
      </View>

      <View>
        <TextField.LabelText>
          <Trans>Source (optional)</Trans>
        </TextField.LabelText>
        <TextField.Root isInvalid={!!sourceMessage}>
          <TextField.Input
            label={l`Where this was originally published`}
            placeholder={l`https://example.com/the-original`}
            value={source}
            onChangeText={onSourceChange}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            maxLength={2048}
          />
        </TextField.Root>
        {sourceMessage ? (
          <Text style={[a.text_sm, a.mt_xs, {color: t.palette.negative_500}]}>
            {i18n._(sourceMessage)}
          </Text>
        ) : null}
      </View>
    </View>
  )
}
