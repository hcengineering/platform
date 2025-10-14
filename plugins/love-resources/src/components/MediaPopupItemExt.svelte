<script lang="ts">
  import { Button } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import love from '../plugin'
  import { myInfo, myOffice } from '../stores'
  import { liveKitClient } from '../utils'
  import { lkSessionConnected, ScreenSharingState, screenSharingState } from '../liveKitClient'
  import MeetingHeader from './meeting/MeetingHeader.svelte'
  import { activeMeeting, activeMeetingMinutes, leaveMeeting } from '../meetings'

  const dispatch = createEventDispatcher()

  $: isMyOffice = $myInfo?.room === $myOffice?._id
  $: allowLeave = !isMyOffice && $myInfo?.room !== love.ids.Reception

  let leaving = false
  async function handleLeaveClick (): Promise<void> {
    leaving = true
    await leaveMeeting()
    dispatch('close')
  }

  let ending = false
  async function handleEndMeetingClick (): Promise<void> {
    ending = true
    await leaveMeeting()
    dispatch('close')
  }

  async function stopShare (): Promise<void> {
    await liveKitClient.setScreenShareEnabled(false)
  }
</script>

{#if $lkSessionConnected && $activeMeeting !== undefined}
  <div class="m-1 p-2">
    <div class="flex-col flex-grow flex-gap-0-5">
      <MeetingHeader meetingMinutes={$activeMeetingMinutes} />
      <div class="flex-between items-start flex-gap-2 mt-2">
        <!-- Avatars -->
        <div class="flex-row-center flex-gap-3">
          <!-- Leave Button -->
          {#if allowLeave || leaving}
            <Button
              icon={love.icon.LeaveRoom}
              kind={$screenSharingState === ScreenSharingState.Local ? 'regular' : 'dangerous'}
              size={'x-small'}
              label={view.string.Leave}
              showTooltip={{ label: love.string.LeaveRoom }}
              padding={'0 .5rem'}
              on:click={handleLeaveClick}
            />
          {:else if isMyOffice || ending}
            <Button
              icon={love.icon.LeaveRoom}
              kind={$screenSharingState === ScreenSharingState.Local ? 'regular' : 'dangerous'}
              size={'x-small'}
              label={love.string.EndMeeting}
              showTooltip={{ label: love.string.EndMeeting }}
              padding={'0 .5rem'}
              on:click={handleEndMeetingClick}
            />
          {/if}
          {#if $screenSharingState === ScreenSharingState.Local}
            <Button
              icon={love.icon.SharingEnabled}
              kind="dangerous"
              size={'x-small'}
              label={love.string.StopShare}
              showTooltip={{ label: love.string.StopShare }}
              padding={'0 .5rem'}
              on:click={stopShare}
            />
          {/if}
        </div>
      </div>
    </div>
  </div>

  <div class="separator" />
{/if}

<style lang="scss">
  .separator {
    border-top: 1px solid var(--theme-divider-color);
    width: 100%;
  }
</style>
