<script lang="ts">
  import love from '../../../plugin'
  import { ModernButton } from '@hcengineering/ui'
  import { myInfo, myOffice } from '../../../stores'
  import { isOffice, Room } from '@hcengineering/love'
  import { createEventDispatcher } from 'svelte'
  import { leaveMeeting } from '../../../meetings'

  export let room: Room | undefined
  export let size: 'large' | 'medium' | 'small' | 'extra-small' | 'min' = 'large'
  export let noLabel: boolean = false

  const dispatch = createEventDispatcher()

  $: isMyOffice = room !== undefined && isOffice(room) && $myInfo?.room === $myOffice?._id

  async function leave (): Promise<void> {
    await leaveMeeting()
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
