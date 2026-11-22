import {useRef, useState} from 'react'
import {type StyleProp, View, type ViewStyle} from 'react-native'
import {Image} from 'expo-image'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {useAutoplayDisabled, useExternalEmbedsPrefs} from '#/state/preferences'
import {atoms as a, useTheme} from '#/alf'
import {useDialogControl} from '#/components/Dialog'
import {EmbedConsentDialog} from '#/components/dialogs/EmbedConsent'
import {ConstrainedImage} from '#/components/images/AutoSizedImage'
import {MediaInsetBorder} from '#/components/MediaInsetBorder'
import {GifPresentationControls} from '#/components/Post/Embed/VideoEmbed/GifPresentationControls'
import {IS_WEB} from '#/env'
import {type app} from '#/lexicons'

export function GifdexEmbed({
  link,
  uri,
  style,
}: {
  link: app.bsky.embed.external.ViewExternal
  uri: string
  style?: StyleProp<ViewStyle>
}) {
  const t = useTheme()
  const {_} = useLingui()
  const autoplayDisabled = useAutoplayDisabled()
  const prefs = useExternalEmbedsPrefs()
  const consent = useDialogControl()
  const image = useRef<Image>(null)
  const [active, setActive] = useState(false)
  const [playing, setPlaying] = useState(!autoplayDisabled)
  const [loaded, setLoaded] = useState(false)
  const [ratio, setRatio] = useState(1)
  const allowed = prefs?.gifdex === 'show' || active
  const onPress = () => {
    if (!allowed) {
      consent.open()
      return
    }
    if (!IS_WEB) {
      if (playing) {
        void image.current?.stopAnimating()
      } else {
        void image.current?.startAnimating()
      }
    }
    setPlaying(!playing)
  }
  return (
    <View style={style}>
      <EmbedConsentDialog
        control={consent}
        source="gifdex"
        onAccept={() => setActive(true)}
      />
      <ConstrainedImage
        aspectRatio={Math.max(ratio, 0.5)}
        minMobileAspectRatio={14 / 9}>
        <View
          style={[
            a.flex_1,
            a.rounded_md,
            a.overflow_hidden,
            {backgroundColor: t.palette.black},
          ]}>
          <Image
            ref={image}
            source={allowed && playing ? uri : link.thumb}
            style={a.flex_1}
            contentFit="contain"
            autoplay={playing}
            accessibilityLabel={link.title}
            accessibilityHint={_(msg`Animated GIF`)}
            onLoad={event => {
              const {width, height} = event.source
              if (width > 0 && height > 0) setRatio(width / height)
              setLoaded(true)
            }}
          />
          <MediaInsetBorder />
          <GifPresentationControls
            onPress={onPress}
            isPlaying={allowed && playing}
            isLoading={allowed && !loaded}
          />
        </View>
      </ConstrainedImage>
    </View>
  )
}
