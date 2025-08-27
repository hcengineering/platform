<script lang="ts">
  import { Avatar, getPersonByPersonRefStore } from '@hcengineering/contact-resources'
  import { isOffice } from '@hcengineering/love'
  import { Button } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import love from '../plugin'
  import { currentRoom, infos, myInfo, myOffice, rooms } from '../stores'
  import { endMeeting, isSharingEnabled, leaveRoom, liveKitClient } from '../utils'
  import { lkSessionConnected } from '../liveKitClient'
  import MeetingHeader from './meeting/MeetingHeader.svelte'

  export let limit: number = 4

  const dispatch = createEventDispatcher()

  $: isMyOffice = $myInfo?.room === $myOffice?._id
  $: allowLeave = !isMyOffice && $myInfo?.room !== love.ids.Reception

  let leaving = false
  async function handleLeaveClick (): Promise<void> {
    leaving = true
    await leaveRoom($myInfo, $myOffice)
    dispatch('close')
  }

  let ending = false
  async function handleEndMeetingClick (): Promise<void> {
    ending = true
    const room = $currentRoom
    if (room !== undefined && isOffice(room) && $myInfo !== undefined) {
      await endMeeting(room, $rooms, $infos, $myInfo)
    }
    dispatch('close')
  }

  async function stopShare (): Promise<void> {
    await liveKitClient.setScreenShareEnabled(false)
  }

  $: participants = $infos.filter((p) => p.room === $currentRoom?._id)
  $: personByRefStore = getPersonByPersonRefStore(participants.map((p) => p.person))
</script>

{#if $lkSessionConnected && $currentRoom != null}
  {@const overLimit = participants.length > limit}

  <div class="m-1 p-2">
    <div class="flex-col flex-grow flex-gap-0-5">
      <MeetingHeader room={$currentRoom} />
      <div class="flex-between items-start flex-gap-2 mt-2">
        <!-- Avatars -->
        {#if overLimit}
          <div class="hulyCombineAvatars-container">
            {#each participants.slice(0, limit) as participant, i (participant._id)}
              <div
                class="hulyCombineAvatar x-small"
                data-over={i === limit - 1 && overLimit ? `+${participants.length - limit + 1}` : undefined}
              >
                <Avatar
                  name={$personByRefStore.get(participant.person)?.name ?? participant.name}
                  size={'x-small'}
                  person={$personByRefStore.get(participant.person)}
                />
              </div>
            {/each}
          </div>
        {:else}
          <div class="flex-row-center flex-gap-0-5">
            {#each participants as participant (participant._id)}
              <Avatar
                name={$personByRefStore.get(participant.person)?.name ?? participant.name}
                size={'x-small'}
                person={$personByRefStore.get(participant.person)}
              />
            {/each}
          </div>
        {/if}

        <div class="flex-row-center flex-gap-3">
          <!-- Leave Button -->
          {#if allowLeave || leaving}
            <Button
              icon={love.icon.LeaveRoom}
              kind={$isSharingEnabled ? 'regular' : 'dangerous'}
              size={'x-small'}
              label={view.string.Leave}
              showTooltip={{ label: love.string.LeaveRoom }}
              padding={'0 .5rem'}
              on:click={handleLeaveClick}
            />
          {:else if isMyOffice || ending}
            <Button
              icon={love.icon.LeaveRoom}
              kind={$isSharingEnabled ? 'regular' : 'dangerous'}
              size={'x-small'}
              label={love.string.EndMeeting}
              showTooltip={{ label: love.string.EndMeeting }}
              padding={'0 .5rem'}
              on:click={handleEndMeetingClick}
            />
          {/if}
          {#if $isSharingEnabled}
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
