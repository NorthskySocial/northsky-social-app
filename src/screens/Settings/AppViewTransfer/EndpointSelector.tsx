import {View} from 'react-native'
import {useLingui} from '@lingui/react/macro'

import {atoms as a} from '#/alf'
import * as SegmentedControl from '#/components/forms/SegmentedControl'
import {Text} from '#/components/Typography'
import {TRANSFER_ENDPOINTS} from '#/features/appViewTransfer/endpoints'
import {type TransferEndpointId} from '#/features/appViewTransfer/types'

/**
 * Cut-down port of eurosky's AppViewSelector: the two fixed endpoints only,
 * no custom URL input and no DID-document validation.
 */
export function EndpointSelector({
  titleText,
  label,
  value,
  onChange,
}: {
  titleText: React.ReactNode
  label: string
  value: TransferEndpointId
  onChange: (value: TransferEndpointId) => void
}) {
  const endpointNames = useEndpointNames()

  return (
    <View style={[a.gap_sm, a.w_full]}>
      <Text style={[a.text_sm, a.font_semi_bold]}>{titleText}</Text>
      <SegmentedControl.Root<TransferEndpointId>
        type="radio"
        size="small"
        label={label}
        value={value}
        onChange={onChange}>
        {TRANSFER_ENDPOINTS.map(endpoint => {
          const name = endpointNames[endpoint.id]
          return (
            <SegmentedControl.Item
              key={endpoint.id}
              value={endpoint.id}
              label={name}>
              <SegmentedControl.ItemText numberOfLines={1}>
                {name}
              </SegmentedControl.ItemText>
            </SegmentedControl.Item>
          )
        })}
      </SegmentedControl.Root>
    </View>
  )
}

export function useEndpointNames(): Record<TransferEndpointId, string> {
  const {t: l} = useLingui()
  return {
    bluesky: l`Bluesky`,
    blacksky: l`Blacksky`,
  }
}
