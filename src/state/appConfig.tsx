import {createContext, useContext} from 'react'
import {QueryClient, useQuery} from '@tanstack/react-query'

const qc = new QueryClient()
const appConfigQueryKey = ['app-config']

/**
 * Matches the types defined in our `app-config` worker
 */
type AppConfigResponse = {
  liveNow: {
    allow: string[]
    exceptions: {
      did: string
      allow: string[]
    }[]
  }
}

export const DEFAULT_APP_CONFIG_RESPONSE: AppConfigResponse = {
  liveNow: {
    allow: [],
    exceptions: [],
  },
}

/*
 * northsky: do not call the Bluesky app-config worker.
 * The app uses the default config instead.
 */
function fetchAppConfig(): Promise<AppConfigResponse | null> {
  return Promise.resolve(DEFAULT_APP_CONFIG_RESPONSE)
}

const Context = createContext<AppConfigResponse>(DEFAULT_APP_CONFIG_RESPONSE)

export function Provider({children}: React.PropsWithChildren<{}>) {
  const {data} = useQuery<AppConfigResponse | null>(
    {
      staleTime: Infinity,
      queryKey: appConfigQueryKey,
      refetchInterval: query => {
        // refetch regularly if fetch failed, otherwise never refetch
        return query.state.status === 'error' ? 60e3 : Infinity
      },
      async queryFn() {
        return fetchAppConfig()
      },
    },
    qc,
  )
  return (
    <Context.Provider value={data ?? DEFAULT_APP_CONFIG_RESPONSE}>
      {children}
    </Context.Provider>
  )
}

export async function prefetchAppConfig() {
  try {
    const data = await fetchAppConfig()
    if (data) {
      qc.setQueryData(appConfigQueryKey, data)
    }
  } catch {}
}

export function useAppConfig() {
  const ctx = useContext(Context)
  if (!ctx) {
    throw new Error('useAppConfig must be used within a Provider')
  }
  return ctx
}
