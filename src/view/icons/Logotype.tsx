import {type PathProps, type SvgProps} from 'react-native-svg'

import {usePalette} from '#/lib/hooks/usePalette'
// northsky: render the brand wordmark instead of the Bluesky logotype
import {BrandLogotype} from '#/brand/assets/Logotype'

export function Logotype({
  fill,
  ...rest
}: {fill?: PathProps['fill']} & SvgProps) {
  const pal = usePalette('default')

  // northsky: delegate to the brand-owned wordmark in src/brand/assets
  return <BrandLogotype fill={fill || pal.text.color} {...rest} />
}
