import {ScrollView, View} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {Trans, useLingui} from '@lingui/react/macro'

import {useSessionApi} from '#/state/session'
import {atoms as a, useBreakpoints, useTheme, web} from '#/alf'
import {createStaticClick, SimpleInlineLinkText} from '#/components/Link'
import {Outlet as PortalOutlet} from '#/components/Portal'
import {Text} from '#/components/Typography'
import {BottomSheetOutlet} from '#/../modules/bottom-sheet'
import {BrandLogo} from '#/brand/assets/Logo'
import {IS_WEB} from '#/env'

/**
 * The chrome the age gate screens share. It fills the whole app, so there is
 * no way past it other than answering or signing out.
 *
 * The bottom sheet and portal outlets are mounted here because the shell does
 * not mount its own while this screen replaces the router. Without them a
 * dialog opened from inside the gate would never appear.
 */
export function GateLayout({children}: {children: React.ReactNode}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const {gtPhone} = useBreakpoints()
  const insets = useSafeAreaInsets()
  const {logoutCurrentAccount} = useSessionApi()

  function onPressLogout() {
    if (IS_WEB) {
      /*
       * The navigator is about to unmount, so it cannot push the new URL in
       * time. Set it here and let the navigator read it when it remounts.
       * Copied from the age assurance NoAccessScreen for the same reason.
       */
      history.pushState(null, '', '/')
    }
    logoutCurrentAccount('AgeConfirmationGate')
  }

  return (
    <>
      <View style={[a.util_screen_outer, a.flex_1]}>
        <ScrollView
          contentContainerStyle={[
            a.px_2xl,
            {
              paddingTop: IS_WEB
                ? a.p_5xl.padding
                : insets.top + a.p_2xl.padding,
              paddingBottom: 100,
            },
          ]}>
          <View
            style={[
              a.mx_auto,
              a.w_full,
              web({
                maxWidth: 380,
                paddingTop: gtPhone ? '8vh' : undefined,
              }),
              {gap: 32},
            ]}>
            <View style={[a.align_start]}>
              <BrandLogo width={48} />
            </View>

            {children}

            <View style={[a.pt_lg, {maxWidth: 280}]}>
              <Text
                style={[
                  a.text_sm,
                  a.italic,
                  a.leading_snug,
                  t.atoms.text_contrast_medium,
                ]}>
                <Trans>
                  To use a different account,{' '}
                  <SimpleInlineLinkText
                    label={l`Click here to sign out`}
                    {...createStaticClick(() => {
                      onPressLogout()
                    })}
                    style={[a.italic]}>
                    sign out
                  </SimpleInlineLinkText>
                  .
                </Trans>
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>

      <BottomSheetOutlet />
      <PortalOutlet />
    </>
  )
}
