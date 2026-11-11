import {useSafeAreaInsets} from 'react-native-safe-area-context'

import {useWebMediaQueries} from '#/lib/hooks/useWebMediaQueries'
import {clamp} from '#/lib/numbers'
import {useSession} from '#/state/session'
import {useShellLayout} from '#/state/shell/shell-layout'
import {IS_WEB} from '#/env'

/** Bar content height, excluding safe area padding. */
const BAR_HEIGHT = 60
/** Content gained by the extra padding the native bar adds on insets between these bounds. */
const NATIVE_MAX_EXTRA = 15

export function useBottomBarOffset(modifier: number = 0) {
  const {isTabletOrDesktop} = useWebMediaQueries()
  const {bottom: bottomInset} = useSafeAreaInsets()
  const {hasSession} = useSession()
  const {footerHeight} = useShellLayout()
  const hasNoBottomBar = isTabletOrDesktop && (IS_WEB || hasSession)
  if (hasNoBottomBar) return modifier
  // northsky: the web bar pads with env(safe-area-inset-bottom), which the
  // hook cannot read (insets are 0 in browsers). Measure the rendered bar
  // instead so content clears it; fall back when no bar is on screen.
  if (IS_WEB) {
    const measured = footerHeight.get()
    return (measured > 0 ? measured : BAR_HEIGHT) + modifier
  }
  return (
    clamp(BAR_HEIGHT + bottomInset, BAR_HEIGHT, BAR_HEIGHT + NATIVE_MAX_EXTRA) +
    modifier
  )
}
