import {type PathProps, type SvgProps} from 'react-native-svg'

import {usePalette} from '#/lib/hooks/usePalette'
// northsky: render the brand logomark instead of the Bluesky butterfly
import {BrandLogo} from '#/brand/assets/Logo'

export function Logomark({
  fill,
  ...rest
}: {fill?: PathProps['fill']} & SvgProps) {
  const pal = usePalette('default')

  // northsky: delegate to the brand-owned logomark in src/brand/assets
  return <BrandLogo fill={fill || pal.text.color} {...rest} />
}
