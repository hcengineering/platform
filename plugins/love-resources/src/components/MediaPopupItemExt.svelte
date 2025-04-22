<script lang="ts">
  import { Avatar, personByIdStore } from '@hcengineering/contact-resources'
  import { isOffice } from '@hcengineering/love'
  import { ModernButton } from '@hcengineering/ui'
  import love from '../plugin'
  import { currentRoom, infos, myInfo, myOffice, rooms, currentMeetingMinutes } from '../stores'
  import { endMeeting, isCurrentInstanceConnected, leaveRoom } from '../utils'

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
</script>

{#if $isCurrentInstanceConnected && $currentRoom != null}
  {@const participants = $infos.filter((p) => p.room === $currentRoom._id)}
  {@const overLimit = participants.length > limit}
  {@const title = $currentMeetingMinutes?.title ?? $currentRoom.name}
  {@const subtitle = $currentMeetingMinutes !== undefined ? $currentRoom.name : undefined}

  <div class="p-2 pb-1">
    <div class="flex-between items-start flex-gap-2">
      <div class="flex-col flex-grow flex-gap-1">
        {#if subtitle}
          <div class="font-medium-12 secondary-textColor overflow-label">{subtitle}</div>
        {/if}

        <div class="font-medium-14 overflow-label">{title}</div>

        <div class="mt-1">
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
