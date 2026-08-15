import {useEffect, useState} from 'react'
import {Pressable, View} from 'react-native'
import {ImageBackground} from 'expo-image'
import {LinearGradient} from 'expo-linear-gradient'
import {Trans, useLingui} from '@lingui/react/macro'
import {FocusGuards, FocusScope} from 'radix-ui/internal'

import {useLoggedOutViewControls} from '#/state/shell/logged-out'
import {Logo} from '#/view/icons/Logo'
import {atoms as a, flatten, useBreakpoints, web} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {type WelcomeModalControl} from '#/components/hooks/useWelcomeModal.shared'
import {TimesLarge_Stroke2_Corner0_Rounded as XIcon} from '#/components/icons/Times'
import {Text} from '#/components/Typography'
import {useAnalytics} from '#/analytics'
import {BRAND, DisplayText} from '#/brand'
import {NORTHSKY_DARK_PALETTE} from '#/brand/palette'

// northsky: webp brand background for the logged-out welcome modal
const welcomeModalBg = require('../../assets/images/welcome-modal-bg.webp')

interface WelcomeModalProps {
  control: WelcomeModalControl
}

export function WelcomeModal({control}: WelcomeModalProps) {
  const {t: l} = useLingui()
  const ax = useAnalytics()
  const {requestSwitchToAccount} = useLoggedOutViewControls()
  const {gtMobile} = useBreakpoints()
  const [isExiting, setIsExiting] = useState(false)
  const [signInLinkHovered, setSignInLinkHovered] = useState(false)

  const fadeOutAndClose = (callback?: () => void) => {
    setIsExiting(true)
    setTimeout(() => {
      control.close()
      if (callback) callback()
    }, 150)
  }

  useEffect(() => {
    if (control.isOpen) {
      ax.metric('welcomeModal:presented', {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [control.isOpen])

  const onPressCreateAccount = () => {
    ax.metric('welcomeModal:signupClicked', {})
    control.close()
    requestSwitchToAccount({requestedAccount: 'new'})
  }

  const onPressExplore = () => {
    ax.metric('welcomeModal:exploreClicked', {})
    fadeOutAndClose()
  }

  const onPressSignIn = () => {
    ax.metric('welcomeModal:signinClicked', {})
    control.close()
    requestSwitchToAccount({requestedAccount: 'existing'})
  }

  FocusGuards.useFocusGuards()

  return (
    <View
      role="dialog"
      aria-modal
      style={[
        a.fixed,
        a.inset_0,
        a.justify_center,
        a.align_center,
        {zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.2)'},
        web({backdropFilter: 'blur(15px)'}),
        isExiting ? a.fade_out : a.fade_in,
      ]}>
      <FocusScope.FocusScope asChild loop trapped>
        <View
          style={flatten([
            {
              maxWidth: 800,
              maxHeight: 600,
              width: '90%',
              height: '90%',
              // northsky: background color so text is readable when image hasn't loaded
              backgroundColor: NORTHSKY_DARK_PALETTE.contrast_0,
            },
            a.rounded_lg,
            a.overflow_hidden,
            a.zoom_in,
          ])}>
          <ImageBackground
            source={welcomeModalBg}
            style={[a.flex_1, a.justify_center]}
            contentFit="cover">
            {/* northsky: scrim so text stays readable over the aurora */}
            <LinearGradient
              colors={[
                'rgba(31, 11, 53, 0.60)',
                'rgba(31, 11, 53, 0.40)',
                'rgba(31, 11, 53, 0.00)',
              ]}
              locations={[0, 0.55, 1]}
              style={[a.absolute, a.inset_0]}
            />
            {/* northsky: move content up so it doesn't overlap too much with trees */}
            <View
              style={[a.gap_2xl, a.align_center, a.p_4xl, {paddingBottom: 96}]}>
              <View
                style={[
                  a.flex_row,
                  a.align_center,
                  a.justify_center,
                  a.w_full,
                  a.p_0,
                ]}>
                <View style={[a.flex_row, a.align_center, a.gap_xs]}>
                  <Logo allowVariants={false} width={26} />
                  {/* northsky: brand display font, white for contrast */}
                  <DisplayText
                    style={[
                      a.text_2xl,
                      a.user_select_none,
                      {color: NORTHSKY_DARK_PALETTE.contrast_1000},
                    ]}>
                    {BRAND.appName}
                  </DisplayText>
                </View>
              </View>
              <View style={[a.gap_sm, a.align_center, a.pt_2xl, a.pb_xl]}>
                {/* northsky: brand display font */}
                <DisplayText
                  style={[
                    gtMobile ? a.text_4xl : a.text_3xl,
                    a.text_center,
                    {color: NORTHSKY_DARK_PALETTE.primary_500},
                    web({lineHeight: 1.2}),
                  ]}>
                  <Trans>Welcome to safer skies!</Trans>
                </DisplayText>
              </View>
              <View style={[a.gap_md, a.align_center]}>
                <View>
                  <Button
                    onPress={onPressCreateAccount}
                    label={l`Create account`}
                    size="large"
                    color="primary"
                    style={{
                      width: 200,
                      // northsky: brand purple (static light surface)
                      backgroundColor: '#9A45EC',
                    }}>
                    <ButtonText>
                      <Trans>Create account</Trans>
                    </ButtonText>
                  </Button>
                  <Button
                    onPress={onPressExplore}
                    label={l`Explore the app`}
                    size="large"
                    color="primary"
                    variant="ghost"
                    style={[a.bg_transparent, {width: 200}]}
                    hoverStyle={[a.bg_transparent]}>
                    {({hovered}) => (
                      <ButtonText
                        style={[
                          hovered && [a.underline],
                          // northsky: dark-theme primary for contrast over background image
                          {color: NORTHSKY_DARK_PALETTE.primary_500},
                        ]}>
                        <Trans>Explore the app</Trans>
                      </ButtonText>
                    )}
                  </Button>
                </View>
                <View style={[a.align_center, {minWidth: 200}]}>
                  <Text
                    style={[
                      a.text_md,
                      a.text_center,
                      // northsky: static white for contrast over background image
                      {
                        color: NORTHSKY_DARK_PALETTE.contrast_1000,
                        lineHeight: 24,
                      },
                    ]}>
                    <Trans>Already have an account?</Trans>{' '}
                    <Pressable
                      onPress={onPressSignIn}
                      onPointerEnter={() => setSignInLinkHovered(true)}
                      onPointerLeave={() => setSignInLinkHovered(false)}
                      accessibilityRole="button"
                      accessibilityLabel={l`Sign in`}
                      accessibilityHint="">
                      <Text
                        style={[
                          a.font_medium,
                          {
                            // northsky: dark-theme primary for contrast over background image
                            color: NORTHSKY_DARK_PALETTE.primary_500,
                            fontSize: undefined,
                          },
                          signInLinkHovered && a.underline,
                        ]}>
                        <Trans>Sign in</Trans>
                      </Text>
                    </Pressable>
                  </Text>
                </View>
              </View>
            </View>
            <Button
              label={l`Close welcome modal`}
              style={[
                a.absolute,
                {
                  top: 8,
                  right: 8,
                },
                a.bg_transparent,
              ]}
              hoverStyle={[a.bg_transparent]}
              onPress={() => {
                ax.metric('welcomeModal:dismissed', {})
                fadeOutAndClose()
              }}
              color="secondary"
              size="small"
              variant="ghost"
              shape="round">
              {({hovered, pressed, focused}) => (
                <XIcon
                  size="md"
                  style={{
                    // northsky: static white for contrast over background image
                    color: NORTHSKY_DARK_PALETTE.contrast_1000,
                    opacity: hovered || pressed || focused ? 1 : 0.7,
                  }}
                />
              )}
            </Button>
          </ImageBackground>
        </View>
      </FocusScope.FocusScope>
    </View>
  )
}
