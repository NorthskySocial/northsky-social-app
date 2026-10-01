import {
  getClient,
  startBrowserTracingNavigationSpan,
  startBrowserTracingPageLoadSpan,
} from '@sentry/browser'

/** The navigation methods needed to trace web routes without loading the RN SDK. */
type Navigation = {
  getCurrentRoute(): {name: string} | undefined
  addListener(event: 'state', listener: () => void): () => void
}

const registered = new WeakSet<Navigation>()

export const navigationIntegration = {
  registerNavigationContainer(navigation: Navigation) {
    if (registered.has(navigation)) return
    registered.add(navigation)
    let previousRoute: string | undefined
    const traceRoute = (initial = false) => {
      const name = navigation.getCurrentRoute()?.name
      if (!name || name === previousRoute) return
      previousRoute = name
      const client = getClient()
      if (!client) return
      const options = {name, attributes: {'sentry.source': 'route' as const}}
      if (initial) {
        startBrowserTracingPageLoadSpan(client, options)
      } else {
        startBrowserTracingNavigationSpan(client, options)
      }
    }
    traceRoute(true)
    navigation.addListener('state', () => traceRoute())
  },
}
