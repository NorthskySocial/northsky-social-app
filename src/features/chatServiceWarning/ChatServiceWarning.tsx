import {type StyleProp, type ViewStyle} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import * as Admonition from '#/components/Admonition'
import {Button, ButtonIcon} from '#/components/Button'
import {TimesLarge_Stroke2_Corner0_Rounded as XIcon} from '#/components/icons/Times'
import {InlineLinkText} from '#/components/Link'
import {useChatServiceWarningDismissed} from '#/storage/hooks/chat-service-warning-dismissed'

/**
 * One-time warning that the chat service is operated by Bluesky and is not
 * end-to-end encrypted. The dismissal persists per device.
 */
export function ChatServiceWarning({style}: {style?: StyleProp<ViewStyle>}) {
  const {t: l} = useLingui()
  const [dismissed, setDismissed] = useChatServiceWarningDismissed()

  if (dismissed) return null

  return (
    <Admonition.Outer type="warning" style={style}>
      <Admonition.Row>
        <Admonition.Icon />
        <Admonition.Content>
          <Admonition.Text>
            <Trans>
              This chat service is operated by Bluesky and messages are not
              encrypted. <br />
              For private conversations, we recommend an end-to-end encrypted
              service like{' '}
              <InlineLinkText
                to="/profile/germnetwork.com"
                label={l`View the Germ Network profile`}>
                @germnetwork.com
              </InlineLinkText>{' '}
              or{' '}
              <InlineLinkText
                to="/profile/signal.org"
                label={l`View the Signal profile`}>
                @signal.org
              </InlineLinkText>
              .
            </Trans>
          </Admonition.Text>
        </Admonition.Content>
        <Button
          label={l`Dismiss chat service warning`}
          testID="chatServiceWarningDismissBtn"
          size="tiny"
          shape="round"
          variant="ghost"
          color="secondary"
          onPress={() => setDismissed(true)}>
          <ButtonIcon icon={XIcon} />
        </Button>
      </Admonition.Row>
    </Admonition.Outer>
  )
}
