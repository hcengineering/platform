<script lang="ts">
  import { DocNavLink } from '@hcengineering/view-resources'
  import { onMount } from 'svelte'
  import { MeetingMinutes } from '@hcengineering/love'

  export let meetingMinutes: MeetingMinutes | undefined

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

{#if meetingMinutes !== undefined}
  <div class="flex-between flex-gap-2">
    <DocNavLink object={meetingMinutes}>
      <span class="font-medium secondary-textColor overflow-label">{meetingMinutes?.title}</span>
    </DocNavLink>

    <!-- elapsed time from start -->
    {#if meetingMinutes?.createdOn !== undefined}
      {@const elapsed = now - meetingMinutes.createdOn}
      <div class="font-medium-12 secondary-textColor">{formatElapsedTime(elapsed)}</div>
    {/if}
  </div>
{/if}
