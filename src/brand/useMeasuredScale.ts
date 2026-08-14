import {useState} from 'react'
import {type LayoutChangeEvent} from 'react-native'

import {scaleForDelta} from './motionScale'

/**
 * Measures an element and returns the scale that deforms it by `deltaPx` on
 * each axis. A negative `deltaPx` shrinks the element.
 *
 * Use this for press or hover feedback on an element whose size is not known
 * ahead of time. A fixed ratio moves a wide element much further than a narrow
 * one, so one ratio cannot suit both.
 *
 * `SquishyPressable` solves the same problem, but it holds the size in
 * Reanimated shared values so that layout never causes a render. Prefer that
 * component when the motion runs on the UI thread. This hook is for call sites
 * that drive the transform from a CSS transition instead, which needs the
 * scale during render. That costs one render per size change, so the state
 * only updates when the size actually changes. Callers that already know their
 * size must skip this hook and call `scaleForDelta` directly.
 */
export function useMeasuredScale(deltaPx: number) {
  const [size, setSize] = useState({width: 0, height: 0})

  return {
    onLayout: (e: LayoutChangeEvent) => {
      const {width, height} = e.nativeEvent.layout
      setSize(prev =>
        prev.width === width && prev.height === height ? prev : {width, height},
      )
    },
    scaleX: scaleForDelta(size.width, deltaPx),
    scaleY: scaleForDelta(size.height, deltaPx),
  }
}
