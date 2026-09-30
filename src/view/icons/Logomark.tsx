import {type PathProps, type SvgProps} from 'react-native-svg'

import {usePalette} from '#/lib/hooks/usePalette'
// northsky: render the brand logomark instead of the Bluesky butterfly
import {BrandLogo} from '#/brand/assets/Logo'

export function Logomark({
  fill,
  ...rest
}: {fill?: PathProps['fill']} & SvgProps) {
  const pal = usePalette('default')
<<<<<<< HEAD
=======
  // @ts-expect-error it's fiiiiine
  const size = parseInt(rest.width || 32)
>>>>>>> upstream/main

  // northsky: delegate to the brand-owned logomark in src/brand/assets
  return <BrandLogo fill={fill || pal.text.color} {...rest} />
}
