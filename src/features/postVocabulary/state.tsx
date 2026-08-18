import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import {device} from '#/storage'

export type PostNaming = 'post' | 'skeet'

/**
 * Northsky calls a post a skeet. The user can ask for the plain wording
 * instead, so the app ships the skeet wording and lets them opt out.
 */
export const DEFAULT_POST_NAMING: PostNaming = 'skeet'

const stateContext = createContext<PostNaming>(DEFAULT_POST_NAMING)
stateContext.displayName = 'PostNamingStateContext'

const setContext = createContext<(naming: PostNaming) => void>(() => {})
setContext.displayName = 'PostNamingSetContext'

/**
 * Reads the naming out of device storage once and shares it through context.
 *
 * `useStorage` cannot do this job here. It opens an MMKV listener per caller,
 * and it rebuilds that listener on every render because its scope argument is a
 * new array each time. The repost button and the feed reason line render once
 * per feed row, so a direct `useStorage` call would open a listener per row.
 */
export function Provider({children}: React.PropsWithChildren<{}>) {
  const [naming, setNaming] = useState<PostNaming>(
    () => device.get(['postNaming']) ?? DEFAULT_POST_NAMING,
  )

  useEffect(() => {
    const sub = device.addOnValueChangedListener(['postNaming'], () => {
      setNaming(device.get(['postNaming']) ?? DEFAULT_POST_NAMING)
    })
    return () => sub.remove()
  }, [])

  const setNamingWrapped = useCallback((next: PostNaming) => {
    setNaming(next)
    device.set(['postNaming'], next)
  }, [])

  return (
    <stateContext.Provider value={naming}>
      <setContext.Provider value={setNamingWrapped}>
        {children}
      </setContext.Provider>
    </stateContext.Provider>
  )
}

export function usePostNaming() {
  return useContext(stateContext)
}

export function useSetPostNaming() {
  return useContext(setContext)
}
