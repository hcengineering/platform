<script lang="ts">
  import love from '../../../plugin'
  import { ModernButton } from '@hcengineering/ui'
  import { myOffice } from '../../../stores'
  import { createEventDispatcher } from 'svelte'
  import { currentMeetingMinutes, leaveMeeting } from '../../../meetings'

  export let size: 'large' | 'medium' | 'small' | 'extra-small' | 'min' = 'large'
  export let noLabel: boolean = false

  const dispatch = createEventDispatcher()
  $: isMyOffice = $currentMeetingMinutes?.attachedTo === $myOffice?._id

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
