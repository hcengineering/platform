<script lang="ts">
  import love from '../../../plugin'
  import { ModernButton } from '@hcengineering/ui'
  import { endMeeting, leaveRoom } from '../../../utils'
  import { infos, myInfo, myOffice, rooms } from '../../../stores'
  import { isOffice, Room } from '@hcengineering/love'
  import { createEventDispatcher } from 'svelte'

  export let room: Room
  export let size: 'large' | 'medium' | 'small' | 'extra-small' | 'min' = 'large'
  export let noLabel: boolean = false

  const dispatch = createEventDispatcher()

  $: isMyOffice = isOffice(room) && $myInfo?.room === $myOffice?._id

  async function leave (): Promise<void> {
    if (isMyOffice && isOffice(room) && $myInfo !== undefined) {
      await endMeeting(room, $rooms, $infos, $myInfo)
    } else {
      await leaveRoom($myInfo, $myOffice)
    }
    dispatch('leave')
  }
</script>

<ModernButton
  icon={love.icon.LeaveRoom}
  label={noLabel ? undefined : isMyOffice ? love.string.EndMeeting : love.string.LeaveRoom}
  tooltip={{ label: isMyOffice ? love.string.EndMeeting : love.string.LeaveRoom, direction: 'top' }}
  kind={'negative'}
  {size}
  on:click={leave}
/>
