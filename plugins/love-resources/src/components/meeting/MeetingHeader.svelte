<script lang="ts">
  import { DocNavLink } from '@hcengineering/view-resources'
  import love, { MeetingMinutes, MeetingStatus, Room } from '@hcengineering/love'
  import { onMount } from 'svelte'
  import { getClient } from '@hcengineering/presentation'
  import { SortingOrder } from '@hcengineering/core'

  export let room: Room

  const client = getClient()
  let currentMeetingMinutes: MeetingMinutes | undefined

  $: void client
    .findOne(
      love.class.MeetingMinutes,
      { attachedTo: room._id, status: MeetingStatus.Active },
      { sort: { createdOn: SortingOrder.Descending } }
    )
    .then((res) => {
      currentMeetingMinutes = res
    })

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

{#if currentMeetingMinutes !== undefined}
  <div class="flex-between flex-gap-2">
    <DocNavLink object={room}>
      <span class="font-medium-12 secondary-textColor overflow-label">{room.name}</span>
    </DocNavLink>

    <!-- elapsed time from start -->
    {#if currentMeetingMinutes?.createdOn !== undefined}
      {@const elapsed = now - currentMeetingMinutes.createdOn}
      <div class="font-medium-12 secondary-textColor">{formatElapsedTime(elapsed)}</div>
    {/if}
  </div>
{/if}

<div class="flex-between flex-gap-2">
  <!-- title -->
  {#if currentMeetingMinutes !== undefined}
    <DocNavLink object={currentMeetingMinutes}>
      <span class="font-medium overflow-label">{currentMeetingMinutes.title}</span>
    </DocNavLink>
  {:else}
    <DocNavLink object={room}>
      <span class="font-medium overflow-label">{room.name}</span>
    </DocNavLink>
  {/if}
</div>
