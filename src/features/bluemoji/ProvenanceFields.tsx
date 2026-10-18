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
  licenseError,
  normalizeLicense,
  sourceError,
} from './provenance'

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
  return licenseError(license) ?? sourceError(source)
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
  const {t: l} = useLingui()
  const licenseProblem = licenseError(license)
  const sourceProblem = sourceError(source)
  const current = license.trim() ? normalizeLicense(license.trim()) : ''
  const blocksCopying = !!current && !licenseProblem && !isCopyable(current)

  return (
    <View style={[a.gap_md]}>
      <View>
        <TextField.LabelText>
          <Trans>License (optional)</Trans>
        </TextField.LabelText>
        <View style={[a.flex_row, a.flex_wrap, a.gap_xs, a.mb_sm]}>
          {COMMON_LICENSES.map(({id, label}) => (
            <Button
              key={id}
              label={label}
              size="tiny"
              color={current === id ? 'primary' : 'secondary'}
              variant="solid"
              onPress={() => onLicenseChange(current === id ? '' : id)}>
              <ButtonText>{CHIP[id] ?? id}</ButtonText>
            </Button>
          ))}
        </View>
        <TextField.Root isInvalid={!!licenseProblem}>
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
        {licenseProblem ? (
          <Text style={[a.text_sm, a.mt_xs, {color: t.palette.negative_500}]}>
            {licenseProblem}
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
        <TextField.Root isInvalid={!!sourceProblem}>
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
        {sourceProblem ? (
          <Text style={[a.text_sm, a.mt_xs, {color: t.palette.negative_500}]}>
            {sourceProblem}
          </Text>
        ) : null}
      </View>
    </View>
  )
}
