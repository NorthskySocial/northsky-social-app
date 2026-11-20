import {Image, type ImageProps} from 'expo-image'

import {useMediaFallback} from './useMediaFallback'

export function PostImage({
  uri,
  ...props
}: Omit<ImageProps, 'source'> & {uri: string}) {
  const media = useMediaFallback(uri)
  return (
    <Image
      {...props}
      source={{uri: media.uri}}
      onLoad={e => {
        media.loaded()
        props.onLoad?.(e)
      }}
      onError={e => {
        if (!media.retry()) props.onError?.(e)
      }}
    />
  )
}
