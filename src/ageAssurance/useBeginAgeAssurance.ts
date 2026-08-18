import {Platform} from 'react-native'
import {type AppBskyAgeassuranceBegin, AtpAgent} from '@atproto/api'
import {useMutation} from '@tanstack/react-query'

import {wait} from '#/lib/async/wait'
import {isNetworkError} from '#/lib/hooks/useCleanError'
import {useAgent, useAppview} from '#/state/session'
import {usePatchAgeAssuranceServerState} from '#/ageAssurance'
import {logger} from '#/ageAssurance/logger'
import {useAnalytics} from '#/analytics'
import {useGeolocation} from '#/geolocation'

export function useBeginAgeAssurance() {
  const ax = useAnalytics()
  const agent = useAgent()
  const appview = useAppview() // northsky: appview routed for this account
  const geolocation = useGeolocation()
  const patchAgeAssuranceStateResponse = usePatchAgeAssuranceServerState()

  return useMutation({
    async mutationFn(
      props: Omit<
        AppBskyAgeassuranceBegin.InputSchema,
        'countryCode' | 'regionCode'
      >,
    ) {
      const countryCode = geolocation?.countryCode?.toUpperCase()
      const regionCode = geolocation?.regionCode?.toUpperCase()
      if (!countryCode) {
        throw new Error(`Geolocation not available, cannot init age assurance.`)
      }

      const {
        data: {token},
      } = await agent.com.atproto.server.getServiceAuth({
        // northsky: the token audience must match the appview that gets it
        aud: appview.did,
        lxm: `app.bsky.ageassurance.begin`,
      })

      const appView = new AtpAgent({service: appview.url})
      appView.sessionManager.session = {...agent.session!}
      appView.sessionManager.session.accessJwt = token
      appView.sessionManager.session.refreshJwt = ''

      ax.metric('ageAssurance:api:begin', {
        platform: Platform.OS,
        countryCode,
        regionCode,
      })

      /*
       * 2s wait is good actually. Email sending takes a hot sec and this helps
       * ensure the email is ready for the user once they open their inbox.
       */
      const {data} = await wait(
        2e3,
        appView.app.bsky.ageassurance.begin({
          ...props,
          countryCode,
          regionCode,
        }),
      )

      // Just keeps this in sync, not necessarily used right now
      patchAgeAssuranceStateResponse(data)
    },
    onError(e) {
      if (!isNetworkError(e)) {
        logger.error(`useBeginAgeAssurance failed`, {
          safeMessage: e,
        })
      }
    },
  })
}
