<script lang="ts">
  import { Avatar, personByIdStore } from '@hcengineering/contact-resources'
  import { isOffice } from '@hcengineering/love'
  import { Button } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { DocNavLink } from '@hcengineering/view-resources'
  import { createEventDispatcher, onMount } from 'svelte'
  import love from '../plugin'
  import { currentRoom, infos, myInfo, myOffice, rooms, currentMeetingMinutes } from '../stores'
  import { endMeeting, isCurrentInstanceConnected, leaveRoom } from '../utils'

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

  <div class="m-1 p-2">
    <div class="flex-col flex-grow flex-gap-0-5">
      <!-- subtitle -->
      {#if $currentMeetingMinutes !== undefined}
        <div class="flex-between flex-gap-2">
          <DocNavLink object={$currentRoom}>
            <span class="font-medium-12 secondary-textColor overflow-label">{$currentRoom.name}</span>
          </DocNavLink>

          <!-- elapsed time from start -->
          {#if $currentMeetingMinutes?.createdOn !== undefined}
            {@const elapsed = now - $currentMeetingMinutes.createdOn}
            <div class="font-medium-12 secondary-textColor">{formatElapsedTime(elapsed)}</div>
          {/if}
        </div>
      {/if}

      <div class="flex-between flex-gap-2">
        <!-- title -->
        {#if $currentMeetingMinutes !== undefined}
          <DocNavLink object={$currentMeetingMinutes}>
            <span class="font-medium overflow-label">{$currentMeetingMinutes.title}</span>
          </DocNavLink>
        {:else}
          <DocNavLink object={$currentRoom}>
            <span class="font-medium overflow-label">{$currentRoom.name}</span>
          </DocNavLink>
        {/if}
      </div>

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

        <!-- Leave Button -->
        {#if allowLeave || leaving}
          <Button
            icon={love.icon.LeaveRoom}
            kind={'dangerous'}
            size={'x-small'}
            label={view.string.Leave}
            showTooltip={{ label: love.string.LeaveRoom }}
            padding={'0 .5rem'}
            on:click={handleLeaveClick}
          />
        {:else if isMyOffice || ending}
          <Button
            icon={love.icon.LeaveRoom}
            kind={'dangerous'}
            size={'x-small'}
            label={love.string.EndMeeting}
            showTooltip={{ label: love.string.EndMeeting }}
            padding={'0 .5rem'}
            on:click={handleEndMeetingClick}
          />
        {/if}
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
