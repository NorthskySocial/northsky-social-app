// northsky: persists the dismissal of the unencrypted-chat warning
import {device, useStorage} from '#/storage'

export function useChatServiceWarningDismissed() {
  const [chatServiceWarningDismissed = false, setChatServiceWarningDismissed] =
    useStorage(device, ['chatServiceWarningDismissed'])

  return [chatServiceWarningDismissed, setChatServiceWarningDismissed] as const
}
