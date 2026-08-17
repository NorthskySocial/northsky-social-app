import {View} from 'react-native'
import {type InterpretedLabelValueDefinition} from '@atproto/api'
import {useLingui} from '@lingui/react/macro'

import {useGlobalLabelStrings} from '#/lib/moderation/useGlobalLabelStrings'
import {getLabelStrings} from '#/lib/moderation/useLabelInfo'
import {atoms as a} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'

/**
 * Optional refinement shown after the reporter picks a reason. It names the
 * Northsky label that fits, which the report carries in `modTool.meta`.
 *
 * The reporter can skip it, and can press the active option again to clear it,
 * so the step never blocks the report.
 */
export function NorthskyReportLabelPicker({
  definitions,
  selected,
  onSelect,
}: {
  definitions: InterpretedLabelValueDefinition[]
  selected?: string
  onSelect: (identifier?: string) => void
}) {
  const {t: l, i18n} = useLingui()
  const globalLabelStrings = useGlobalLabelStrings()

  if (!definitions.length) return null

  return (
    <View style={[a.gap_sm]}>
      <Text style={[a.text_sm, a.leading_snug]}>
        {l`Which best describes it? Optional.`}
      </Text>
      <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
        {definitions.map(definition => {
          const {name} = getLabelStrings(
            i18n.locale,
            globalLabelStrings,
            definition,
          )
          const isSelected = selected === definition.identifier
          return (
            <Button
              key={definition.identifier}
              testID={`report:modCustomLabel:${definition.identifier}`}
              label={l`Describe this report as ${name}`}
              size="small"
              color={isSelected ? 'primary' : 'secondary'}
              onPress={() =>
                onSelect(isSelected ? undefined : definition.identifier)
              }>
              <ButtonText>{name}</ButtonText>
            </Button>
          )
        })}
      </View>
    </View>
  )
}
