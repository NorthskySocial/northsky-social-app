import {forwardRef} from 'react'
import {type TextProps} from 'react-native'
import {type PathProps, type SvgProps} from 'react-native-svg'
import {Image} from 'expo-image'

<<<<<<< HEAD
import {useKawaiiMode} from '#/state/preferences/kawaii'
// northsky: render the brand logomark instead of the Bluesky butterfly
import {BrandLogo} from '#/brand/assets/Logo'
import {BRAND} from '#/brand/config'
=======
import {useLogoVariant} from '#/view/icons/useLogoVariant'
import {flatten, useTheme} from '#/alf'

const ratio = 57 / 64
>>>>>>> upstream/main

type Props = {
  allowVariants?: boolean
  fill?: PathProps['fill']
  style?: TextProps['style']
} & Omit<SvgProps, 'style'>

export const Logo = forwardRef(function LogoImpl(props: Props, ref) {
<<<<<<< HEAD
=======
  const t = useTheme()
  const {allowVariants = true, fill, ...rest} = props
  const gradient = fill === 'sky'
  const styles = flatten(props.style)
  const _fill = gradient
    ? 'url(#sky)'
    : fill || styles?.color || t.palette.primary_500
>>>>>>> upstream/main
  // @ts-ignore it's fiiiiine
  const size = parseInt(props.width || 32, 10)

  const logoVariant = useLogoVariant(allowVariants)

  if (logoVariant !== 'default') {
    const isJapanLogo = logoVariant === 'japan'
    return (
      <Image
        source={
          isJapanLogo
            ? require('../../../assets/icons/custom_logo_japan.svg')
            : size > 100
              ? require('../../../assets/kawaii.png')
              : require('../../../assets/kawaii_smol.png')
        }
        accessibilityLabel={BRAND.appName}
        accessibilityHint=""
        accessibilityIgnoresInvertColors
        style={[{height: size, aspectRatio: isJapanLogo ? 2 : 1.4}]}
      />
    )
  }

  // northsky: delegate to the brand-owned logomark in src/brand/assets
  return <BrandLogo ref={ref} {...props} />
})
