import {View} from 'react-native'
import {Trans} from '@lingui/react/macro'
import {useQuery} from '@tanstack/react-query'

import {getTealStatus} from '#/lib/slingshot/client'
import {STALE} from '#/state/queries'
import {atoms as a, useTheme} from '#/alf'
import {MusicNote_Stroke2_Corner0_Rounded as MusicNoteIcon} from '#/components/icons/MusicNote'
import {Text} from '#/components/Typography'
import {main as tealStatusRecord} from '#/lexicons/fm/teal/actor/status'
import {useListeningToEnabled} from './state'

const DEFAULT_STATUS_EXPIRY_MS = 10 * 60 * 1000

export function ListeningToProfileStatus({did}: {did: string}) {
  const t = useTheme()
  const enabled = useListeningToEnabled()
  const query = useQuery({
    queryKey: ['listening-to', did],
    queryFn: async () => (await getTealStatus(did)) ?? null,
    enabled,
    retry: false,
    staleTime: STALE.MINUTES.ONE,
  })

  if (!query.data) return null

  const parsedStatus = tealStatusRecord.safeParse(query.data.value)
  if (!parsedStatus.success) return null

  const status = parsedStatus.value
  const statusTime = Date.parse(status.time)
  const expiry = status.expiry
    ? Date.parse(status.expiry)
    : statusTime
      ? statusTime + DEFAULT_STATUS_EXPIRY_MS
      : undefined
  if (expiry !== undefined && expiry <= Date.now()) return null

  const item = status.item
  const trackName = item.trackName
  const artistNames = item.artists.map(artist => artist.artistName)

  if (!trackName) return null

  const artists = artistNames?.filter(Boolean).join(', ')

  return (
    <View style={[a.flex_row, a.align_center, a.gap_xs, a.mb_xs]}>
      <MusicNoteIcon
        width={16}
        height={16}
        style={{color: t.palette.primary_500}}
      />
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]} numberOfLines={1}>
        <Text style={[a.font_bold, t.atoms.text_contrast_high]}>
          <Trans>Listening to</Trans>
        </Text>
        {` · ${trackName}${artists ? ` - ${artists}` : ''}`}
      </Text>
    </View>
  )
}
