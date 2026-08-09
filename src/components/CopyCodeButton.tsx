import {useEffect, useState} from 'react'
import * as Clipboard from 'expo-clipboard'
import {useLingui} from '@lingui/react/macro'

import {atoms as a} from '#/alf'
import {Button, ButtonIcon} from '#/components/Button'
import {Check_Stroke2_Corner0_Rounded as Check} from '#/components/icons/Check'
import {Copy_Stroke2_Corner2_Rounded as Copy} from '#/components/icons/Copy'

/**
 * northsky: copy-to-clipboard control for a rendered code block.
 *
 * Code blocks otherwise have no way out - the text is not reachable by
 * selection on native - so this is the affordance that makes a shared snippet
 * usable. Sits in the corner of the block via absolute positioning.
 */
export function CopyCodeButton({value}: {value: string}) {
  const {t: l} = useLingui()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timeout)
  }, [copied])

  return (
    <Button
      label={copied ? l`Copied` : l`Copy code`}
      size="small"
      color="secondary"
      variant="ghost"
      shape="round"
      style={[a.absolute, {top: 2, right: 2}]}
      onPress={() => {
        void Clipboard.setStringAsync(value)
        setCopied(true)
      }}>
      <ButtonIcon icon={copied ? Check : Copy} size="sm" />
    </Button>
  )
}
