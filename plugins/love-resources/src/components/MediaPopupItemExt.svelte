<script lang="ts">
  import { Avatar, personByIdStore } from '@hcengineering/contact-resources'
  import { isOffice } from '@hcengineering/love'
  import { ModernButton } from '@hcengineering/ui'
  import love from '../plugin'
  import { currentRoom, infos, myInfo, myOffice, rooms, currentMeetingMinutes } from '../stores'
  import { endMeeting, isCurrentInstanceConnected, leaveRoom } from '../utils'
  import { DocNavLink } from '@hcengineering/view-resources'
  import { onMount } from 'svelte'

  export let limit: number = 8

  $: isMyOffice = $myInfo?.room === $myOffice?._id
  $: allowLeave = !isMyOffice && $myInfo?.room !== love.ids.Reception

  async function handleLeaveClick (): Promise<void> {
    await leaveRoom($myInfo, $myOffice)
  }

  async function handleEndMeetingClick (): Promise<void> {
    const room = $currentRoom
    if (room !== undefined && isOffice(room) && $myInfo !== undefined) {
      await endMeeting(room, $rooms, $infos, $myInfo)
    }
  }

  function formatElapsedTime (elapsed: number): string {
    const seconds = Math.floor(elapsed / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    const displaySeconds = (seconds % 60).toString().padStart(2, '0')
    const displayMinutes = (minutes % 60).toString().padStart(2, '0')

    return hours > 0 ? `${hours}:${displayMinutes}:${displaySeconds}` : `${displayMinutes}:${displaySeconds}`
  }

  let now = Date.now()

  onMount(() => {
    const interval = setInterval(() => {
      now = Date.now()
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  })
</script>

{#if $isCurrentInstanceConnected && $currentRoom != null}
  {@const participants = $infos.filter((p) => p.room === $currentRoom._id)}
  {@const overLimit = participants.length > limit}

  <div class="p-2 pb-1">
    <div class="flex-between items-start flex-gap-2">
      <div class="flex-col flex-grow flex-gap-1">
        <!-- subtitle -->
        {#if currentMeetingMinutes !== undefined}
          <DocNavLink object={$currentRoom}>
            <span class="font-medium-12 secondary-textColor overflow-label">{$currentRoom.name}</span>
          </DocNavLink>
        {/if}

        <div class="flex-between flex-gap-2">
          <!-- title -->
          {#if currentMeetingMinutes !== undefined}
            <DocNavLink object={$currentMeetingMinutes}>
              <span class="font-medium overflow-label">{$currentMeetingMinutes.title}</span>
            </DocNavLink>
          {:else}
            <DocNavLink object={$currentRoom}>
              <span class="font-medium overflow-label">{$currentRoom.name}</span>
            </DocNavLink>
          {/if}

          <!-- elapsed time from start -->
          {#if $currentMeetingMinutes?.createdOn !== undefined}
            {@const elapsed = now - $currentMeetingMinutes.createdOn}
            <div class="font-medium">{formatElapsedTime(elapsed)}</div>
          {/if}
        </div>

        <div class="mt-1">
          <!-- Avatars -->
          {#if overLimit}
            <div class="hulyCombineAvatars-container">
              {#each participants.slice(0, limit) as participant, i (participant._id)}
                <div
                  class="hulyCombineAvatar x-small"
                  data-over={i === limit - 1 && overLimit ? `+${participants.length - limit + 1}` : undefined}
                >
                  <Avatar
                    name={$personByIdStore.get(participant.person)?.name ?? participant.name}
                    size={'x-small'}
                    person={$personByIdStore.get(participant.person)}
                  />
                </div>
              {/each}
            </div>
          {:else}
            <div class="flex-row-center flex-gap-0-5">
              {#each participants as participant (participant._id)}
                <Avatar
                  name={$personByIdStore.get(participant.person)?.name ?? participant.name}
                  size={'x-small'}
                  person={$personByIdStore.get(participant.person)}
                />
              {/each}
            </div>
          {/if}
        </div>
      </div>
      <div class="flex-col">
        {#if allowLeave}
          <ModernButton
            icon={love.icon.LeaveRoom}
            iconSize={'small'}
            kind={'negative'}
            size={'extra-small'}
            type={'type-button-icon'}
            tooltip={{ label: love.string.LeaveRoom }}
            on:click={handleLeaveClick}
          />
        {:else if isMyOffice}
          <ModernButton
            icon={love.icon.LeaveRoom}
            iconSize={'small'}
            kind={'negative'}
            size={'extra-small'}
            type={'type-button-icon'}
            tooltip={{ label: love.string.EndMeeting }}
            on:click={handleEndMeetingClick}
          />
        {/if}
      </div>
    </div>
  </div>

  <div class="ap-menuItem separator halfMargin" />
{/if}
