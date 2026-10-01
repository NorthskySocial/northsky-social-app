const client = {}
jest.mock('@sentry/browser', () => ({
  getClient: () => client,
  startBrowserTracingNavigationSpan: jest.fn(),
  startBrowserTracingPageLoadSpan: jest.fn(),
}))

import {
  startBrowserTracingNavigationSpan,
  startBrowserTracingPageLoadSpan,
} from '@sentry/browser'

import {navigationIntegration} from './sentryNavigation.web'

it('traces the first route and changed routes once per navigation container', () => {
  let name = 'Home'
  let listener = () => {}
  const navigation = {
    getCurrentRoute: () => ({name}),
    addListener: jest.fn((_event: 'state', callback: () => void) => {
      listener = callback
      return () => {}
    }),
  }
  navigationIntegration.registerNavigationContainer(navigation)
  navigationIntegration.registerNavigationContainer(navigation)
  expect(navigation.addListener).toHaveBeenCalledTimes(1)
  expect(startBrowserTracingPageLoadSpan).toHaveBeenCalledWith(client, {
    name: 'Home',
    attributes: {'sentry.source': 'route'},
  })
  listener()
  expect(startBrowserTracingNavigationSpan).not.toHaveBeenCalled()
  name = 'Profile'
  listener()
  expect(startBrowserTracingNavigationSpan).toHaveBeenCalledWith(client, {
    name: 'Profile',
    attributes: {'sentry.source': 'route'},
  })
})
