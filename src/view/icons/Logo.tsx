import {forwardRef} from 'react'
import {type TextProps} from 'react-native'
import {type PathProps, type SvgProps} from 'react-native-svg'
import {Image} from 'expo-image'

import {useKawaiiMode} from '#/state/preferences/kawaii'
// northsky: render the brand logomark instead of the Bluesky butterfly
import {BrandLogo} from '#/brand/assets/Logo'
import {BRAND} from '#/brand/config'

type Props = {
  fill?: PathProps['fill']
  style?: TextProps['style']
} & Omit<SvgProps, 'style'>

export const Logo = forwardRef(function LogoImpl(props: Props, ref) {
  // @ts-ignore it's fiiiiine
  const size = parseInt(props.width || 32, 10)

  const isKawaii = useKawaiiMode()

  if (isKawaii) {
    return (
      <Image
        source={
          size > 100
            ? require('../../../assets/kawaii.png')
            : require('../../../assets/kawaii_smol.png')
        }
        accessibilityLabel={BRAND.appName}
        accessibilityHint=""
        accessibilityIgnoresInvertColors
        style={[{height: size, aspectRatio: 1.4}]}
      />
    )
  }

  // northsky: delegate to the brand-owned logomark in src/brand/assets
  return <BrandLogo ref={ref} {...props} />
})
